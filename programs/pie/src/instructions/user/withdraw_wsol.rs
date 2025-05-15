use anchor_lang::prelude::*;
use anchor_spl::{token::{Token, CloseAccount}, token_interface::TokenAccount};

use crate::{
    constant::USER_FUND,
    error::PieError,
    utils::{calculate_fee_amount, transfer_from_pool_vault_to_user},
    BasketConfig, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT, PROGRAM_STATE,
};

#[derive(Accounts)]
pub struct WithdrawWsolContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
        )]
    pub program_state: Box<Account<'info, ProgramState>>,

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
        token::mint = NATIVE_MINT,
        token::authority = user
    )]
    pub user_wsol_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = NATIVE_MINT,
        associated_token::authority = basket_config
    )]
    pub vault_wsol_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Platform fee wallet that receives the fee
    #[account(mut, address = program_state.platform_fee_wallet)]
    pub platform_fee_wallet: AccountInfo<'info>,

    /// CHECK: Creator fee wallet that receives the fee
    #[account(mut, address = basket_config.creator)]
    pub creator_fee_wallet: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
}

#[event]
pub struct WithdrawWsolEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub creator_fee: u64,
    pub platform_fee: u64,
}

pub fn withdraw_wsol(ctx: Context<WithdrawWsolContext>) -> Result<()> {
    let user_fund = &mut ctx.accounts.user_fund;

    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == NATIVE_MINT)
        .ok_or(PieError::ComponentNotFound)?;

    let amount = component.amount;

    let (platform_fee_amount, creator_fee_amount) = calculate_fee_amount(
        ctx.accounts.program_state.platform_fee_bp,
        ctx.accounts.basket_config.creator_fee_bp,
        amount,
    )?;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];
    
    // Transfer WSOL to user first
    transfer_from_pool_vault_to_user(
        &ctx.accounts.vault_wsol_account.to_account_info(),
        &ctx.accounts.user_wsol_account.to_account_info(),
        &ctx.accounts.basket_config.to_account_info(),
        &ctx.accounts.token_program,
        amount,
        signer,
    )?;

    // Close token account to recover SOL
    let cpi_accounts: CloseAccount<'_> = CloseAccount {
        account: ctx.accounts.user_wsol_account.to_account_info(),
        destination: ctx.accounts.user.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::close_account(cpi_ctx)?;

    // Transfer SOL to fee destinations
    if platform_fee_amount > 0 {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.platform_fee_wallet.to_account_info(),
                },
            ),
            platform_fee_amount,
        )?;

        msg!(
            "Transferred {} lamports to platform fee wallet({})",
            platform_fee_amount,
            ctx.accounts.platform_fee_wallet.key()
        );
    }

    if creator_fee_amount > 0 {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.creator_fee_wallet.to_account_info(),
                },
            ),
            creator_fee_amount,
        )?;

        msg!(
            "Transferred {} lamports to creator fee wallet({})",
            creator_fee_amount,
            ctx.accounts.creator_fee_wallet.key()
        );
        
    }

    // Update user's component balance
    user_fund.remove_component(NATIVE_MINT, amount)?;

    // Close user fund if it is empty
    user_fund.close_if_empty(
        user_fund.to_account_info(),
        ctx.accounts.user.to_account_info(),
    )?;

    emit!(WithdrawWsolEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_config.mint,
        user: ctx.accounts.user.key(),
        amount,
        creator_fee: creator_fee_amount,
        platform_fee: platform_fee_amount,
    });

    Ok(())
}
