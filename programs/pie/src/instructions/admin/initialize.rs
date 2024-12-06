use crate::constant::INITIALIZE_ADMIN;
use crate::error::PieError;
use crate::{constant::PROGRAM_STATE, ProgramState};
use anchor_lang::prelude::*;
use std::str::FromStr;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = ProgramState::INIT_SPACE,
        seeds = [PROGRAM_STATE],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    if ctx.accounts.program_state.is_initialized == true {
        return Err(PieError::ProgramInitialized.into());
    }
    ctx.accounts.program_state.bump = ctx.bumps.program_state;
    ctx.accounts.program_state.is_initialized = true;
    match Pubkey::from_str(INITIALIZE_ADMIN) {
        Ok(admin) => {
            ctx.accounts.program_state.admin = admin;
        }
        Err(_) => return Err(PieError::InvalidInitializeAdminAddress.into()),
    }
    ctx.accounts.program_state.basket_counter = 0;
    Ok(())
}
