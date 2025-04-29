use crate::{constant::PROGRAM_STATE, error::PieError, ProgramState};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateAdminContext<'info> {
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
pub struct UpdateAdminEvent {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

pub fn update_admin(ctx: Context<UpdateAdminContext>, new_admin: Pubkey) -> Result<()> {
    let old_admin = ctx.accounts.program_state.admin;
    ctx.accounts.program_state.admin = new_admin;

    emit!(UpdateAdminEvent {
        old_admin,
        new_admin,
    });

    Ok(())
}
