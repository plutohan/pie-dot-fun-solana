use crate::{constant::PROGRAM_STATE, error::PieError, ProgramState, MAX_WHITELISTED_CREATORS};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateWhitelistedCreatorsContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump,
        constraint = program_state.admin == admin.key() @ PieError::Unauthorized
    )]
    pub program_state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct UpdateWhitelistedCreatorsEvent {
    pub old_whitelisted_creators: Vec<Pubkey>,
    pub new_whitelisted_creators: Vec<Pubkey>,
}

pub fn update_whitelisted_creators(
    ctx: Context<UpdateWhitelistedCreatorsContext>,
    new_whitelisted_creators: Vec<Pubkey>,
) -> Result<()> {
    let old_whitelisted_creators = ctx.accounts.program_state.whitelisted_creators.clone();
    ctx.accounts.program_state.whitelisted_creators = new_whitelisted_creators;

    require!(
        ctx.accounts.program_state.whitelisted_creators.len() <= MAX_WHITELISTED_CREATORS as usize,
        PieError::MaxWhitelistedCreatorsExceeded
    );

    emit!(UpdateWhitelistedCreatorsEvent {
        old_whitelisted_creators,
        new_whitelisted_creators: ctx.accounts.program_state.whitelisted_creators.clone(),
    });

    Ok(())
}
