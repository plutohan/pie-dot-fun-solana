use anchor_lang::prelude::*;

use crate::{error::PieError, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
pub struct UpdatePlatformFeeWalletContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump,
        constraint = program_state.admin == admin.key() @ PieError::Unauthorized
    )]
    pub program_state: Account<'info, ProgramState>,
}

#[event]
pub struct UpdatePlatformFeeWalletEvent {
    pub new_platform_fee_wallet: Pubkey,
}

pub fn update_platform_fee_wallet(
    ctx: Context<UpdatePlatformFeeWalletContext>,
    new_platform_fee_wallet: Pubkey,
) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;

    program_state.platform_fee_wallet = new_platform_fee_wallet;

    emit!(UpdatePlatformFeeWalletEvent {
        new_platform_fee_wallet,
    });

    Ok(())
}
