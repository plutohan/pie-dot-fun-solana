use anchor_lang::prelude::*;

use crate::{constant::USER_BALANCE, UserBalance};

#[derive(Accounts)]
pub struct InitializeUserBalanceContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserBalance::INIT_SPACE,
        seeds = [USER_BALANCE, user.key().as_ref()],
        bump
    )]
    pub user_balance: Box<Account<'info, UserBalance>>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_user_balance(ctx: Context<InitializeUserBalanceContext>) -> Result<()> {
    let user_balance = &mut ctx.accounts.user_balance;
    user_balance.bump = ctx.bumps.user_balance;
    user_balance.balances = vec![];

    Ok(())
}
