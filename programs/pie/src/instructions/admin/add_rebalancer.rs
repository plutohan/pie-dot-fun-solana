use anchor_lang::prelude::*;

use crate::{constant::{ADMIN_STATE, REBALANCER_STATE}, error::PieError, ProgramState, RebalancerState};

#[derive(Accounts)]
#[instruction(rebalancer: Pubkey)]
pub struct AddRebalancer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = RebalancerState::INIT_SPACE,
        seeds = [REBALANCER_STATE, rebalancer.as_ref()],
        bump
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,

    #[account(
        mut,
        seeds = [ADMIN_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct AddRebalancerEvent {
    pub rebalancer: Pubkey,
    pub admin: Pubkey,
}

pub fn add_rebalancer(ctx: Context<AddRebalancer>, rebalancer: Pubkey) -> Result<()> {
    if ctx.accounts.admin.key() != ctx.accounts.program_state.admin {
        return Err(PieError::Unauthorized.into());
    }

    ctx.accounts.rebalancer_state.balancer = rebalancer;

    emit!(AddRebalancerEvent {
        rebalancer: rebalancer,
        admin: ctx.accounts.admin.key(),
    });

    msg!("{} was added as a Rebalancer", rebalancer.key());
    Ok(())
}
