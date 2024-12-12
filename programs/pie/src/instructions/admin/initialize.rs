use crate::constant::{INITIALIZE_ADMIN, PROGRAM_STATE};
use crate::error::PieError;
use crate::ProgramState;
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
    let program_state = &mut ctx.accounts.program_state;

    if program_state.is_initialized {
        return Err(PieError::ProgramInitialized.into());
    }

    program_state.bump = ctx.bumps.program_state;
    program_state.is_initialized = true;

    let admin_address = match Pubkey::from_str(INITIALIZE_ADMIN) {
        Ok(admin) => admin,
        Err(_) => return Err(PieError::InvalidInitializeAdminAddress.into()),
    };

    program_state.admin = admin_address;

    program_state.basket_counter = 0;

    Ok(())
}
