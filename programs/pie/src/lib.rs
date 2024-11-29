use anchor_lang::prelude::*;

declare_id!("GkkuKbHCeiUZQX4yGpDqQktfG92WSdjRiP7nqkh9gG9W");

pub mod constant;
pub mod error;
pub mod helper;
pub mod instructions;
pub mod states;

use helper::*;
use instructions::*;
use states::*;

#[program]
pub mod pie {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)?;
        Ok(())
    }

    pub fn transfer_admin(ctx: Context<TransferAdminContext>, new_admin: Pubkey) -> Result<()> {
        instructions::transfer_admin(ctx, new_admin)?;
        Ok(())
    }

    pub fn add_rebalancer(ctx: Context<AddRebalancer>, rebalancer: Pubkey) -> Result<()> {
        instructions::add_rebalancer(ctx, rebalancer)?;
        Ok(())
    }

    pub fn delete_rebalancer(ctx: Context<DeleteRebalancer>, rebalancer: Pubkey) -> Result<()> {
        instructions::delete_rebalancer(ctx, rebalancer)?;
        Ok(())
    }

    pub fn create_index_fund_vault(ctx: Context<CreateIndexFundVault>, underly_assets: Vec<Component>) -> Result<()> {
        instructions::create_index_fund_vault(ctx, underly_assets)?;
        Ok(())
    }

    pub fn swap_underly_asset(
        ctx: Context<SwapUnderlyAsset>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::swap_underly_asset(ctx, amount_in, minimum_amount_out)?;
        Ok(())
    }
}
