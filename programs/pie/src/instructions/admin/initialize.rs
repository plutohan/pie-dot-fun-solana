use crate::constant::PROGRAM_STATE;
use crate::error::PieError;
use crate::ProgramState;
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
    initial_platform_fee_wallet: Pubkey,
    initial_platform_fee_bp: u64,
    initial_basket_creation_fee: u64,
) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;

    if program_state.is_initialized {
        return Err(PieError::ProgramInitialized.into());
    }

    program_state.bump = ctx.bumps.program_state;
    program_state.is_initialized = true;
    program_state.admin = initial_admin;
    program_state.basket_counter = 0;
    program_state.platform_fee_wallet = initial_platform_fee_wallet;
    program_state.platform_fee_bp = initial_platform_fee_bp;
    program_state.basket_creation_fee = initial_basket_creation_fee;
    Ok(())
}
