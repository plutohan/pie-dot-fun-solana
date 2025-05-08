use anchor_lang::prelude::*;
use anchor_spl::{token::Token, token_interface::TokenAccount};

use crate::{
    constant::USER_FUND,
    error::PieError,
    utils::{calculate_fee_amount, transfer_fees, transfer_from_pool_vault_to_user},
    BasketConfig, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT, PROGRAM_STATE,
};

#[derive(Accounts)]
pub struct WithdrawWsolContext<'info> {
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
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump    
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(
        mut,
        token::mint = NATIVE_MINT,
        token::authority = user
    )]
    pub user_wsol_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = NATIVE_MINT,
        associated_token::authority = basket_config
    )]
    pub vault_wsol_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::authority = program_state.platform_fee_wallet,
        token::mint = NATIVE_MINT,
    )]
    pub platform_fee_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        token::authority = basket_config.creator,
        token::mint = NATIVE_MINT,
    )]
    pub creator_fee_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct WithdrawWsolEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub creator_fee: u64,
    pub platform_fee: u64,
}

pub fn withdraw_wsol(ctx: Context<WithdrawWsolContext>) -> Result<()> {
    require!(
        !ctx.accounts.basket_config.is_rebalancing,
        PieError::RebalancingInProgress
    );
    let user_fund = &mut ctx.accounts.user_fund;

    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == NATIVE_MINT)
        .ok_or(PieError::ComponentNotFound)?;

    let amount_before_fee = component.amount;

    let (platform_fee_amount, creator_fee_amount) = calculate_fee_amount(
        ctx.accounts.program_state.platform_fee_bp,
        ctx.accounts.basket_config.creator_fee_bp,
        amount_before_fee,
    )?;

    //transfer fees for creator and platform fee
    transfer_fees(
        &ctx.accounts.user_wsol_account.to_account_info(),
        &ctx.accounts.platform_fee_token_account.to_account_info(),
        &ctx.accounts.creator_fee_token_account.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        platform_fee_amount,
        creator_fee_amount,
    )?;

    ctx.accounts.user_wsol_account.reload()?;

    let amount_after_fee = ctx.accounts.user_wsol_account.amount;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    transfer_from_pool_vault_to_user(
        &ctx.accounts.vault_wsol_account.to_account_info(),
        &ctx.accounts.user_wsol_account.to_account_info(),
        &ctx.accounts.basket_config.to_account_info(),
        &ctx.accounts.token_program,
        amount_after_fee,
        signer,
    )?;

    // Update user's component balance
    user_fund.remove_component(NATIVE_MINT, amount_before_fee)?;

    // Close user fund if it is empty
    user_fund.close_if_empty(
        user_fund.to_account_info(),
        ctx.accounts.user.to_account_info(),
    )?;

    emit!(WithdrawWsolEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_config.mint,
        user: ctx.accounts.user.key(),
        amount: amount_after_fee,
        creator_fee: creator_fee_amount,
        platform_fee: platform_fee_amount,
    });

    Ok(())
}
