use anchor_lang::{prelude::*, solana_program::clock::Clock};

use crate::{error::PieError, BasketConfig, BASKET_CONFIG};

#[event]
pub struct StartRebalancingEvent {
    pub basket_id: u64,
    pub mint: Pubkey,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct StartRebalancing<'info> {
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

pub fn start_rebalancing(ctx: Context<StartRebalancing>) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    require!(!basket_config.is_rebalancing, PieError::AlreadyRebalancing);

    basket_config.is_rebalancing = true;

    let clock = Clock::get()?;

    emit!(StartRebalancingEvent {
        basket_id: basket_config.id,
        mint: ctx.accounts.basket_config.mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
