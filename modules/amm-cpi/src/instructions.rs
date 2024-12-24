//! Instruction builders and invokers for AMM instructions.

use crate::*;
use anchor_lang::{prelude::*, solana_program};
use library::native_instrcutions;

/// Creates and invokes a [library::native_instrcutions::swap_base_in] instruction.
///
/// # Arguments
///
/// See [library::native_instrcutions::SwapInstructionBaseIn].
///
/// * `amount_in` - SOURCE amount to transfer, output to DESTINATION is based on the exchange rate.
/// * `minimum_amount_out` - Minimum amount of DESTINATION token to output, prevents excessive slippage.
pub fn swap_base_in<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, SwapBaseIn<'info>>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    let ix = native_instrcutions::swap_base_in(
        ctx.program.key,
        ctx.accounts.amm.key,
        ctx.accounts.amm_authority.key,
        ctx.accounts.amm_open_orders.key,
        ctx.accounts.amm_coin_vault.key,
        ctx.accounts.amm_pc_vault.key,
        ctx.accounts.market_program.key,
        ctx.accounts.market.key,
        ctx.accounts.market_bids.key,
        ctx.accounts.market_asks.key,
        ctx.accounts.market_event_queue.key,
        ctx.accounts.market_coin_vault.key,
        ctx.accounts.market_pc_vault.key,
        ctx.accounts.market_vault_signer.key,
        ctx.accounts.user_token_source.key,
        ctx.accounts.user_token_destination.key,
        ctx.accounts.user_source_owner.key,
        amount_in,
        minimum_amount_out,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
}

/// Creates and invokes a [library::native_instrcutions::swap_base_out] instruction.
///
/// # Arguments
///
/// See [library::native_instrcutions::SwapInstructionBaseOut].
///
/// * `max_amount_in` - SOURCE amount to transfer, output to DESTINATION is based on the exchange rate.
/// * `amount_out` - Minimum amount of DESTINATION token to output, prevents excessive slippage
pub fn swap_base_out<'a, 'b, 'c, 'info>(
    ctx: CpiContext<'a, 'b, 'c, 'info, SwapBaseOut<'info>>,
    max_amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    let ix = native_instrcutions::swap_base_out(
        ctx.program.key,
        ctx.accounts.amm.key,
        ctx.accounts.amm_authority.key,
        ctx.accounts.amm_open_orders.key,
        ctx.accounts.amm_coin_vault.key,
        ctx.accounts.amm_pc_vault.key,
        ctx.accounts.market_program.key,
        ctx.accounts.market.key,
        ctx.accounts.market_bids.key,
        ctx.accounts.market_asks.key,
        ctx.accounts.market_event_queue.key,
        ctx.accounts.market_coin_vault.key,
        ctx.accounts.market_pc_vault.key,
        ctx.accounts.market_vault_signer.key,
        ctx.accounts.user_token_source.key,
        ctx.accounts.user_token_destination.key,
        ctx.accounts.user_source_owner.key,
        max_amount_in,
        amount_out,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
}
