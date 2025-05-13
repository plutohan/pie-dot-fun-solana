use anchor_lang::prelude::*;

use crate::{
    constant::PROGRAM_STATE, error::PieError, states::RebalanceType, BasketConfig, ProgramState,
};

#[derive(Accounts)]
pub struct MigrateBasketContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump,
        constraint = program_state.admin == admin.key() @ PieError::Unauthorized
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(mut)]
    pub basket_config: Account<'info, BasketConfig>,

    pub system_program: Program<'info, System>,
}

pub fn migrate_basket(ctx: Context<MigrateBasketContext>) -> Result<()> {
    let basket = &mut ctx.accounts.basket_config;

    // @TODO: Set the correct number for Production
    if basket.id < 27 {
        basket.rebalance_type = RebalanceType::Dynamic;
        basket.creator_fee_bp = 50;
        basket.version = 2;
        basket.reserved = [0; 10];
    }

    Ok(())
}
