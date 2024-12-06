use anchor_lang::prelude::*;
use anchor_spl::{token::TokenAccount, token_interface::Mint};

use crate::{
    error::PieError, BasketConfig, ProgramState, RebalancerState, PROGRAM_STATE,
    REBALANCER_STATE,
};

#[event]
pub struct StopRebalancingEvent {
    pub mint: Pubkey,
    pub components: Vec<Component>,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct StopRebalancing<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(
        seeds = [REBALANCER_STATE, rebalancer.key().as_ref()],
        bump,
        constraint = rebalancer_state.balancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub rebalancer_state: Box<Account<'info, RebalancerState>>,

    #[account(
        mut,
        token::mint = wrapped_sol_mint,
        token::authority = basket_config,
    )]
    pub vault_wrapped_sol: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub wrapped_sol_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub basket_config: Box<Account<'info, BasketConfig>>,
}

pub fn stop_rebalancing(ctx: Context<StopRebalancing>) -> Result<()> {
    let program_state = &mut ctx.accounts.program_state;
    let basket_config = &mut ctx.accounts.basket_config;
    require!(!basket_config.is_rebalancing, PieError::AlreadyRebalancing);

    let wrapped_sol_balance = ctx.accounts.vault_wrapped_sol.amount;

    if wrapped_sol_balance < program_state.max_rebalance_margin_lamports {
        basket_config.is_rebalancing = false;
        emit!(StopRebalancingEvent {
            mint: ctx.accounts.basket_config.mint,
            components: ctx.accounts.basket_config.components.clone(),
            timestamp: Clock::get()?.unix_timestamp,
        });
    }

    Ok(())
}
