use anchor_lang::prelude::*;
use anchor_spl::{
    token::{mint_to, MintTo, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{constant::USER, error::PieError, ProgramState, UserFund, BasketConfig};

#[derive(Accounts)]
pub struct MintBasketTokenContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(mut)]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(
        mut,
        seeds = [USER, &user.key().as_ref(), &basket_config.id.to_le_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(mut)]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = basket_mint,
        token::authority = user,
    )]
    pub user_basket_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct MintBasketTokenEvent {
    pub user: Pubkey,
    pub basket_mint: Pubkey,
    pub amount: u64,
}

pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>) -> Result<()> {
    let user_fund = &mut ctx.accounts.user_fund;
    let basket_config = &ctx.accounts.basket_config;

    let mut mint_amount = u64::MAX;
    let mut can_mint = true;

    for token_config in basket_config.components.iter() {
        if let Some(user_asset) = user_fund
            .components
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

    for token_config in basket_config.components.iter() {
        if let Some(asset) = user_fund
            .components
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

    let config_seeds = &[b"program_state".as_ref(), &[ctx.accounts.program_state.bump]];
    let signer = &[&config_seeds[..]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.basket_mint.to_account_info(),
        to: ctx.accounts.user_basket_token_account.to_account_info(),
        authority: ctx.accounts.program_state.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    mint_to(cpi_ctx, mint_amount)?;

    emit!(MintBasketTokenEvent {
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount: mint_amount,
    });

    Ok(())
}
