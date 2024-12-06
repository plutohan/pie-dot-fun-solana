use anchor_lang::prelude::*;

use crate::{
    constant::{PROGRAM_STATE, REBALANCER_STATE},
    error::PieError,
    ProgramState, RebalancerState,
};

#[derive(Accounts)]
#[instruction(rebalancer: Pubkey)]
pub struct DeleteRebalancer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [REBALANCER_STATE, rebalancer.as_ref()],
        bump,
        close = admin
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct DeleteRebalancerEvent {
    pub rebalancer: Pubkey,
    pub admin: Pubkey,
}

pub fn delete_rebalancer(ctx: Context<DeleteRebalancer>, rebalancer: Pubkey) -> Result<()> {
    if ctx.accounts.admin.key() != ctx.accounts.program_state.admin {
        return Err(PieError::Unauthorized.into());
    }

    if ctx.accounts.rebalancer_state.balancer != rebalancer {
        return Err(PieError::RebalancerNotFound.into());
    }

    let rebalancer_lamports = ctx.accounts.rebalancer_state.to_account_info().lamports();
    ctx.accounts.admin.add_lamports(rebalancer_lamports)?;
    ctx.accounts.rebalancer_state.sub_lamports(rebalancer_lamports)?;

    emit!(DeleteRebalancerEvent {
        rebalancer: ctx.accounts.rebalancer_state.key(),
        admin: ctx.accounts.admin.key(),
    });

    msg!(
        "Rebalancer {} has been removed and the account closed",
        rebalancer.key()
    );
    Ok(())
}
