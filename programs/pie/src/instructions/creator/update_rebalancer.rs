use anchor_lang::prelude::*;

use crate::states::BasketConfig;
use crate::{error::PieError, BASKET_CONFIG};

#[derive(Accounts)]
pub struct UpdateRebalancerContext<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump,
        constraint = basket_config.creator == creator.key() @ PieError::Unauthorized
    )]
    pub basket_config: Account<'info, BasketConfig>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct UpdateRebalancerEvent {
    pub basket_id: u64,
    pub old_rebalancer: Pubkey,
    pub new_rebalancer: Pubkey,
}

pub fn update_rebalancer(
    ctx: Context<UpdateRebalancerContext>,
    new_rebalancer: Pubkey,
) -> Result<()> {
    require!(
        ctx.accounts.creator.key() == ctx.accounts.basket_config.creator,
        PieError::Unauthorized
    );

    ctx.accounts.basket_config.rebalancer = new_rebalancer;

    emit!(UpdateRebalancerEvent {
        basket_id: ctx.accounts.basket_config.id,
        old_rebalancer: ctx.accounts.basket_config.rebalancer.key(),
        new_rebalancer,
    });
    Ok(())
}
