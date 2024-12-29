use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, ObservationState, PoolState},
};

use crate::{error::PieError, BasketComponent, BasketConfig, BASKET_CONFIG};
use crate::{utils::Calculator, ExecuteRebalancingEvent};

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

    #[account(mut)]
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

    /// The user token account for input token
    #[account(mut)]
    pub vault_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    /// The user token account for output token
    #[account(mut)]
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

    /// The mint of input token
    #[account(
    address = input_vault.mint
)]
    pub input_token_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The mint of output token
    #[account(
    address = output_vault.mint
)]
    pub output_token_mint: Box<InterfaceAccount<'info, Mint>>,
    /// The program account for the most recent oracle observation
    #[account(mut, address = pool_state.load()?.observation_key)]
    pub observation_state: AccountLoader<'info, ObservationState>,
    pub cp_swap_program: Program<'info, RaydiumCpmm>,
}

pub fn execute_rebalancing_cpmm<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<ExecuteRebalancingCpmm>,
    is_buy: bool,
    amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    require!(basket_config.is_rebalancing, PieError::NotInRebalancing);
    let total_supply = ctx.accounts.basket_mint.supply;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &basket_config.id.to_be_bytes(),
        &[basket_config.bump],
    ]];

    // Initial balances
    let initial_source_balance = ctx.accounts.vault_token_source.amount;
    let initial_destination_balance = ctx.accounts.vault_token_destination.amount;

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
        input_token_mint: ctx.accounts.input_token_mint.to_account_info(),
        output_token_mint: ctx.accounts.output_token_mint.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.cp_swap_program.to_account_info(),
        cpi_accounts,
        signer,
    );

    if is_buy {
        // Perform the buy swap with the original amounts
        cpi::swap_base_output(cpi_context, amount_in, amount_out)?;
        ctx.accounts.vault_token_destination.reload()?;

        let token_mint = ctx.accounts.output_token_mint.key();
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
        // Calculate the minimum amount to swap only for sell
        let input_vault_balance = ctx.accounts.input_vault.amount;
        let min_swap_amount_in = std::cmp::min(amount_in, input_vault_balance);

        // Perform the sell swap with the calculated minimum amount
        cpi::swap_base_input(cpi_context, min_swap_amount_in, amount_out)?;

        ctx.accounts.vault_token_source.reload()?;

        let token_mint = ctx.accounts.input_token_mint.key();
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

    emit!(ExecuteRebalancingEvent {
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
