use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::{
    constant::USER_FUND,
    error::PieError,
    utils::{calculate_fee_amount, transfer_fees},
    BasketConfig, ProgramState, SellComponentEvent, UserFund, BASKET_CONFIG, NATIVE_MINT,
};

#[derive(Accounts)]
pub struct SellComponentCpmm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
        bump = user_fund.bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(
        mut,
        constraint = basket_config.mint == basket_mint.key() @PieError::InvalidBasketMint
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(mut)]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

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
    pub creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: pool vault and lp mint authority
    #[account(mut)]
    pub authority: UncheckedAccount<'info>,

    /// The factory state to read protocol fees
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// The program account of the pool in which the swap will be performed
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    #[account(
        address = vault_token_source.mint
    )]
    pub vault_token_source_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_source_mint,
        associated_token::token_program = input_token_program
    )]
    pub vault_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = user_token_destination.mint
    )]
    pub user_token_destination_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The user token account for input token
    #[account(mut)]
    pub user_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for input token
    #[account(
    mut,
    constraint = input_vault.key() == pool_state.load()?.token_0_vault || input_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for output token
    #[account(
    mut,
    constraint = output_vault.key() == pool_state.load()?.token_0_vault || output_vault.key() == pool_state.load()?.token_1_vault
    )]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL program for input token transfers: Token 2022 or Token
    pub input_token_program: Interface<'info, TokenInterface>,

    /// SPL program for output token transfers: Token
    #[account(address = token::ID)]
    pub output_token_program: Interface<'info, TokenInterface>,

    /// The program account for the most recent oracle observation
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    pub cp_swap_program: Program<'info, RaydiumCpmm>,

    pub system_program: Program<'info, System>,
}

pub fn sell_component_cpmm(
    ctx: Context<SellComponentCpmm>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    require!(amount_in > 0, PieError::InvalidAmount);
    require!(
        !ctx.accounts.basket_config.is_rebalancing,
        PieError::RebalancingInProgress
    );

    let user_fund = &mut ctx.accounts.user_fund;
    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.vault_token_source_mint.key())
        .ok_or(PieError::ComponentNotFound)?;

    require!(component.amount >= amount_in, PieError::InsufficientBalance);

    let balance_before = ctx.accounts.user_token_destination.amount;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];
    let cpi_accounts = cpi::accounts::Swap {
        payer: ctx.accounts.basket_config.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.vault_token_source.to_account_info(),
        output_token_account: ctx.accounts.user_token_destination.to_account_info(),
        input_vault: ctx.accounts.input_vault.to_account_info(),
        output_vault: ctx.accounts.output_vault.to_account_info(),
        input_token_program: ctx.accounts.input_token_program.to_account_info(),
        output_token_program: ctx.accounts.output_token_program.to_account_info(),
        input_token_mint: ctx.accounts.vault_token_source_mint.to_account_info(),
        output_token_mint: ctx.accounts.user_token_destination_mint.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.cp_swap_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    cpi::swap_base_input(cpi_context, amount_in, minimum_amount_out)?;

    ctx.accounts.user_token_destination.reload()?;

    let balance_after = ctx.accounts.user_token_destination.amount;

    let amount_received: u64 = balance_after.checked_sub(balance_before).unwrap();

    let (platform_fee_amount, creator_fee_amount) =
        calculate_fee_amount(&ctx.accounts.program_state, amount_received)?;

    //transfer fees for creator and platform fee
    transfer_fees(
        &ctx.accounts.user_token_destination.to_account_info(),
        &ctx.accounts.platform_fee_token_account.to_account_info(),
        &ctx.accounts.creator_token_account.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        &&ctx.accounts.output_token_program.to_account_info(),
        platform_fee_amount,
        creator_fee_amount,
    )?;

    // Update user's component balance
    component.amount = component.amount.checked_sub(amount_in).unwrap();
    // Remove components with zero amount
    user_fund
        .components
        .retain(|component| component.amount > 0);
    // Close user fund if it is empty
    user_fund.close_if_empty(
        user_fund.to_account_info(),
        ctx.accounts.user.to_account_info(),
    )?;

    emit!(SellComponentEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.vault_token_source_mint.key(),
        amount: amount_in,
    });

    Ok(())
}
