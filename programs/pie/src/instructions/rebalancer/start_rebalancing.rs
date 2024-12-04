use anchor_lang::{prelude::*, solana_program::clock::Clock};

use crate::{error::PieError, ProgramState, RebalancerState, PROGRAM_STATE, REBALANCER_STATE};

#[event]
pub struct StartRebalancingEvent {
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct StartRebalancing<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,

    #[account(
        seeds = [REBALANCER_STATE, rebalancer.key().as_ref()],
        bump,
        constraint = rebalancer_state.balancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub rebalancer_state: Box<Account<'info, RebalancerState>>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    pub system_program: Program<'info, System>,
}

pub fn start_rebalancing(ctx: Context<StartRebalancing>) -> Result<()> {
    // Check if already rebalancing
    let program_state = &mut ctx.accounts.program_state;
    require!(!program_state.is_rebalancing, PieError::AlreadyRebalancing);

    // Set rebalancing state to true
    program_state.is_rebalancing = true;

    // Get current timestamp
    let clock = Clock::get()?;

    emit!(StartRebalancingEvent {
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
