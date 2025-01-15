use anchor_lang::prelude::*;
use anchor_spl::{
    token::{mint_to, MintTo, Token, TokenAccount},
    token_interface::Mint,
};

use crate::{
    constant::USER_FUND, error::PieError, utils::Calculator, BasketConfig, UserFund, BASKET_CONFIG, BASKET_MINT
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
        bump = user_fund.bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,
    #[account(
        mut,
        seeds = [BASKET_MINT, &basket_config.id.to_be_bytes()],
        bump  
    )]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::authority = user,
        token::mint = basket_config.mint
    )]
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

pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>, basket_token_amount: u64) -> Result<()> {


    let user_fund = &mut ctx.accounts.user_fund;
    let basket_config = &mut ctx.accounts.basket_config;

    require!(!basket_config.is_rebalancing, PieError::RebalancingInProgress);

    let mut amount_can_mint = u64::MAX;

    for token_config in basket_config.components.iter() {
        if let Some(user_asset) = user_fund
            .components
            .iter()
            .find(|a| a.mint == token_config.mint)
        {
            let possible_mint_amount = calculate_possible_mint_amount(user_asset.amount, token_config.quantity_in_sys_decimal).unwrap();
            amount_can_mint = amount_can_mint.min(possible_mint_amount.try_into().unwrap());
        } else {
            return Err(PieError::ComponentNotFound.into());
        }
    }

    require!(amount_can_mint >= basket_token_amount, PieError::InvalidAmount);

    for token_config in basket_config.components.iter() {
        if let Some(asset) = user_fund
            .components
            .iter_mut()
            .find(|a| a.mint == token_config.mint)
        {
            let amount_to_deduct_in_raw_decimal = calculate_deduct_amount(basket_token_amount.into(), token_config.quantity_in_sys_decimal)?;

            asset.amount = asset
                .amount
                .checked_sub(amount_to_deduct_in_raw_decimal)
                .ok_or(PieError::InsufficientBalance)?;
        }
    }
    // Remove components with zero amount
    user_fund.components.retain(|component| component.amount > 0);
    // Close user fund if it is empty
    user_fund.close_if_empty(user_fund.to_account_info(), ctx.accounts.user.to_account_info())?;

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
    mint_to(cpi_ctx, basket_token_amount)?;

    emit!(MintBasketTokenEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount: basket_token_amount,
    });

    Ok(())
}

fn calculate_deduct_amount(basket_token_amount: u128, quantity_in_sys_decimal: u128) -> Result<u64> {
    let amount_to_deduct = quantity_in_sys_decimal
        .checked_mul(basket_token_amount).unwrap();
    Ok(Calculator::restore_raw_decimal_round_up(amount_to_deduct))
}

fn calculate_possible_mint_amount(user_asset_amount: u64, quantity_in_sys_decimal: u128) -> Result<u128> {
    let user_amount_in_system_decimal = Calculator::apply_sys_decimal(user_asset_amount);

    Ok(user_amount_in_system_decimal.checked_div(quantity_in_sys_decimal).unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_deduct_amount() {
        assert_eq!(calculate_deduct_amount(1_000_000_000u128, 1_000u128).unwrap(), 1_000_000u64);
    }
}

