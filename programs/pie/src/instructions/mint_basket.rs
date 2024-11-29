use anchor_lang::prelude::*;
use anchor_spl::{
    token::{mint_to, MintTo, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{constant::USER, error::PieError, Config, UserFund, BasketConfig};

#[derive(Accounts)]
pub struct MintIndexFund<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub config: Box<Account<'info, Config>>,

    #[account(mut)]
    pub index_fund_config: Box<Account<'info, BasketConfig>>,

    #[account(
        mut,
        seeds = [USER, &user.key().as_ref(), &index_fund_config.id.to_le_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(mut)]
    pub index_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = index_mint,
        token::authority = user,
    )]
    pub user_index_token: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn mint_index_fund(ctx: Context<MintIndexFund>) -> Result<()> {
    let user_fund = &mut ctx.accounts.user_fund;
    let index_fund_config = &ctx.accounts.index_fund_config;

    let mut mint_amount = u64::MAX;
    let mut can_mint = true;

    for token_config in index_fund_config.underly_assets.iter() {
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

    require!(can_mint, PieError::InsufficientBalance);
    require!(mint_amount > 0, PieError::InvalidAmount);

    for token_config in index_fund_config.underly_assets.iter() {
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

    let config_seeds = &[b"config".as_ref(), &[ctx.accounts.config.bump]];
    let signer = &[&config_seeds[..]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.index_mint.to_account_info(),
        to: ctx.accounts.user_index_token.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    mint_to(cpi_ctx, mint_amount)?;

    Ok(())
}
