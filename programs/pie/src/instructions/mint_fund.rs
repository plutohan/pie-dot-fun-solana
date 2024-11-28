use std::ops::DerefMut;

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{mint_to, MintTo, Token, TokenAccount},
    token_interface::Mint,
};

use raydium_amm_cpi::*;

use crate::{constant::MAX_ASSETS, error::PieError, Config, PoolConfig, TokenConfig, UserFund};

#[derive(Accounts)]
pub struct MintFund<'info> {
    #[account(mut)]
    pub user_source_owner: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user_source_owner,
        space = UserFund::INIT_SPACE,
        seeds = [b"user".as_ref(), &user_source_owner.key().as_ref(), &pool_config.pool_id.to_le_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,
    #[account(mut)]
    pub config: Box<Account<'info, Config>>,
    #[account(mut)]
    pub pool_config: Box<Account<'info, PoolConfig>>,
    #[account(mut)]
    pub mint_out: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: Safe. amm Account
    #[account(mut)]
    pub amm: AccountInfo<'info>,
    /// CHECK: Safe. Amm authority Account
    pub amm_authority: AccountInfo<'info>,
    /// CHECK: Safe. amm open_orders Account
    #[account(mut)]
    pub amm_open_orders: AccountInfo<'info>,
    /// CHECK: Safe. amm_coin_vault Account
    #[account(mut)]
    pub amm_coin_vault: AccountInfo<'info>,
    /// CHECK: Safe. amm_pc_vault Account
    #[account(mut)]
    pub amm_pc_vault: AccountInfo<'info>,
    /// CHECK: Safe. OpenBook program id
    pub market_program: AccountInfo<'info>,
    /// CHECK: Safe. OpenBook market Account
    #[account(mut)]
    pub market: AccountInfo<'info>,
    /// CHECK: Safe. bids Account
    #[account(mut)]
    pub market_bids: AccountInfo<'info>,
    /// CHECK: Safe. asks Account
    #[account(mut)]
    pub market_asks: AccountInfo<'info>,
    /// CHECK: Safe. event_q Account
    #[account(mut)]
    pub market_event_queue: AccountInfo<'info>,
    /// CHECK: Safe. coin_vault Account
    #[account(mut)]
    pub market_coin_vault: AccountInfo<'info>,
    /// CHECK: Safe. pc_vault Account
    #[account(mut)]
    pub market_pc_vault: AccountInfo<'info>,
    /// CHECK: Safe. vault_signer Account
    pub market_vault_signer: AccountInfo<'info>,
    /// CHECK: Safe. user source token Account
    #[account(mut)]
    pub user_token_source: AccountInfo<'info>,
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    /// CHECK: Safe. amm_program
    pub amm_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub index_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = index_mint,
        token::authority = user_source_owner,
    )]
    pub user_index_token: Box<Account<'info, TokenAccount>>,
}

pub fn mint_fund(ctx: Context<MintFund>, amount_in: u64, minimum_amount_out: u64) -> Result<()> {
    let balance_before = ctx.accounts.vault_token_account.amount;

    let user_fund = ctx.accounts.user_fund.deref_mut();

    let cpi_accounts = SwapBaseOut {
        amm: ctx.accounts.amm.clone(),
        amm_authority: ctx.accounts.amm_authority.clone(),
        amm_open_orders: ctx.accounts.amm_open_orders.clone(),
        amm_coin_vault: ctx.accounts.amm_coin_vault.clone(),
        amm_pc_vault: ctx.accounts.amm_pc_vault.clone(),
        market_program: ctx.accounts.market_program.clone(),
        market: ctx.accounts.market.clone(),
        market_bids: ctx.accounts.market_bids.clone(),
        market_asks: ctx.accounts.market_asks.clone(),
        market_event_queue: ctx.accounts.market_event_queue.clone(),
        market_coin_vault: ctx.accounts.market_coin_vault.clone(),
        market_pc_vault: ctx.accounts.market_pc_vault.clone(),
        market_vault_signer: ctx.accounts.market_vault_signer.clone(),
        user_token_source: ctx.accounts.user_token_source.clone(),
        user_token_destination: ctx.accounts.vault_token_account.to_account_info(),
        user_source_owner: ctx.accounts.user_source_owner.clone(),
        token_program: ctx.accounts.token_program.clone(),
    };

    let cpi_context = CpiContext::new(ctx.accounts.amm_program.to_account_info(), cpi_accounts);
    raydium_amm_cpi::instructions::swap_base_out(cpi_context, amount_in, minimum_amount_out)?;

    ctx.accounts.vault_token_account.reload()?;

    let balance_change = ctx
        .accounts
        .vault_token_account
        .amount
        .checked_sub(balance_before)
        .unwrap();

    if let Some(asset) = user_fund
        .asset_info
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.mint_out.key())
    {
        asset.amount = asset.amount.checked_add(balance_change).unwrap();
    } else {
        if user_fund.asset_info.len() < MAX_ASSETS.into() {
            user_fund.asset_info.push(TokenConfig {
                mint: ctx.accounts.mint_out.key(),
                amount: balance_change,
            });
        } else {
            return Err(error!(PieError::MaxAssetsExceeded));
        }
    }

    let pool = &ctx.accounts.pool_config;
    let mut can_mint = true;
    let mut mint_amount = u64::MAX;

    for token_config in pool.token_configs.iter() {
        if let Some(user_asset) = user_fund
            .asset_info
            .iter()
            .find(|a| a.mint == token_config.mint)
        {
            let possible_mint = user_asset.amount.checked_div(token_config.amount).unwrap();
            mint_amount = mint_amount.min(possible_mint);
        } else {
            can_mint = false;
            break;
        }
    }

    if can_mint && mint_amount > 0 {
        for token_config in pool.token_configs.iter() {
            if let Some(asset) = user_fund
                .asset_info
                .iter_mut()
                .find(|a| a.mint == token_config.mint)
            {
                let amount_to_deduct = token_config.amount.checked_mul(mint_amount).unwrap();
                asset.amount = asset
                    .amount
                    .checked_sub(amount_to_deduct)
                    .ok_or(PieError::InsufficientBalance)?;
            }
        }

        let vault_seeds = &[b"config".as_ref(), &[ctx.accounts.config.bump]];
        let signer = &[&vault_seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.index_mint.to_account_info(),
            to: ctx.accounts.user_index_token.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        mint_to(cpi_ctx, mint_amount)?;
    }

    Ok(())
}
