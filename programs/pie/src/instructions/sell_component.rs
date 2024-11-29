use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Token, TokenAccount},
    token_interface::Mint,
};

use raydium_amm_cpi::*;

use crate::{constant::USER, error::PieError, BasketConfig, ProgramState, UserFund};

#[derive(Accounts)]
pub struct SellComponentContext<'info> {
    #[account(mut)]
    pub user_source_owner: Signer<'info>,

    #[account(
        mut,
        seeds = [USER, &user_source_owner.key().as_ref(), &basket_config.key().as_ref()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(mut)]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(mut)]
    pub mint_in: Box<InterfaceAccount<'info, Mint>>,

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

    #[account(mut)]
    pub user_token_destination: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    /// CHECK: Safe. amm_program
    pub amm_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn sell_component(
    ctx: Context<SellComponentContext>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    // Verify amount is not zero
    require!(amount_in > 0, PieError::InvalidAmount);

    // Verify user has enough tokens in their fund
    let user_fund = &mut ctx.accounts.user_fund;
    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.mint_in.key())
        .ok_or(PieError::ComponentNotFound)?;

    require!(component.amount >= amount_in, PieError::InsufficientBalance);

    // Perform the swap
    let cpi_accounts = SwapBaseIn {
        amm: ctx.accounts.amm.to_account_info(),
        amm_authority: ctx.accounts.amm_authority.to_account_info(),
        amm_open_orders: ctx.accounts.amm_open_orders.to_account_info(),
        amm_coin_vault: ctx.accounts.amm_coin_vault.to_account_info(),
        amm_pc_vault: ctx.accounts.amm_pc_vault.to_account_info(),
        market_program: ctx.accounts.market_program.to_account_info(),
        market: ctx.accounts.market.to_account_info(),
        market_bids: ctx.accounts.market_bids.to_account_info(),
        market_asks: ctx.accounts.market_asks.to_account_info(),
        market_event_queue: ctx.accounts.market_event_queue.to_account_info(),
        market_coin_vault: ctx.accounts.market_coin_vault.to_account_info(),
        market_pc_vault: ctx.accounts.market_pc_vault.to_account_info(),
        market_vault_signer: ctx.accounts.market_vault_signer.to_account_info(),
        user_token_source: ctx.accounts.vault_token_account.to_account_info(),
        user_token_destination: ctx.accounts.user_token_destination.to_account_info(),
        user_source_owner: ctx.accounts.user_source_owner.clone(),
        token_program: ctx.accounts.token_program.clone(),
    };

    let cpi_context = CpiContext::new(ctx.accounts.amm_program.to_account_info(), cpi_accounts);
    raydium_amm_cpi::instructions::swap_base_in(cpi_context, amount_in, minimum_amount_out)?;

    // Update user's component balance
    component.amount = component.amount.checked_sub(amount_in).unwrap();

    // Remove component if balance is zero
    if component.amount == 0 {
        user_fund
            .components
            .retain(|c| c.mint != ctx.accounts.mint_in.key());
    }

    Ok(())
}
