use anchor_lang::prelude::*;
use std::str::FromStr;

declare_id!("GkkuKbHCeiUZQX4yGpDqQktfG92WSdjRiP7nqkh9gG9W");

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
        let current_admin = get_current_admin(&ctx.accounts.admin_state)?;

        if ctx.accounts.admin.key() != current_admin {
            return Err(PieError::Unauthorized.into());
        }

        ctx.accounts.rebalancer_state.balancer = rebalancer;

        msg!("{} was added as a Rebalancer", rebalancer.key());
        Ok(())
    }

    pub fn delete_rebalancer(ctx: Context<DeleteRebalancerContext>, rebalancer: Pubkey) -> Result<()> {
        let current_admin = get_current_admin(&ctx.accounts.admin_state)?;

        if ctx.accounts.admin.key() != current_admin {
            return Err(PieError::Unauthorized.into());
        }

        if ctx.accounts.rebalancer_state.balancer != rebalancer {
            return Err(PieError::RebalancerNotFound.into());
        }

        let rebalancer_lamports = ctx.accounts.rebalancer_state.to_account_info().lamports();
        **ctx.accounts.admin.to_account_info().lamports.borrow_mut() += rebalancer_lamports;

        ctx.accounts.rebalancer_state.close(ctx.accounts.admin.to_account_info())?;

        msg!("Rebalancer {} has been removed and the account closed", rebalancer.key());
        Ok(())
    }
}

fn get_current_admin(program_state: &Account<AdminState>) -> Result<Pubkey> {
    if program_state.to_account_info().data_is_empty() {
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
#[instruction(rebalancer: Pubkey)]
pub struct AddRebalancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + 32,
        seeds = [b"rebalancer_state", rebalancer.as_ref()],
        bump
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,

    #[account(
        mut,
        seeds = [b"admin_state"],
        bump
    )]
    pub admin_state: Account<'info, AdminState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(rebalancer: Pubkey)]
pub struct DeleteRebalancerContext<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"rebalancer_state", rebalancer.as_ref()],
        bump
    )]
    pub rebalancer_state: Account<'info, RebalancerState>,

    #[account(
        mut,
        seeds = [b"admin_state"],
        bump
    )]
    pub admin_state: Account<'info, AdminState>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum PieError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,

    #[msg("Can't found rebalancer info.")]
    RebalancerNotFound,
}
