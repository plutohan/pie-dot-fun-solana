use anchor_lang::prelude::*;

declare_id!("Cy12bgjZuJ4dkwfybQCSGhEomzysdBEyv8iihjqp7Ynb");

pub mod constant;
pub mod error;
pub mod instructions;
pub mod states;
pub mod utils;

use constant::*;
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

    pub fn create_basket(ctx: Context<CreateBasketContext>, args: CreateBasketArgs) -> Result<()> {
        instructions::create_basket(ctx, args)?;
        Ok(())
    }

    pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>) -> Result<()> {
        instructions::mint_basket_token(ctx)?;
        Ok(())
    }

    pub fn burn_basket_token(ctx: Context<RedeemContext>, amount: u64) -> Result<()> {
        instructions::redeem(ctx, amount)?;
        Ok(())
    }

    pub fn buy_component(
        ctx: Context<BuyComponentContext>,
        max_amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        instructions::buy_component(ctx, max_amount_in, amount_out)?;
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
    pub fn start_rebalancing(ctx: Context<StartRebalancing>) -> Result<()> {
        instructions::start_rebalancing(ctx)?;
        Ok(())
    }

    pub fn execute_rebalancing<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancing<'info>>,
        amount: u64,
        is_buy: bool,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::execute_rebalancing(ctx, amount, is_buy, minimum_amount_out)?;
        Ok(())
    }

    pub fn stop_rebalancing(ctx: Context<StopRebalancing>) -> Result<()> {
        instructions::stop_rebalancing(ctx)?;
        Ok(())
    }
}
