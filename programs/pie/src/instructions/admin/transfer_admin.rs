use anchor_lang::prelude::*;

use crate::{constant::CONFIG, error::PieError, get_current_admin, ProgramState};

#[derive(Accounts)]
pub struct TransferAdminContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [CONFIG],
        bump
    )]
    pub config: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

pub fn transfer_admin(ctx: Context<TransferAdminContext>, new_admin: Pubkey) -> Result<()> {
    let current_admin = get_current_admin(&ctx.accounts.config)?;

    if ctx.accounts.admin.key() != current_admin {
        return Err(PieError::Unauthorized.into());
    }

    ctx.accounts.config.admin = new_admin;

    msg!("Admin privileges transferred to: {}", new_admin.key());
    Ok(())
}
