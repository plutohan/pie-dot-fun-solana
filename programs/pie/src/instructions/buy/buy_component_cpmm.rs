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
    constant::USER_FUND, error::PieError, utils::{calculate_amounts_swapped_and_received, calculate_fee_amount, transfer_fees}, BasketConfig, BuyComponentEvent, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT, PROGRAM_STATE
};

#[derive(Accounts)]
pub struct BuyComponentCpmm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
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
        seeds = [PROGRAM_STATE], 
        bump = program_state.bump
    )]
    pub program_state: Box<Account<'info, ProgramState>>,
    #[account(        
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump    
    )]    
    pub basket_config: Box<Account<'info, BasketConfig>>,

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
        address = user_token_source.mint
    )]
    pub user_token_source_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub user_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = vault_token_destination.mint
    )]
    pub vault_token_destination_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_destination_mint,
        associated_token::token_program = output_token_program
    )]
    pub vault_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for input token
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for output token
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL program for input token transfers: Token Program
    #[account(address = token::ID)]
    pub input_token_program: Interface<'info, TokenInterface>,

    /// SPL program for output token transfers: Token or Token 2022 Program
    pub output_token_program: Interface<'info, TokenInterface>,

    /// The program account for the most recent oracle observation
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    pub cp_swap_program: Program<'info, RaydiumCpmm>,

    pub system_program: Program<'info, System>,
}

pub fn buy_component_cpmm(
    ctx: Context<BuyComponentCpmm>,
    max_amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    require!(max_amount_in > 0, PieError::InvalidAmount);
    require!(!ctx.accounts.basket_config.is_rebalancing, PieError::RebalancingInProgress);
    require!(
        ctx.accounts.basket_config.components
            .iter()
            .any(|c| c.mint == ctx.accounts.vault_token_destination_mint.key()),
        PieError::InvalidComponent
    );

    let user_fund = &mut ctx.accounts.user_fund;
    let balance_in_before = ctx.accounts.user_token_source.amount;
    let balance_out_before = ctx.accounts.vault_token_destination.amount;
    let cpi_accounts = cpi::accounts::Swap {
        payer: ctx.accounts.user.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.user_token_source.to_account_info(),
        output_token_account: ctx.accounts.vault_token_destination.to_account_info(),
        input_vault: ctx.accounts.input_vault.to_account_info(),
        output_vault: ctx.accounts.output_vault.to_account_info(),
        input_token_program: ctx.accounts.input_token_program.to_account_info(),
        output_token_program: ctx.accounts.output_token_program.to_account_info(),
        input_token_mint: ctx.accounts.user_token_source_mint.to_account_info(),
        output_token_mint: ctx.accounts.vault_token_destination_mint.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
    };

    let cpi_context = CpiContext::new(ctx.accounts.cp_swap_program.to_account_info(), cpi_accounts);

    cpi::swap_base_output(cpi_context, max_amount_in, amount_out)?;

    ctx.accounts.user_token_source.reload()?;
    ctx.accounts.vault_token_destination.reload()?;

    let (amount_swapped, amount_received) = calculate_amounts_swapped_and_received(
        &ctx.accounts.user_token_source,
        &ctx.accounts.vault_token_destination,
        balance_in_before,
        balance_out_before,
    )?;

    let (platform_fee_amount, creator_fee_amount) =
        calculate_fee_amount(&ctx.accounts.program_state, amount_swapped)?;

    //transfer fees for creator and platform fee
    transfer_fees(
        &ctx.accounts.user_token_source.to_account_info(),
        &ctx.accounts.platform_fee_token_account.to_account_info(),
        &ctx.accounts.creator_token_account.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        &ctx.accounts.input_token_program.to_account_info(),
        platform_fee_amount,
        creator_fee_amount,
    )?;

    user_fund.bump = ctx.bumps.user_fund;
    user_fund
        .upsert_component(ctx.accounts.vault_token_destination_mint.key(), amount_received)?;

    emit!(BuyComponentEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.vault_token_destination_mint.key(),
        amount: amount_received,
    });

    Ok(())
}
