use anchor_lang::prelude::*;
use anchor_spl::{token::Token, token_interface::TokenAccount};

use crate::{
    constant::USER_FUND, error::PieError, states::BasketState, utils::{calculate_fee_amount, transfer_fees, transfer_from_user_to_pool_vault}, BasketConfig, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT, PROGRAM_STATE
};

#[derive(Accounts)]
pub struct DepositWsolContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut, 
        seeds = [PROGRAM_STATE], 
        bump = program_state.bump
        )]
    pub program_state: Box<Account<'info, ProgramState>>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserFund::INIT_SPACE,
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
pub struct DepositWsolEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub creator_fee: u64,
    pub platform_fee: u64,
}

/// Deposits WSOl into the basket
/// Before calling buy component, user must deposit WSOl first
pub fn deposit_wsol(ctx: Context<DepositWsolContext>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.basket_config.state == BasketState::Active,
        PieError::OnlyDefaultState
    );

    let user_fund = &mut ctx.accounts.user_fund;

    let (platform_fee_amount, creator_fee_amount) = calculate_fee_amount(
        ctx.accounts.program_state.platform_fee_bp,
        ctx.accounts.basket_config.creator_fee_bp,
        amount,
    )?;

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

    transfer_from_user_to_pool_vault(
        &ctx.accounts.user_wsol_account.to_account_info(),
        &ctx.accounts.vault_wsol_account.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        &ctx.accounts.token_program,
        amount,
    )?;

    user_fund.bump = ctx.bumps.user_fund;
    user_fund.upsert_component(NATIVE_MINT, amount)?;

    emit!(DepositWsolEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_config.mint,
        user: ctx.accounts.user.key(),
        amount,
        creator_fee: creator_fee_amount,
        platform_fee: platform_fee_amount,
    });

    Ok(())
}
