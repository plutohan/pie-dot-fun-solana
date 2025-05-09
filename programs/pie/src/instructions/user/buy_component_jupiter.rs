use crate::{
    constant::{JUPITER_PROGRAM_ID, USER_FUND},
    error::PieError,
    utils::calculate_amounts_swapped_and_received,
    BasketConfig, UserFund, BASKET_CONFIG, NATIVE_MINT,
};
use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::{
    token_interface::{Mint, TokenAccount, TokenInterface}
};

#[derive(Accounts)]
pub struct BuyComponentJupiterContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

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
        associated_token::authority = basket_config,
        associated_token::mint = NATIVE_MINT,
    )]
    pub vault_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_destination.mint,
        associated_token::token_program = output_token_program
    )]
    pub vault_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL program for output token transfers
    pub output_token_program: Interface<'info, TokenInterface>,

    /// CHECK: Jupiter program will be checked in require
    pub jupiter_program: UncheckedAccount<'info>,
}

#[event]
pub struct BuyComponentJupiterEvent {
    pub basket_id: u64,
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount_swapped: u64,
    pub amount_received: u64,
}

/// Buys a component using Jupiter with the user's WSOL 
/// Before calling buy component, user must deposit WSOl with `deposit_wsol` instruction
pub fn buy_component_jupiter(
    ctx: Context<BuyComponentJupiterContext>,
    data: Vec<u8>,
) -> Result<()> {
    require!(
        !ctx.accounts.basket_config.is_rebalancing,
        PieError::RebalancingInProgress
    );
    require!(
        ctx.accounts
            .basket_config
            .components
            .iter()
            .any(|c| c.mint == ctx.accounts.vault_token_destination.mint.key()),
        PieError::InvalidComponent
    );
    require!(
        ctx.accounts.jupiter_program.key() == JUPITER_PROGRAM_ID,
        PieError::InvalidJupiterProgram
    );

    let user_fund = &mut ctx.accounts.user_fund;

    let balance_in_before = ctx.accounts.vault_token_source.amount;
    let balance_out_before = ctx.accounts.vault_token_destination.amount;

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

    ctx.accounts.vault_token_source.reload()?;
    ctx.accounts.vault_token_destination.reload()?;

    let (amount_swapped, amount_received) = calculate_amounts_swapped_and_received(
        &ctx.accounts.vault_token_source,
        &ctx.accounts.vault_token_destination,
        balance_in_before,
        balance_out_before,
    )?;

    require!(amount_swapped > 0, PieError::InvalidSwapResult);
    require!(amount_received > 0, PieError::InvalidSwapResult);

    // Remove input token from user fund
    // It will throw error if amount_swapped is greater than the balance of the user fund
    user_fund.remove_component(NATIVE_MINT, amount_swapped)?;

    // Add output token to user fund
    user_fund.upsert_component(
        ctx.accounts.vault_token_destination.mint.key(),
        amount_received,
    )?;

    emit!(BuyComponentJupiterEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.vault_token_destination.mint.key(),
        amount_swapped,
        amount_received,
    });

    Ok(())
}
