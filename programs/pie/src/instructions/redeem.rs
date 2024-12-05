use anchor_lang::prelude::*;
use anchor_spl::{
    token::{burn, Burn, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{
    constant::{MAX_COMPONENTS, USER},
    error::PieError,
    BasketConfig, Component, ProgramState, UserFund, BASKET_CONFIG,
};

#[derive(Accounts)]
pub struct RedeemContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(
        mut,
        seeds = [BASKET_CONFIG, basket_mint.key().as_ref()],
        bump
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(
        mut,
        seeds = [USER, &user.key().as_ref(), &basket_config.id.to_le_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(
        mut,
        constraint = basket_mint.key() == basket_config.mint
    )]
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
pub struct RedeemEvent {
    pub user: Pubkey,
    pub basket_mint: Pubkey,
    pub amount: u64,
}

pub fn redeem(ctx: Context<RedeemContext>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, PieError::InvalidAmount);
    require!(
        ctx.accounts.user_basket_token_account.amount >= amount,
        PieError::InsufficientBalance
    );

    // Burn the basket tokens
    let burn_basket_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.basket_mint.to_account_info(),
            from: ctx.accounts.user_basket_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    burn(burn_basket_ctx, amount)?;

    // Credit underlying tokens back to user's fund
    let user_fund = &mut ctx.accounts.user_fund;

    for token_config in ctx.accounts.basket_config.components.iter() {
        let return_amount = token_config.amount.checked_mul(amount).unwrap();

        if let Some(asset) = user_fund
            .components
            .iter_mut()
            .find(|a| a.mint == token_config.mint)
        {
            // Update existing asset amount
            asset.amount = asset.amount.checked_add(return_amount).unwrap();
        } else {
            // Add new asset if it doesn't exist
            require!(
                user_fund.components.len() < MAX_COMPONENTS as usize,
                PieError::MaxAssetsExceeded
            );

            user_fund.components.push(Component {
                mint: token_config.mint,
                amount: return_amount,
            });
        }
    }

    emit!(RedeemEvent {
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount,
    });

    Ok(())
}
