use anchor_lang::prelude::*;
use anchor_spl::{
    token::Token,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use raydium_cpmm_cpi::{
    cpi,
    program::RaydiumCpmm,
    states::{AmmConfig, ObservationState, PoolState},
    AUTH_SEED,
};

use crate::{
    constant::USER_FUND,
    error::PieError,
    utils::{calculate_fee_amount, transfer_from_user_to_pool_vault},
    BasketConfig, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT,
};

#[derive(Accounts)]
pub struct SellComponentCpmm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,

    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(mut)]
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
    #[account(
    seeds = [
        AUTH_SEED.as_bytes(),
    ],
    bump,
    )]
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
    pub output_token_program: Interface<'info, TokenInterface>,

    /// The mint of input token
    #[account(address = input_vault.mint)]
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

    pub token_program: Program<'info, Token>,

    pub token_2022_program: Program<'info, Token2022>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct SellComponentCpmmEvent {
    pub basket_id: u64,
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

pub fn sell_component_cpmm(
    ctx: Context<SellComponentCpmm>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    require!(amount_in > 0, PieError::InvalidAmount);

    let user_fund = &mut ctx.accounts.user_fund;
    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.input_token_mint.key())
        .ok_or(PieError::ComponentNotFound)?;

    require!(component.amount >= amount_in, PieError::InsufficientBalance);

    let balance_before = ctx.accounts.user_token_destination.amount;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];
    let cpi_accounts = cpi::accounts::Swap {
        payer: ctx.accounts.user.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.vault_token_source.to_account_info(),
        output_token_account: ctx.accounts.user_token_destination.to_account_info(),
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
    cpi::swap_base_input(cpi_context, amount_in, minimum_amount_out)?;

    ctx.accounts.user_token_destination.reload()?;

    let balance_after = ctx.accounts.user_token_destination.amount;

    let amount_received: u64 = balance_after.checked_sub(balance_before).unwrap();

    let (platform_fee_amount, creator_fee_amount) =
        calculate_fee_amount(&ctx.accounts.program_state, amount_received)?;

    // Transfer platform fee to platform fee wallet
    if platform_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            &ctx.accounts.user_token_destination.to_account_info(),
            &ctx.accounts.platform_fee_token_account.to_account_info(),
            &ctx.accounts.user.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            platform_fee_amount,
        )?;
    }
    // Transfer creator fee to creator
    if creator_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            &ctx.accounts.user_token_destination.to_account_info(),
            &ctx.accounts.creator_token_account.to_account_info(),
            &ctx.accounts.user.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            creator_fee_amount,
        )?;
    }

    // Update user's component balance
    component.amount = component.amount.checked_sub(amount_in).unwrap();

    emit!(SellComponentCpmmEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.input_token_mint.key(),
        amount: amount_in,
    });

    Ok(())
}
