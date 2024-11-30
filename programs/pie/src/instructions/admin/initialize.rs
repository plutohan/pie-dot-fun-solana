use anchor_lang::prelude::*;

use crate::{constant::PROGRAM_STATE, ProgramState};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = ProgramState::INIT_SPACE,
        seeds = [PROGRAM_STATE],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.program_state.bump = ctx.bumps.program_state;
    ctx.accounts.program_state.admin = ctx.accounts.admin.key();
    ctx.accounts.program_state.basket_counter = 0;
    Ok(())
}
