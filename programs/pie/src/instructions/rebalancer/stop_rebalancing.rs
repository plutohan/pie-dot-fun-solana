use anchor_lang::prelude::*;

use crate::{error::PieError, BasketComponent, BasketConfig, BASKET_CONFIG};

#[event]
pub struct StopRebalancingEvent {
    pub basket_id: u64,
    pub mint: Pubkey,
    pub components: Vec<BasketComponent>,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct StopRebalancing<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,

    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump = basket_config.bump,
        constraint = basket_config.rebalancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,
}

pub fn stop_rebalancing(ctx: Context<StopRebalancing>) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    require!(basket_config.is_rebalancing, PieError::NotInRebalancing);

    basket_config.is_rebalancing = false;

    emit!(StopRebalancingEvent {
        basket_id: ctx.accounts.basket_config.id,
        mint: ctx.accounts.basket_config.mint,
        components: ctx.accounts.basket_config.components.clone(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
