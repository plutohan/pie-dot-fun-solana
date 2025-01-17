use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::utils::Rebalance;
use crate::ExecuteRebalancingEvent;
use crate::{error::PieError, BasketConfig, BASKET_CONFIG};

#[derive(Accounts)]
pub struct ExecuteRebalancingCpmm<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,

    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump = basket_config.bump,
        constraint = basket_config.rebalancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub basket_config: Account<'info, BasketConfig>,

    #[account(
        mut,
        address = basket_config.mint
    )]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

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

    /// SPL program for input token transfers
    pub input_token_program: Interface<'info, TokenInterface>,

    /// SPL program for output token transfers
    pub output_token_program: Interface<'info, TokenInterface>,

    /// The program account for the most recent oracle observation
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,
    pub cp_swap_program: Program<'info, RaydiumCpmm>,
}

pub fn execute_rebalancing_cpmm<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<ExecuteRebalancingCpmm>,
    is_swap_base_out: bool,
    amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    require!(basket_config.is_rebalancing, PieError::NotInRebalancing);
    let basket_total_supply = ctx.accounts.basket_mint.supply;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &basket_config.id.to_be_bytes(),
        &[basket_config.bump],
    ]];

    let (
        initial_available_source_balance,
        initial_available_destination_balance,
        unminted_source_balance,
        unminted_destination_balance,
    ) = Rebalance::calculate_initial_balances(
        basket_config,
        ctx.accounts.vault_token_source.as_ref(),
        ctx.accounts.vault_token_destination.as_ref(),
        basket_total_supply,
        amount_in,
    )?;

    // Prepare CPI accounts
    let cpi_accounts = cpi::accounts::Swap {
        payer: basket_config.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.vault_token_source.to_account_info(),
        output_token_account: ctx.accounts.vault_token_destination.to_account_info(),
        input_vault: ctx.accounts.input_vault.to_account_info(),
        output_vault: ctx.accounts.output_vault.to_account_info(),
        input_token_program: ctx.accounts.input_token_program.to_account_info(),
        output_token_program: ctx.accounts.output_token_program.to_account_info(),
        input_token_mint: ctx.accounts.vault_token_source_mint.to_account_info(),
        output_token_mint: ctx.accounts.vault_token_destination_mint.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.cp_swap_program.to_account_info(),
        cpi_accounts,
        signer,
    );

    if is_swap_base_out {
        cpi::swap_base_output(cpi_context, amount_in, amount_out)?;
    } else {
        cpi::swap_base_input(cpi_context, amount_in, amount_out)?;
    }

    let (final_available_source_balance, final_available_destination_balance) =
        Rebalance::calculate_final_balances(
            &mut ctx.accounts.vault_token_source,
            &mut ctx.accounts.vault_token_destination,
            unminted_source_balance,
            unminted_destination_balance,
        )?;

    // remove input component if final available balance is 0
    if final_available_source_balance == 0 {
        ctx.accounts
            .basket_config
            .remove_component(ctx.accounts.vault_token_source.mint);
    } else {
        ctx.accounts.basket_config.upsert_component(
            ctx.accounts.vault_token_source.mint,
            final_available_source_balance,
            basket_total_supply,
        )?;
    }

    ctx.accounts.basket_config.upsert_component(
        ctx.accounts.vault_token_destination.mint,
        final_available_destination_balance,
        basket_total_supply,
    )?;

    emit!(ExecuteRebalancingEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_mint.key(),
        input_mint: ctx.accounts.vault_token_source.mint,
        output_mint: ctx.accounts.vault_token_destination.mint,
        is_swap_base_out,
        initial_available_source_balance,
        initial_available_destination_balance,
        final_available_source_balance,
        final_available_destination_balance,
    });

    Ok(())
}
