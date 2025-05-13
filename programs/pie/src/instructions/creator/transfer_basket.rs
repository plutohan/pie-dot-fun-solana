use anchor_lang::prelude::*;

use crate::{error::PieError, BasketConfig, ProgramState, PROGRAM_STATE};

#[derive(Accounts)]
#[instruction(new_creator: Pubkey)]
pub struct TransferBasketContext<'info> {
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
pub struct TransferBasketEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub old_creator: Pubkey,
    pub new_creator: Pubkey,
}

pub fn transfer_basket(ctx: Context<TransferBasketContext>, new_creator: Pubkey) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    let old_creator = basket_config.creator;
    basket_config.creator = new_creator;

    emit!(TransferBasketEvent {
        basket_id: basket_config.id,
        basket_mint: basket_config.mint,
        old_creator,
        new_creator,
    });

    Ok(())
}
