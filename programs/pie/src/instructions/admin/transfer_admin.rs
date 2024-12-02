use anchor_lang::prelude::*;

use crate::{constant::PROGRAM_STATE, error::PieError, ProgramState};

#[derive(Accounts)]
pub struct TransferAdminContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct TransferAdminEvent {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

pub fn transfer_admin(ctx: Context<TransferAdminContext>, new_admin: Pubkey) -> Result<()> {
    if ctx.accounts.admin.key() != ctx.accounts.program_state.admin {
        return Err(PieError::Unauthorized.into());
    }

    ctx.accounts.program_state.admin = new_admin;

    emit!(TransferAdminEvent {
        old_admin: ctx.accounts.admin.key(),
        new_admin: new_admin,
    });
    Ok(())
}
