use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount, TokenInterface};

use raydium_clmm_cpi::{cpi, program::RaydiumClmm};

use crate::utils::Rebalance;
use crate::{error::PieError, BasketConfig, BASKET_CONFIG};
use crate::{ExecuteRebalancingEvent, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
pub struct ExecuteRebalancingClmm<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,
    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Box<Account<'info, ProgramState>>,
    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump,
        constraint = basket_config.rebalancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub basket_config: Account<'info, BasketConfig>,

    #[account(
        mut,
        address = basket_config.mint
    )]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

    pub clmm_program: Program<'info, RaydiumClmm>,

    /// CHECK: Safe. amm_config Account
    #[account(mut)]
    pub amm_config: AccountInfo<'info>,

    /// CHECK: Safe. pool_state Account
    #[account(mut)]
    pub pool_state: AccountInfo<'info>,

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

    /// SPL program for input token transfers: Token or Token 2022 Program
    pub input_token_program: Interface<'info, TokenInterface>,

    /// SPL program for output token transfers: Token or Token 2022 Program
    pub output_token_program: Interface<'info, TokenInterface>,

    /// The vault token account for input token
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for output token
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Safe. observation_state Account
    #[account(mut)]
    pub observation_state: AccountInfo<'info>,

    /// SPL program for token transfers
    pub token_program: Program<'info, Token>,

    /// SPL program 2022 for token transfers
    pub token_program_2022: Program<'info, Token2022>,

    /// memo program
    pub memo_program: Program<'info, Memo>,
    // remaining accounts
    // tickarray_bitmap_extension: must add account if need regardless the sequence
    // tick_array_account_1
    // tick_array_account_2
    // tick_array_account_...
}

pub fn execute_rebalancing_clmm<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancingClmm<'info>>,
    is_swap_base_out: bool,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit_x64: u128,
) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;

    // check if token programs are valid
    require!(
        *ctx.accounts.vault_token_source_mint.to_account_info().owner
            == ctx.accounts.input_token_program.key(),
        PieError::InvalidTokenProgram
    );
    require!(
        *ctx.accounts
            .vault_token_destination_mint
            .to_account_info()
            .owner
            == ctx.accounts.output_token_program.key(),
        PieError::InvalidTokenProgram
    );

    require!(basket_config.is_rebalancing, PieError::NotInRebalancing);
    let basket_total_supply = ctx.accounts.basket_mint.supply;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &basket_config.id.to_be_bytes(),
        &[basket_config.bump],
    ]];

    let amount_in = if is_swap_base_out {
        other_amount_threshold
    } else {
        amount
    };

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

    let cpi_accounts = cpi::accounts::SwapSingleV2 {
        payer: basket_config.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.vault_token_source.to_account_info(),
        output_token_account: ctx.accounts.vault_token_destination.to_account_info(),
        input_vault: ctx.accounts.input_vault.to_account_info(),
        output_vault: ctx.accounts.output_vault.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
        memo_program: ctx.accounts.memo_program.to_account_info(),
        input_vault_mint: ctx.accounts.vault_token_source_mint.to_account_info(),
        output_vault_mint: ctx.accounts.vault_token_destination_mint.to_account_info(),
    };
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.clmm_program.to_account_info(),
        cpi_accounts,
        signer,
    )
    .with_remaining_accounts(ctx.remaining_accounts.to_vec());

    cpi::swap_v2(
        cpi_context,
        amount,
        other_amount_threshold,
        sqrt_price_limit_x64,
        !is_swap_base_out,
    )?;

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
