use anchor_lang::prelude::*;

use crate::{
    constant::{CONFIG, REBALANCER_STATE},
    error::PieError,
    get_current_admin, ProgramState, RebalancerState,
};

#[derive(Accounts)]
#[instruction(rebalancer: Pubkey)]
pub struct DeleteRebalancer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [REBALANCER_STATE, rebalancer.as_ref()],
        bump
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,

    #[account(
        mut,
        seeds = [CONFIG],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramState>,

    pub system_program: Program<'info, System>,
}

pub fn delete_rebalancer(ctx: Context<DeleteRebalancer>, rebalancer: Pubkey) -> Result<()> {
    let current_admin = get_current_admin(&ctx.accounts.config)?;

    if ctx.accounts.admin.key() != current_admin {
        return Err(PieError::Unauthorized.into());
    }

    if ctx.accounts.rebalancer_state.balancer != rebalancer {
        return Err(PieError::RebalancerNotFound.into());
    }

    let rebalancer_lamports = ctx.accounts.rebalancer_state.to_account_info().lamports();
    **ctx.accounts.admin.to_account_info().lamports.borrow_mut() += rebalancer_lamports;

    ctx.accounts
        .rebalancer_state
        .close(ctx.accounts.admin.to_account_info())?;

    msg!(
        "Rebalancer {} has been removed and the account closed",
        rebalancer.key()
    );
    Ok(())
}
