use anchor_lang::prelude::*;

use crate::{error::PieError, ProgramState, PROGRAM_STATE};

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
    pub new_creator_fee_percentage: Option<u64>,
    pub new_platform_fee_percentage: Option<u64>,
}

pub fn update_fee(
    ctx: Context<UpdateFeeContext>,
    new_creator_fee_percentage: Option<u64>,
    new_platform_fee_percentage: Option<u64>,
) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;

    if let Some(new_creator_fee_percentage) = new_creator_fee_percentage {
        program_state.creator_fee_percentage = new_creator_fee_percentage;
    }

    if let Some(new_platform_fee_percentage) = new_platform_fee_percentage {
        program_state.platform_fee_percentage = new_platform_fee_percentage;
    }
    require!(
        program_state.mint_redeem_fee_percentage >= program_state.platform_fee_percentage,
        PieError::InvalidFee
    );

    emit!(UpdateFeeEvent {
        new_creator_fee_percentage,
        new_platform_fee_percentage
    });

    Ok(())
}
