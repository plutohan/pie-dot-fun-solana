use anchor_lang::prelude::*;

use crate::{error::PieError, ProgramState, BASIS_POINTS, PROGRAM_STATE};

#[derive(Accounts)]
pub struct UpdateFeeContext<'info> {
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
pub struct UpdateFeeEvent {
    pub new_basket_creation_fee: u64,
    pub new_platform_fee_bp: u64,
}

pub fn update_fee(
    ctx: Context<UpdateFeeContext>,
    new_basket_creation_fee: u64,
    new_platform_fee_bp: u64,
) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;

    require!(new_platform_fee_bp <= BASIS_POINTS, PieError::InvalidFee);
    program_state.platform_fee_bp = new_platform_fee_bp;

    emit!(UpdateFeeEvent {
        new_basket_creation_fee,
        new_platform_fee_bp,
    });

    Ok(())
}
