use crate::{constant::PROGRAM_STATE, error::PieError, ProgramState};
use anchor_lang::prelude::*;

use crate::BasketConfig;

pub fn migrate_basket_config_is_component_fixed(ctx: Context<MigrateBasketConfig>, is_component_fixed: bool) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;

    // 새로운 필드 초기화
    basket_config.is_component_fixed = is_component_fixed;

    Ok(())
}

#[derive(Accounts)]
pub struct MigrateBasketConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump,
        constraint = program_state.admin == admin.key() @ PieError::Unauthorized
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(
        mut,
    )]
    pub basket_config: Account<'info, BasketConfig>,
}