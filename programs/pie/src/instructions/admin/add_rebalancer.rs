use anchor_lang::prelude::*;

use crate::{constant::{ADMIN_STATE, REBALANCER_STATE}, error::PieError, get_current_admin, ProgramState, RebalancerState};

#[derive(Accounts)]
#[instruction(rebalancer: Pubkey)]
pub struct AddRebalancer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32,
        seeds = [REBALANCER_STATE, rebalancer.as_ref()],
        bump
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,

    #[account(
        mut,
        seeds = [ADMIN_STATE],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

pub fn add_rebalancer(ctx: Context<AddRebalancer>, rebalancer: Pubkey) -> Result<()> {
    let current_admin = get_current_admin(&ctx.accounts.config)?;

    if ctx.accounts.admin.key() != current_admin {
        return Err(PieError::Unauthorized.into());
    }

    ctx.accounts.rebalancer_state.balancer = rebalancer;

    msg!("{} was added as a Rebalancer", rebalancer.key());
    Ok(())
}
