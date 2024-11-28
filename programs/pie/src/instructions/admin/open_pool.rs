use anchor_lang::prelude::*;

use crate::{error::PieError, Config, PoolConfig, TokenConfig};

#[derive(Accounts)]
pub struct OpenPool<'info> {
    #[account(
      mut,
      constraint = config.admin.key() == admin.key() @PieError::Unauthorized
    )]
    pub admin: Signer<'info>,
    #[account(
      mut,
      seeds = [b"config"],
      bump
    )]
    pub config: Account<'info, Config>,
    #[account(
      init,
      payer = admin,
      space = PoolConfig::INIT_SPACE,
      seeds = [b"pool", &config.counter.to_le_bytes()],
      bump
  )]
    pub pool: Account<'info, PoolConfig>,

    pub system_program: Program<'info, System>,
}

pub fn open_pool(ctx: Context<OpenPool>, token_configs: Vec<TokenConfig>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let config = &mut ctx.accounts.config;

    pool.pool_id = config.counter;
    pool.token_configs = token_configs;

    config.counter += 1;

    Ok(())
}
