use anchor_lang::prelude::*;

use crate::{
    constant::{PROGRAM_STATE, CREATOR_STATE},
    error::PieError,
    get_current_admin, ProgramState, CreatorState,
};

#[derive(Accounts)]
#[instruction(creator: Pubkey)]
pub struct DeleteCreator<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CREATOR_STATE, creator.as_ref()],
        bump
    )]
    pub creator_state: Account<'info, CreatorState>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    pub system_program: Program<'info, System>,
}

pub fn delete_creator(ctx: Context<DeleteCreator>, creator: Pubkey) -> Result<()> {
    let current_admin = get_current_admin(&ctx.accounts.program_state)?;

    if ctx.accounts.admin.key() != current_admin {
        return Err(PieError::Unauthorized.into());
    }

    let creator_lamports = ctx.accounts.creator_state.to_account_info().lamports();
    **ctx.accounts.admin.to_account_info().lamports.borrow_mut() += creator_lamports;

    ctx.accounts
        .creator_state
        .close(ctx.accounts.admin.to_account_info())?;

    msg!(
        "Creator {} has been removed and the account closed",
        creator.key()
    );
    Ok(())
} 