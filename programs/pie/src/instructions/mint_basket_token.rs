use anchor_lang::prelude::*;
use anchor_spl::{
    token::{mint_to, MintTo, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{
    constant::USER_FUND, error::PieError, utils::Calculator, BasketConfig, UserFund, BASKET_CONFIG, BASKET_MINT, SYS_DECIMALS
};

#[derive(Accounts)]
pub struct MintBasketTokenContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump    
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(
        mut,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,
    #[account(
        mut,
        seeds = [BASKET_MINT, &basket_config.id.to_be_bytes()],
        bump  
    )]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub user_basket_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct MintBasketTokenEvent {
    pub basket_id: u64,
    pub user: Pubkey,
    pub basket_mint: Pubkey,
    pub amount: u64,
}

pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>, amount: u64) -> Result<()> {
    let user_fund = &mut ctx.accounts.user_fund;
    let basket_config = &mut ctx.accounts.basket_config;

    let mut amount_can_mint = u64::MAX;

    for token_config in basket_config.components.iter() {
        if let Some(user_asset) = user_fund
            .components
            .iter()
            .find(|a| a.mint == token_config.mint)
        {
            let user_amount_normalized = Calculator::to_u64(Calculator::normalize_decimal_v2(
                user_asset.amount,
                token_config.decimals.try_into().unwrap(),
                SYS_DECIMALS.try_into().unwrap(),
            )).unwrap();
            let possible_mint = user_amount_normalized
                .checked_mul(SYS_DECIMALS).unwrap()
                .checked_div(token_config.quantity)
                .unwrap();
            amount_can_mint = amount_can_mint.min(possible_mint);
        }
    }

    require!(amount_can_mint >= amount, PieError::InvalidAmount);

    for token_config in basket_config.components.iter() {
        if let Some(asset) = user_fund
            .components
            .iter_mut()
            .find(|a| a.mint == token_config.mint)
        {
            let mut amount_to_deduct = token_config.quantity
                .checked_mul(amount).unwrap()
                .checked_div(SYS_DECIMALS)
                .unwrap();
            
            amount_to_deduct = Calculator::to_u64(Calculator::restore_decimal(
                amount_to_deduct.try_into().unwrap(),
                token_config.decimals.try_into().unwrap(),
                SYS_DECIMALS,
            )).unwrap();

            asset.amount = asset
                .amount
                .checked_sub(amount_to_deduct)
                .ok_or(PieError::InsufficientBalance)?;
        }
    }

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.basket_mint.to_account_info(),
        to: ctx.accounts.user_basket_token_account.to_account_info(),
        authority: ctx.accounts.basket_config.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    mint_to(cpi_ctx, amount)?;

    emit!(MintBasketTokenEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount,
    });

    Ok(())
}
