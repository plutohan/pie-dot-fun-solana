use anchor_lang::prelude::*;

use crate::{
    constant::{MAX_COMPONENTS, USER_FUND},
    error::PieError,
    utils::{calculate_fee_amount, transfer_from_user_to_pool_vault},
    BasketConfig, ProgramState, UserComponent, UserFund, NATIVE_MINT,
};
use anchor_spl::memo::Memo;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

use raydium_clmm_cpi::{
    cpi,
    program::RaydiumClmm,
    states::{AmmConfig, ObservationState, PoolState},
};

#[derive(Accounts)]
pub struct BuyComponentClmm<'info> {
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
    #[account(mut)]
    pub program_state: Box<Account<'info, ProgramState>>,
    #[account(mut)]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    pub system_program: Program<'info, System>,

    pub clmm_program: Program<'info, RaydiumClmm>,
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

    /// The factory state to read protocol fees
    #[account(address = pool_state.load()?.amm_config)]
    pub amm_config: Box<Account<'info, AmmConfig>>,

    /// The program account of the pool in which the swap will be performed
    #[account(mut)]
    pub pool_state: AccountLoader<'info, PoolState>,

    /// The user token account for input token
    #[account(mut)]
    pub user_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

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
pub struct BuyComponentClmmEvent {
    pub basket_id: u64,
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

pub fn buy_component_clmm<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, BuyComponentClmm<'info>>,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit_x64: u128,
) -> Result<()> {
    require!(amount > 0, PieError::InvalidAmount);

    let balance_in_before = ctx.accounts.user_token_source.amount;
    let balance_out_before = ctx.accounts.vault_token_destination.amount;

    let cpi_accounts = cpi::accounts::SwapSingleV2 {
        payer: ctx.accounts.user.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.user_token_source.to_account_info(),
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
    let cpi_context = CpiContext::new(ctx.accounts.clmm_program.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec());

    cpi::swap_v2(
        cpi_context,
        amount,
        other_amount_threshold,
        sqrt_price_limit_x64,
        false,
    )?;

    ctx.accounts.user_token_source.reload()?;
    ctx.accounts.vault_token_destination.reload()?;

    let balance_in_after = ctx.accounts.user_token_source.amount;
    let balance_out_after = ctx.accounts.vault_token_destination.amount;

    let amount_swapped = balance_in_before.checked_sub(balance_in_after).unwrap();
    let amount_received = balance_out_after.checked_sub(balance_out_before).unwrap();

    let (platform_fee_amount, creator_fee_amount) =
        calculate_fee_amount(&ctx.accounts.program_state, amount_swapped)?;

    // Transfer platform fee to platform fee wallet
    if platform_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            &ctx.accounts.user_token_source.to_account_info(),
            &ctx.accounts.platform_fee_token_account.to_account_info(),
            &&ctx.accounts.user.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            platform_fee_amount,
        )?;
    }

    // Transfer creator fee to creator
    if creator_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            &ctx.accounts.user_token_source.to_account_info(),
            &ctx.accounts.creator_token_account.to_account_info(),
            &&ctx.accounts.user.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            creator_fee_amount,
        )?;
    }

    let user_fund = &mut ctx.accounts.user_fund;

    if let Some(asset) = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.output_vault.key())
    {
        asset.amount = asset.amount.checked_add(amount_received).unwrap();
    } else {
        require!(
            user_fund.components.len() < MAX_COMPONENTS as usize,
            PieError::MaxAssetsExceeded
        );

        user_fund.components.push(UserComponent {
            mint: ctx.accounts.output_vault.key(),
            amount: amount_received,
        });
    }

    emit!(BuyComponentClmmEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.output_vault.key(),
        amount: amount_received,
    });

    Ok(())
}
