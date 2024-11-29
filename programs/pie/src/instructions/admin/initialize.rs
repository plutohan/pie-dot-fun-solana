use anchor_lang::prelude::*;

use crate::{constant::CONFIG, ProgramState};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 2 + 1,
        seeds = [CONFIG],
        bump
    )]
    pub config: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.config.bump = ctx.bumps.config;
    ctx.accounts.config.admin = ctx.accounts.admin.key();
    ctx.accounts.config.basket_counter = 0;

    Ok(())
}
