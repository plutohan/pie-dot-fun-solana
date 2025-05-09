use crate::constant::JUPITER_PROGRAM_ID;
use crate::instructions::ExecuteRebalancingEvent;
use crate::utils::Rebalance;
use crate::{error::PieError, BasketConfig, BASKET_CONFIG};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::TokenAccount;
use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
pub struct ExecuteRebalancingJupiter<'info> {
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

    #[account(
        address = vault_token_source.mint
    )]
    pub vault_token_source_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
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
        init_if_needed,
        payer = rebalancer,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_destination_mint,
        associated_token::token_program = output_token_program
    )]
    pub vault_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL program for input token transfers
    pub input_token_program: Interface<'info, TokenInterface>,

    /// SPL program for output token transfers
    pub output_token_program: Interface<'info, TokenInterface>,

    /// CHECK: Jupiter program will be checked in require
    pub jupiter_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn execute_rebalancing_jupiter<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancingJupiter<'info>>,
    data: Vec<u8>,
) -> Result<()> {
    require!(
        ctx.accounts.basket_config.is_rebalancing,
        PieError::NotInRebalancing
    );
    require!(
        ctx.accounts.jupiter_program.key() == JUPITER_PROGRAM_ID,
        PieError::InvalidJupiterProgram
    );

    let basket_total_supply = ctx.accounts.basket_mint.supply;

    let (
        initial_available_source_balance,
        initial_available_destination_balance,
        unminted_source_balance,
        unminted_destination_balance,
    ) = Rebalance::calculate_initial_balances(
        &mut ctx.accounts.basket_config,
        ctx.accounts.vault_token_source.as_ref(),
        ctx.accounts.vault_token_destination.as_ref(),
        basket_total_supply,
        0, // TODO: remove this field when removing raydium
    )?;

    // Prepare accounts for jupiter program
    let accounts: Vec<AccountMeta> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| {
            let is_signer = acc.key == &ctx.accounts.basket_config.key();
            AccountMeta {
                pubkey: *acc.key,
                is_signer,
                is_writable: acc.is_writable,
            }
        })
        .collect();

    let accounts_infos: Vec<AccountInfo> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| AccountInfo { ..acc.clone() })
        .collect();

    let signer_seeds: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    // Invoke jupiter program
    invoke_signed(
        &Instruction {
            program_id: ctx.accounts.jupiter_program.key(),
            accounts,
            data,
        },
        &accounts_infos,
        signer_seeds,
    )?;

    let (final_available_source_balance, final_available_destination_balance) =
        Rebalance::calculate_final_balances(
            &mut ctx.accounts.vault_token_source,
            &mut ctx.accounts.vault_token_destination,
            unminted_source_balance,
            unminted_destination_balance,
        )?;

    // Check swap result
    require!(
        initial_available_source_balance - final_available_source_balance > 0,
        PieError::InvalidSwapResult
    );

    require!(
        final_available_destination_balance - initial_available_destination_balance > 0,
        PieError::InvalidSwapResult
    );

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
        is_swap_base_out: false, // TODO: remove this field when removing raydium
        initial_available_source_balance,
        initial_available_destination_balance,
        final_available_source_balance,
        final_available_destination_balance,
    });

    Ok(())
}
