use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constant::{BASKET_CONFIG, JUPITER_PROGRAM_ID, NATIVE_MINT, USER_BALANCE},
    error::PieError,
    states::BasketConfig,
    UserBalance,
};

#[derive(Accounts)]
pub struct WithdrawUserBalanceContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_BALANCE, user.key().as_ref()],
        bump = user_balance.bump,
        realloc = UserBalance::size_for_len(user_balance.balances.len() - 1),
        realloc::payer = user,
        realloc::zero = false,
    )]
    pub user_balance: Account<'info, UserBalance>,

    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump = basket_config.bump,
    )]
    pub basket_config: Account<'info, BasketConfig>,

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

    /// SPL program for input token transfers
    pub input_token_program: Interface<'info, TokenInterface>,

    #[account(
        mut,
        token::mint = NATIVE_MINT,
        token::authority = user,
    )]
    pub user_wsol_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Jupiter program
    pub jupiter_program: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

pub fn withdraw_user_balance(
    ctx: Context<WithdrawUserBalanceContext>,
    data: Vec<u8>,
) -> Result<()> {
    require!(
        ctx.accounts.jupiter_program.key() == JUPITER_PROGRAM_ID,
        PieError::InvalidJupiterProgram
    );

    let user = &mut ctx.accounts.user;
    let user_balance = &mut ctx.accounts.user_balance;
    let vault_token_source = &mut ctx.accounts.vault_token_source;
    let vault_token_source_mint = ctx.accounts.vault_token_source_mint.key();
    let user_wsol_account = &mut ctx.accounts.user_wsol_account;

    let vault_balance_before = vault_token_source.amount;
    let user_wsol_balance_before = user_wsol_account.amount;

    // Find and update the balance for this token
    let balance_index = user_balance
        .balances
        .iter()
        .position(|b| {
            b.mint == vault_token_source_mint && b.basket_id == ctx.accounts.basket_config.id
        })
        .ok_or(PieError::ComponentNotFound)?;

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

    vault_token_source.reload()?;
    user_wsol_account.reload()?;

    let vault_balance_after = vault_token_source.amount;
    let user_wsol_balance_after = user_wsol_account.amount;

    require!(
        vault_balance_before - vault_balance_after > 0,
        PieError::InvalidSwapResult
    );

    require!(
        user_wsol_balance_after - user_wsol_balance_before > 0,
        PieError::InvalidSwapResult
    );

    // Update the balance
    user_balance.balances[balance_index].amount = user_balance.balances[balance_index]
        .amount
        .checked_sub(vault_balance_before - vault_balance_after)
        .ok_or(PieError::ConversionFailure)?;

    // Check if the balance is now empty
    require!(
        user_balance.balances[balance_index].amount == 0,
        PieError::InvalidSwapResult
    );

    // Remove the balance entry
    user_balance.balances.remove(balance_index);

    // Close the user balance account if it's empty
    user_balance.close_if_empty(user_balance.to_account_info(), user.to_account_info())?;

    Ok(())
}
