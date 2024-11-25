use anchor_lang::prelude::*;
use std::str::FromStr;

declare_id!("3DpBbvPMtKaDkHnP3FEKfvWBAYWT9LywfN3g8z27YwNf");

const INITIALIZE_ADMIN: &str = "";

#[program]
pub mod pie {
    use super::*;

    pub fn transfer_admin(ctx: Context<TransferAdminContext>, new_admin: Pubkey) -> Result<()> {
        let current_admin = get_current_admin(&ctx.accounts.admin_state)?;

        if ctx.accounts.admin.key() != current_admin {
            return Err(PieError::Unauthorized.into());
        }

        ctx.accounts.admin_state.admin = new_admin;

        msg!("Admin privileges transferred to: {}", new_admin.key());
        Ok(())
    }

    pub fn add_rebalancer(ctx: Context<AddRebalancerContext>, rebalancer: Pubkey) -> Result<()> {
        Ok(())
    }

    pub fn delete_rebalancer(ctx: Context<DeleteRebalancerContext>, rebalancer: Pubkey) -> Result<()> {
        Ok(())
    }
}

fn get_current_admin(program_state: &Account<AdminState>) -> Result<Pubkey> {
    if program_state.admin == Pubkey::default() {
        Ok(Pubkey::from_str(INITIALIZE_ADMIN).unwrap())
    } else {
        Ok(program_state.admin)
    }
}

#[account]
pub struct AdminState {
    pub admin: Pubkey,
}

#[account]
pub struct RebalancerState {
    pub balancer: Pubkey,
}

#[derive(Accounts)]
pub struct TransferAdminContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32,
        seeds = [b"admin_state"],
        bump
    )]
    pub admin_state: Account<'info, AdminState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddRebalancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32,
        seeds = [b"rebalancer_state", rebalancer.key().as_ref()],
        bump
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub rebalancer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteRebalancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub rebalancer_state: Account<'info, RebalancerState>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum PieError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
