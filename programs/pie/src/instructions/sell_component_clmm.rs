use anchor_lang::prelude::*;
use anchor_spl::memo::Memo;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount, TokenInterface};

use raydium_clmm_cpi::{cpi, program::RaydiumClmm};

use crate::utils::transfer_fees;
use crate::{SellComponentEvent, PROGRAM_STATE};
use crate::{
    constant::USER_FUND, error::PieError, utils::calculate_fee_amount, BasketConfig, ProgramState,
    UserFund, BASKET_CONFIG, NATIVE_MINT,
};

#[derive(Accounts)]
pub struct SellComponentClmm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
        bump = user_fund.bump
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

    pub system_program: Program<'info, System>,

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

    pub input_token_program: Interface<'info, TokenInterface>,

    #[account(
        address = user_token_destination.mint
    )]
    pub user_token_destination_mint: Box<InterfaceAccount<'info, Mint>>,

    /// The user token account for input token
    #[account(mut)]
    pub user_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

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

pub fn sell_component_clmm<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellComponentClmm<'info>>,
    amount: u64,
    other_amount_threshold: u64,
    sqrt_price_limit_x64: u128,
) -> Result<()> {
    require!(amount > 0, PieError::InvalidAmount);
    require!(!ctx.accounts.basket_config.is_rebalancing, PieError::RebalancingInProgress);
    // check if the input token program is valid
    require!(*ctx.accounts.vault_token_source_mint.to_account_info().owner == ctx.accounts.input_token_program.key(), PieError::InvalidTokenProgram);

    let user_fund = &mut ctx.accounts.user_fund;
    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.vault_token_source_mint.key())
        .ok_or(PieError::ComponentNotFound)?;

    require!(component.amount >= amount, PieError::InsufficientBalance);

    let balance_before = ctx.accounts.user_token_destination.amount;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    let cpi_accounts = cpi::accounts::SwapSingleV2 {
        payer: ctx.accounts.basket_config.to_account_info(),
        amm_config: ctx.accounts.amm_config.to_account_info(),
        pool_state: ctx.accounts.pool_state.to_account_info(),
        input_token_account: ctx.accounts.vault_token_source.to_account_info(),
        output_token_account: ctx.accounts.user_token_destination.to_account_info(),
        input_vault: ctx.accounts.input_vault.to_account_info(),
        output_vault: ctx.accounts.output_vault.to_account_info(),
        observation_state: ctx.accounts.observation_state.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        token_program_2022: ctx.accounts.token_program_2022.to_account_info(),
        memo_program: ctx.accounts.memo_program.to_account_info(),
        input_vault_mint: ctx.accounts.vault_token_source_mint.to_account_info(),
        output_vault_mint: ctx.accounts.user_token_destination_mint.to_account_info(),
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
        true,
    )?;

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
        &ctx.accounts.token_program.to_account_info(),
        platform_fee_amount,
        creator_fee_amount,
    )?;

    // Update user's component balance
    component.amount = component.amount.checked_sub(amount).unwrap();
    // Remove components with zero amount
    user_fund.components.retain(|component| component.amount > 0);
    // Close user fund if it is empty
    user_fund.close_if_empty(user_fund.to_account_info(), ctx.accounts.user.to_account_info())?;

    emit!(SellComponentEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.vault_token_source_mint.key(),
        amount: amount,
    });

    Ok(())
}
