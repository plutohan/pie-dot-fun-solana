use anchor_lang::prelude::*;

use crate::{error::PieError, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
pub struct UpdateMaxRebalanceMargin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump,
    )]
    pub program_state: Account<'info, ProgramState>,
}

pub fn update_max_rebalance_margin(
    ctx: Context<UpdateMaxRebalanceMargin>,
    new_margin: u64,
) -> Result<()> {
    // Update the margin value
    let program_state = &mut ctx.accounts.program_state;

    // Optional: Add validation for minimum/maximum values
    require!(new_margin > 0, PieError::InvalidMargin);

    // Update the margin
    program_state.max_rebalance_margin_lamports = new_margin;

    Ok(())
}
