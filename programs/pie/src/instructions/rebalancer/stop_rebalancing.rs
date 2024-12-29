use anchor_lang::prelude::*;
use anchor_spl::{token::TokenAccount, token_interface::Mint};

use crate::{
    error::PieError, BasketComponent, BasketConfig, BASKET_CONFIG, NATIVE_MINT
};

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
        token::mint = wrapped_sol_mint,
        token::authority = basket_config,
    )]
    pub vault_wrapped_sol: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        address = NATIVE_MINT
    )]
    pub wrapped_sol_mint: Box<InterfaceAccount<'info, Mint>>,

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
