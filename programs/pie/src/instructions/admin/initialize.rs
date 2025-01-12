use crate::constant::PROGRAM_STATE;
use crate::error::PieError;
use crate::{ProgramState, INITIALIZER};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = initializer,
        space = ProgramState::INIT_SPACE,
        seeds = [PROGRAM_STATE],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,

    pub system_program: Program<'info, System>,
}

pub fn initialize(
    ctx: Context<Initialize>,
    initial_admin: Pubkey,
    initial_creator: Pubkey,
    initial_platform_fee_wallet: Pubkey,
    initial_platform_fee_percentage: u64,
) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;

    require!(
        ctx.accounts.initializer.key() == INITIALIZER,
        PieError::Unauthorized
    );

    if program_state.is_initialized {
        return Err(PieError::ProgramInitialized.into());
    }

    program_state.bump = ctx.bumps.program_state;
    program_state.is_initialized = true;
    program_state.admin = initial_admin;
    program_state.whitelisted_creators.push(initial_creator);
    program_state.basket_counter = 0;
    program_state.platform_fee_wallet = initial_platform_fee_wallet;
    program_state.platform_fee_percentage = initial_platform_fee_percentage;

    Ok(())
}
