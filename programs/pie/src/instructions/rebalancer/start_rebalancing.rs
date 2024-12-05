use anchor_lang::{prelude::*, solana_program::clock::Clock};

use crate::{error::PieError, BasketConfig, RebalancerState, PROGRAM_STATE, REBALANCER_STATE};

#[event]
pub struct StartRebalancingEvent {
    pub mint: Pubkey,
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

    #[account(mut)]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    pub system_program: Program<'info, System>,
}

pub fn start_rebalancing(ctx: Context<StartRebalancing>) -> Result<()> {
    // Check if already rebalancing
    let basket_config = &mut ctx.accounts.basket_config;
    require!(!basket_config.is_rebalancing, PieError::AlreadyRebalancing);

    // Set rebalancing state to true
    basket_config.is_rebalancing = true;

    // Get current timestamp
    let clock = Clock::get()?;

    emit!(StartRebalancingEvent {
        mint: ctx.accounts.basket_config.mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
