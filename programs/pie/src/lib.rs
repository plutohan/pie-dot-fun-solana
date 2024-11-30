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

    pub fn add_creator(ctx: Context<AddCreator>, creator: Pubkey) -> Result<()> {
        instructions::add_creator(ctx, creator)?;
        Ok(())
    }

    pub fn delete_creator(ctx: Context<DeleteCreator>, creator: Pubkey) -> Result<()> {
        instructions::delete_creator(ctx, creator)?;
        Ok(())
    }

    pub fn create_basket(
        ctx: Context<CreateBasketContext>,
        components: Vec<Component>,
    ) -> Result<()> {
        instructions::create_basket(ctx, components)?;
        Ok(())
    }

    pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>) -> Result<()> {
        instructions::mint_basket_token(ctx)?;
        Ok(())
    }

    pub fn burn_basket_token(ctx: Context<BurnBasketTokenContext>, amount: u64) -> Result<()> {
        instructions::burn_basket_token(ctx, amount)?;
        Ok(())
    }

    pub fn buy_component(
        ctx: Context<BuyComponentContext>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::buy_component(ctx, amount_in, minimum_amount_out)?;
        Ok(())
    }

    pub fn sell_component(
        ctx: Context<SellComponentContext>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::sell_component(ctx, amount_in, minimum_amount_out)?;
        Ok(())
    }
}
