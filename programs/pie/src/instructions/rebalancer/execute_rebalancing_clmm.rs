use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use raydium_clmm_cpi::{
    cpi,
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::utils::Calculator;
use crate::{error::PieError, BasketComponent, BasketConfig, BASKET_CONFIG};
use crate::{ProgramState, NATIVE_MINT};

#[derive(Accounts)]
pub struct ExecuteRebalancingClmm<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,
    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,
    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump,
        constraint = basket_config.rebalancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub basket_config: Account<'info, BasketConfig>,
    // Required token accounts
    #[account(mut)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

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

    pub clmm_program: Program<'info, RaydiumClmm>,

    /// The factory state to read protocol fees
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// The program account of the pool in which the swap will be performed
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    /// The user token account for input token
    #[account(mut)]
    pub vault_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user token account for output token
    #[account(mut)]
    pub vault_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for input token
    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The vault token account for output token
    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The program account for the most recent oracle observation
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,

    /// SPL program for token transfers
    pub token_program: Program<'info, Token>,

    /// SPL program 2022 for token transfers
    pub token_program_2022: Program<'info, Token2022>,

    /// memo program
    pub memo_program: Program<'info, Memo>,

    /// The mint of token vault 0
    #[account(
        address = input_vault.mint
    )]
    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The mint of token vault 1
    #[account(
        address = output_vault.mint
    )]
    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,
    // remaining accounts
    // tickarray_bitmap_extension: must add account if need regardless the sequence
    // tick_array_account_1
    // tick_array_account_2
    // tick_array_account_...
}

#[event]
pub struct ExecuteRebalancingClmmEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub is_buy: bool,
    pub initial_source_balance: u64,
    pub initial_destination_balance: u64,
    pub final_source_balance: u64,
    pub final_destination_balance: u64,
}

pub fn execute_rebalancing_clmm<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancingClmm<'info>>,
    is_buy: bool,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit_x64: u128,
) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;

    require!(basket_config.is_rebalancing, PieError::NotInRebalancing);
    let total_supply = ctx.accounts.basket_mint.supply;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &basket_config.id.to_be_bytes(),
        &[basket_config.bump],
    ]];
    let initial_source_balance = ctx.accounts.vault_token_source.amount;
    let initial_destination_balance = ctx.accounts.vault_token_destination.amount;

    let cpi_accounts = cpi::accounts::SwapSingleV2 {
        payer: ctx.accounts.rebalancer.to_account_info(),
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
        input_vault_mint: ctx.accounts.input_vault_mint.to_account_info(),
        output_vault_mint: ctx.accounts.output_vault_mint.to_account_info(),
    };
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.clmm_program.to_account_info(),
        cpi_accounts,
        signer,
    )
    .with_remaining_accounts(ctx.remaining_accounts.to_vec());

    if is_buy {
        cpi::swap_v2(
            cpi_context,
            amount,
            other_amount_threshold,
            sqrt_price_limit_x64,
            false,
        )?;
        ctx.accounts.vault_token_destination.reload()?;

        let token_mint = ctx.accounts.output_vault_mint.key();
        let quantity_in_sys_decimal =
            Calculator::apply_sys_decimal(ctx.accounts.vault_token_destination.amount)
                .checked_div(total_supply.try_into().unwrap())
                .unwrap();

        if let Some(component) = basket_config
            .components
            .iter_mut()
            .find(|c| c.mint == token_mint)
        {
            component.quantity_in_sys_decimal = quantity_in_sys_decimal;
        } else {
            basket_config.components.push(BasketComponent {
                mint: token_mint,
                quantity_in_sys_decimal,
            });
        }
    } else {
        cpi::swap_v2(
            cpi_context,
            amount,
            other_amount_threshold,
            sqrt_price_limit_x64,
            true,
        )?;
        ctx.accounts.vault_token_source.reload()?;

        let token_mint = ctx.accounts.input_vault_mint.key();
        let quantity_in_sys_decimal =
            Calculator::apply_sys_decimal(ctx.accounts.vault_token_source.amount)
                .checked_div(total_supply.try_into().unwrap())
                .unwrap();

        if quantity_in_sys_decimal == 0 {
            basket_config.components.retain(|c| c.mint != token_mint);
        } else {
            if let Some(component) = basket_config
                .components
                .iter_mut()
                .find(|c| c.mint == token_mint)
            {
                component.quantity_in_sys_decimal = quantity_in_sys_decimal;
            }
        }
    }

    // Fetch final balances
    ctx.accounts.vault_token_source.reload()?;
    ctx.accounts.vault_token_destination.reload()?;
    let final_source_balance = ctx.accounts.vault_token_source.amount;
    let final_destination_balance = ctx.accounts.vault_token_destination.amount;

    emit!(ExecuteRebalancingClmmEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_mint.key(),
        is_buy,
        initial_source_balance,
        initial_destination_balance,
        final_source_balance,
        final_destination_balance,
    });

    Ok(())
}
