use anchor_lang::prelude::*;

use crate::{error::PieError, states::BasketState, BasketConfig, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
pub struct DisableBasketContext<'info> {
    #[account(mut)]
    pub current_creator: Signer<'info>,
    #[account(
        mut,
        constraint = basket_config.creator == current_creator.key() @ PieError::Unauthorized
    )]
    pub basket_config: Account<'info, BasketConfig>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,
}

#[event]
pub struct DisableBasketEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
}

pub fn disable_basket(ctx: Context<DisableBasketContext>) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    basket_config.state = BasketState::Disabled;

    emit!(DisableBasketEvent {
        basket_id: basket_config.id,
        basket_mint: basket_config.mint,
    });

    Ok(())
}
