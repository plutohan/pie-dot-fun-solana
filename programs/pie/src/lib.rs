use anchor_lang::prelude::*;

declare_id!("zGubRGyhaSNJuoT8kK3yAJwBAZBb2PfBHvjAKNGrE8x");

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

    pub fn update_rebalancer(
        ctx: Context<UpdateRebalancerContext>,
        new_rebalancer: Pubkey,
    ) -> Result<()> {
        instructions::update_rebalancer(ctx, new_rebalancer)?;
        Ok(())
    }

    pub fn update_rebalance_margin(
        ctx: Context<UpdateRebalanceMarginContext>,
        new_margin: u64,
    ) -> Result<()> {
        instructions::update_rebalance_margin(ctx, new_margin)?;
        Ok(())
    }

    pub fn update_platform_fee_wallet(
        ctx: Context<UpdatePlatformFeeWalletContext>,
        new_platform_fee_wallet: Pubkey,
    ) -> Result<()> {
        instructions::update_platform_fee_wallet(ctx, new_platform_fee_wallet)?;
        Ok(())
    }

    pub fn update_fee(
        ctx: Context<UpdateFeeContext>,
        new_creator_fee_percentage: Option<u64>,
        new_platform_fee_percentage: Option<u64>,
    ) -> Result<()> {
        instructions::update_fee(ctx, new_creator_fee_percentage, new_platform_fee_percentage)?;
        Ok(())
    }

    pub fn create_basket(ctx: Context<CreateBasketContext>, args: CreateBasketArgs) -> Result<()> {
        instructions::create_basket(ctx, args)?;
        Ok(())
    }

    pub fn mint_basket_token(ctx: Context<MintBasketTokenContext>, amount: u64) -> Result<()> {
        instructions::mint_basket_token(ctx, amount)?;
        Ok(())
    }

    pub fn redeem_basket_token(ctx: Context<RedeemBasketTokenContext>, amount: u64) -> Result<()> {
        instructions::redeem_basket_token(ctx, amount)?;
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
        is_buy: bool,
        amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        instructions::execute_rebalancing(ctx, is_buy, amount_in, amount_out)?;
        Ok(())
    }

    pub fn stop_rebalancing(ctx: Context<StopRebalancing>) -> Result<()> {
        instructions::stop_rebalancing(ctx)?;
        Ok(())
    }
}
