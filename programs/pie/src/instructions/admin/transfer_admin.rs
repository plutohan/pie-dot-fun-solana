use crate::{constant::PROGRAM_STATE, error::PieError, ProgramState};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct TransferAdminContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump,
        constraint = program_state.admin == admin.key() @ PieError::Unauthorized
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
    let old_admin = ctx.accounts.program_state.admin;
    ctx.accounts.program_state.admin = new_admin;

    emit!(TransferAdminEvent {
        old_admin,
        new_admin,
    });

    Ok(())
}
