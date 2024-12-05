use anchor_lang::prelude::*;
use anchor_spl::{
    token::{burn, Burn, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{constant::USER_FUND, error::PieError, BasketConfig, ProgramState, UserFund};

#[derive(Accounts)]
pub struct RedeemBasketTokenContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(
        mut,
        constraint = basket_config.mint == basket_mint.key() @PieError::InvalidBasket
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(
        mut,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_le_bytes()],
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
pub struct RedeemBasketTokenEvent {
    pub user: Pubkey,
    pub basket_mint: Pubkey,
    pub amount: u64,
}

pub fn redeem_basket_token(ctx: Context<RedeemBasketTokenContext>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, PieError::InvalidAmount);
    let user_fund = &mut ctx.accounts.user_fund;
    let basket_config = &mut ctx.accounts.basket_config;

    // Validate that the user has enough tokens to burn
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

    for token_config in basket_config.components.iter() {
        if let Some(asset) = user_fund
            .components
            .iter_mut()
            .find(|a| a.mint == token_config.mint)
        {
            let amount_return = amount.checked_mul(token_config.ratio as u64).unwrap();
            asset.amount = asset.amount.checked_add(amount_return).unwrap();
        }
    }

    emit!(RedeemBasketTokenEvent {
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount,
    });

    Ok(())
}
