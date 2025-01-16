use anchor_lang::prelude::*;

declare_id!("QA12DT3Hhf9Bngfox4zgctb7129VQUnuCtMK7mB9B1h");

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

    // Admin
    pub fn initialize(
        ctx: Context<Initialize>,
        initial_admin: Pubkey,
        initial_creator: Pubkey,
        initial_platform_fee_wallet: Pubkey,
        initial_platform_fee_percentage: u64,
    ) -> Result<()> {
        instructions::initialize(
            ctx,
            initial_admin,
            initial_creator,
            initial_platform_fee_wallet,
            initial_platform_fee_percentage,
        )?;
        Ok(())
    }

    pub fn transfer_admin(ctx: Context<TransferAdminContext>, new_admin: Pubkey) -> Result<()> {
        instructions::transfer_admin(ctx, new_admin)?;
        Ok(())
    }

    pub fn update_fee(
        ctx: Context<UpdateFeeContext>,
        new_creator_fee_percentage: u64,
        new_platform_fee_percentage: u64,
    ) -> Result<()> {
        instructions::update_fee(ctx, new_creator_fee_percentage, new_platform_fee_percentage)?;
        Ok(())
    }

    pub fn update_platform_fee_wallet(
        ctx: Context<UpdatePlatformFeeWalletContext>,
        new_platform_fee_wallet: Pubkey,
    ) -> Result<()> {
        instructions::update_platform_fee_wallet(ctx, new_platform_fee_wallet)?;
        Ok(())
    }

    pub fn update_whitelisted_creators(
        ctx: Context<UpdateWhitelistedCreatorsContext>,
        new_whitelisted_creators: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::update_whitelisted_creators(ctx, new_whitelisted_creators)?;
        Ok(())
    }

    // Creator
    pub fn create_basket(ctx: Context<CreateBasketContext>, args: CreateBasketArgs) -> Result<()> {
        instructions::create_basket(ctx, args)?;
        Ok(())
    }

    pub fn transfer_basket(ctx: Context<TransferBasketContext>, new_creator: Pubkey) -> Result<()> {
        instructions::transfer_basket(ctx, new_creator)?;
        Ok(())
    }

    pub fn update_rebalancer(
        ctx: Context<UpdateRebalancerContext>,
        new_rebalancer: Pubkey,
    ) -> Result<()> {
        instructions::update_rebalancer(ctx, new_rebalancer)?;
        Ok(())
    }

    // Rebalancer

    pub fn start_rebalancing(ctx: Context<StartRebalancing>) -> Result<()> {
        instructions::start_rebalancing(ctx)?;
        Ok(())
    }

    pub fn execute_rebalancing<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancing<'info>>,
        is_swap_base_out: bool,
        amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        instructions::execute_rebalancing(ctx, is_swap_base_out, amount_in, amount_out)?;
        Ok(())
    }

    pub fn execute_rebalancing_cpmm<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<ExecuteRebalancingCpmm>,
        is_swap_base_out: bool,
        amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        instructions::execute_rebalancing_cpmm(ctx, is_swap_base_out, amount_in, amount_out)?;
        Ok(())
    }

    pub fn execute_rebalancing_clmm<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancingClmm<'info>>,
        is_swap_base_out: bool,
        amount: u64,
        other_amount_threshold: u64,
        sqrt_price_limit_x64: u128,
    ) -> Result<()> {
        instructions::execute_rebalancing_clmm(
            ctx,
            is_swap_base_out,
            amount,
            other_amount_threshold,
            sqrt_price_limit_x64,
        )?;
        Ok(())
    }

    pub fn stop_rebalancing(ctx: Context<StopRebalancing>) -> Result<()> {
        instructions::stop_rebalancing(ctx)?;
        Ok(())
    }

    // User
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

    pub fn buy_component_cpmm(
        ctx: Context<BuyComponentCpmm>,
        max_amount_in: u64,
        amount_out: u64,
    ) -> Result<()> {
        instructions::buy_component_cpmm(ctx, max_amount_in, amount_out)?;
        Ok(())
    }

    pub fn buy_component_clmm<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BuyComponentClmm<'info>>,
        amount: u64,
        other_amount_threshold: u64,
        sqrt_price_limit_x64: u128,
    ) -> Result<()> {
        instructions::buy_component_clmm(
            ctx,
            amount,
            other_amount_threshold,
            sqrt_price_limit_x64,
        )?;
        Ok(())
    }

    pub fn deposit_wsol(ctx: Context<DepositWsol>, amount: u64) -> Result<()> {
        instructions::deposit_wsol(ctx, amount)?;
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

    pub fn sell_component_cpmm(
        ctx: Context<SellComponentCpmm>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        instructions::sell_component_cpmm(ctx, amount_in, minimum_amount_out)?;
        Ok(())
    }

    pub fn sell_component_clmm<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SellComponentClmm<'info>>,
        amount: u64,
        other_amount_threshold: u64,
        sqrt_price_limit_x64: u128,
    ) -> Result<()> {
        instructions::sell_component_clmm(
            ctx,
            amount,
            other_amount_threshold,
            sqrt_price_limit_x64,
        )?;
        Ok(())
    }

    pub fn withdraw_wsol(ctx: Context<WithdrawWsol>, amount: u64) -> Result<()> {
        instructions::withdraw_wsol(ctx, amount)?;
        Ok(())
    }
}
