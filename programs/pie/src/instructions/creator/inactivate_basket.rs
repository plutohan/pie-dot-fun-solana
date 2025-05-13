use anchor_lang::prelude::*;

use crate::{error::PieError, states::BasketState, BasketConfig, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
pub struct InactivateBasketContext<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        constraint = basket_config.creator == creator.key() @ PieError::Unauthorized
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
pub struct InactivateBasketEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
}

pub fn inactivate_basket(ctx: Context<InactivateBasketContext>) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    basket_config.state = BasketState::Inactive;

    emit!(InactivateBasketEvent {
        basket_id: basket_config.id,
        basket_mint: basket_config.mint,
    });

    Ok(())
}
