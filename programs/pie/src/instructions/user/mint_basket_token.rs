use anchor_lang::prelude::*;
use anchor_spl::{ token::{ mint_to, MintTo, Token, TokenAccount }, token_interface::Mint };

use crate::{
    constant::{ USER_BALANCE, USER_FUND },
    error::PieError,
    states::{BasketState, UserBalance},
    utils::Calculator,
    BasketConfig,
    UserFund,
    BASKET_CONFIG,
    BASKET_MINT,
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
        seeds = [USER_BALANCE, &user.key().as_ref()],
        bump = user_balance.bump,
    )]
    pub user_balance: Box<Account<'info, UserBalance>>,

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

pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>) -> Result<()> {
    let user_fund = &mut ctx.accounts.user_fund;
    let basket_config = &mut ctx.accounts.basket_config;
    let user_balance = &mut ctx.accounts.user_balance;

    require!(
        basket_config.state == BasketState::Active,
        PieError::OnlyDefaultState
    );

    let mut mint_amount = u64::MAX;

    for token_config in basket_config.components.iter() {
        if let Some(user_asset) = user_fund.components.iter().find(|a| a.mint == token_config.mint) {
            let possible_mint_amount = calculate_possible_mint_amount(
                user_asset.amount,
                token_config.quantity_in_sys_decimal
            ).unwrap();
            mint_amount = mint_amount.min(possible_mint_amount.try_into().unwrap());
        } else {
            return Err(PieError::ComponentNotFound.into());
        }
    }

    require!(mint_amount > 0, PieError::InvalidAmount);

    for token_config in basket_config.components.iter() {
        if let Some(asset) = user_fund.components.iter_mut().find(|a| a.mint == token_config.mint) {
            let amount_to_deduct_in_raw_decimal = calculate_deduct_amount(
                mint_amount.into(),
                token_config.quantity_in_sys_decimal
            )?;
            let amount_left = asset.amount
                .checked_sub(amount_to_deduct_in_raw_decimal)
                .ok_or(PieError::InsufficientBalance)?;

            asset.amount = 0;

            if amount_left > 0 {
                // Record the amount left in the user balance
                user_balance.upsert_balance(basket_config.id, token_config.mint, amount_left)?;
            }
        }
    }

    // Remove components with zero amount
    user_fund.components.retain(|component: &crate::states::UserComponent| component.amount > 0);

    // Reallocate user_balance
    let required_space = UserBalance::size_for_len(user_balance.balances.len());
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(required_space);
    let current_balance = user_balance.to_account_info().lamports();

    if current_balance < new_minimum_balance {
        let additional_rent = new_minimum_balance
            .checked_sub(current_balance)
            .ok_or(PieError::InvalidAmount)?;

        // Transfer additional rent using system program
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.user.key(),
                &user_balance.to_account_info().key(),
                additional_rent
            ),
            &[ctx.accounts.user.to_account_info(), user_balance.to_account_info()]
        )?;
    }

    user_balance.to_account_info().realloc(required_space, false)?;

    let signer: &[&[&[u8]]] = &[
        &[BASKET_CONFIG, &basket_config.id.to_be_bytes(), &[ctx.accounts.basket_config.bump]],
    ];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.basket_mint.to_account_info(),
        to: ctx.accounts.user_basket_token_account.to_account_info(),
        authority: ctx.accounts.basket_config.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    mint_to(cpi_ctx, mint_amount)?;


    // Close user fund if it is empty
    // @dev First you have to put the transfer function and then the try_borrow_mut_lamports() function
    user_fund.close_if_empty(user_fund.to_account_info(), ctx.accounts.user.to_account_info())?;

    emit!(MintBasketTokenEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        basket_mint: ctx.accounts.basket_mint.key(),
        amount: mint_amount,
    });

    Ok(())
}

fn calculate_deduct_amount(
    basket_token_amount: u128,
    quantity_in_sys_decimal: u128
) -> Result<u64> {
    let amount_to_deduct = quantity_in_sys_decimal.checked_mul(basket_token_amount).unwrap();
    Ok(Calculator::restore_raw_decimal_round_up(amount_to_deduct))
}

fn calculate_possible_mint_amount(
    user_asset_amount: u64,
    quantity_in_sys_decimal: u128
) -> Result<u128> {
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
