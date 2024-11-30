use anchor_lang::prelude::*;

use crate::{
    constant::{ADMIN_STATE, CREATOR_STATE},
    error::PieError,
    get_current_admin, CreatorState, ProgramState,
};

#[derive(Accounts)]
#[instruction(creator: Pubkey)]
pub struct AddCreator<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = CreatorState::INIT_SPACE,
        seeds = [CREATOR_STATE, creator.as_ref()],
        bump
    )]
    pub creator_state: Account<'info, CreatorState>,
    #[account(
        mut,
        seeds = [ADMIN_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

pub fn add_creator(ctx: Context<AddCreator>, creator: Pubkey) -> Result<()> {
    let current_admin = get_current_admin(&ctx.accounts.program_state)?;

    if ctx.accounts.admin.key() != current_admin {
        return Err(PieError::Unauthorized.into());
    }

    ctx.accounts.creator_state.creator = creator;

    msg!("{} was added as a Creator", creator.key());
    Ok(())
}
