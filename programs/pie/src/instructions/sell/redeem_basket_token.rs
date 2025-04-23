use anchor_lang::prelude::*;
use anchor_spl::{
    token::{burn, Burn, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{
    constant::USER_FUND, error::PieError, utils::Calculator, BasketConfig, ProgramState, UserFund,
    PROGRAM_STATE,
};

#[derive(Accounts)]
pub struct RedeemBasketTokenContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(
        mut,
        constraint = basket_config.mint == basket_mint.key() @PieError::InvalidBasket
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserFund::INIT_SPACE,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
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
    pub basket_id: u64,
    pub user: Pubkey,
    pub basket_mint: Pubkey,
    pub amount: u64,
}

pub fn redeem_basket_token(ctx: Context<RedeemBasketTokenContext>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, PieError::InvalidAmount);
    let user_fund = &mut ctx.accounts.user_fund;
    user_fund.bump = ctx.bumps.user_fund;
    let basket_config = &mut ctx.accounts.basket_config;
    require!(
        !basket_config.is_rebalancing,
        PieError::RebalancingInProgress
    );

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
        let amount_return: u128 = token_config
            .quantity_in_sys_decimal
            .checked_mul(amount.into())
            .unwrap();

        user_fund.upsert_component(
            token_config.mint,
            Calculator::restore_raw_decimal(amount_return),
        )?;
    }

    emit!(RedeemBasketTokenEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount,
    });

    Ok(())
}
