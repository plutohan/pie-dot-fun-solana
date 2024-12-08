use anchor_lang::prelude::*;

use crate::{error::PieError, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
pub struct UpdateRebalanceMarginContext<'info> {
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
pub struct UpdateMaxRebalanceMarginEvent {
    pub new_margin: u64,
}

pub fn update_rebalance_margin(
    ctx: Context<UpdateRebalanceMarginContext>,
    new_margin: u64,
) -> Result<()> {
    // Update the margin value
    let program_state = &mut ctx.accounts.program_state;

    // Optional: Add validation for minimum/maximum values
    require!(new_margin > 0, PieError::InvalidMargin);

    // Update the margin
    program_state.rebalance_margin_lamports = new_margin;

    emit!(UpdateMaxRebalanceMarginEvent { new_margin });

    Ok(())
}
