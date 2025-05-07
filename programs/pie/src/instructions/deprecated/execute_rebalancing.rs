use crate::utils::Rebalance;
use crate::{error::PieError, BasketConfig, BASKET_CONFIG};
use anchor_lang::{prelude::*, solana_program};
use anchor_spl::token_interface::TokenAccount;
use anchor_spl::{token::Token, token_interface::Mint};
use raydium_amm_cpi::program::RaydiumAmm;
use raydium_amm_cpi::{
    library::{swap_base_in, swap_base_out},
    SwapBaseIn, SwapBaseOut,
};

#[derive(Accounts)]
pub struct ExecuteRebalancing<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,
    #[account(
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump = basket_config.bump,
        constraint = basket_config.rebalancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub basket_config: Account<'info, BasketConfig>,
    #[account(
        mut,
        address = basket_config.mint
    )]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,
    // Raydium AMM accounts
    /// CHECK: Raydium AMM account
    #[account(mut)]
    pub amm: AccountInfo<'info>,
    /// CHECK: Amm authority Account
    pub amm_authority: AccountInfo<'info>,
    /// CHECK: amm open_orders Account
    #[account(mut)]
    pub amm_open_orders: AccountInfo<'info>,
    /// CHECK: amm_coin_vault Account
    #[account(mut)]
    pub amm_coin_vault: AccountInfo<'info>,
    /// CHECK: amm_pc_vault Account
    #[account(mut)]
    pub amm_pc_vault: AccountInfo<'info>,
    /// CHECK: OpenBook program id
    pub market_program: AccountInfo<'info>,
    /// CHECK: OpenBook market Account
    #[account(mut)]
    pub market: AccountInfo<'info>,
    /// CHECK: bids Account
    #[account(mut)]
    pub market_bids: AccountInfo<'info>,
    /// CHECK: asks Account
    #[account(mut)]
    pub market_asks: AccountInfo<'info>,
    /// CHECK: event_q Account
    #[account(mut)]
    pub market_event_queue: AccountInfo<'info>,
    /// CHECK: coin_vault Account
    #[account(mut)]
    pub market_coin_vault: AccountInfo<'info>,
    /// CHECK: pc_vault Account
    #[account(mut)]
    pub market_pc_vault: AccountInfo<'info>,
    /// CHECK: vault_signer Account
    pub market_vault_signer: AccountInfo<'info>,

    #[account(
        address = vault_token_source.mint
    )]
    pub vault_token_source_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_source_mint,
    )]
    pub vault_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = vault_token_destination.mint
    )]
    pub vault_token_destination_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_destination_mint,
    )]
    pub vault_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,

    pub amm_program: Program<'info, RaydiumAmm>,
}

#[event]
pub struct ExecuteRebalancingEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub is_swap_base_out: bool,
    pub initial_available_source_balance: u64,
    pub initial_available_destination_balance: u64,
    pub final_available_source_balance: u64,
    pub final_available_destination_balance: u64,
}

pub fn execute_rebalancing<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancing<'info>>,
    is_swap_base_out: bool,
    amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    require!(
        ctx.accounts.basket_config.is_rebalancing,
        PieError::NotInRebalancing
    );

    let basket_total_supply = ctx.accounts.basket_mint.supply;
    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    let (
        initial_available_source_balance,
        initial_available_destination_balance,
        unminted_source_balance,
        unminted_destination_balance,
    ) = Rebalance::calculate_initial_balances(
        &mut ctx.accounts.basket_config,
        ctx.accounts.vault_token_source.as_ref(),
        ctx.accounts.vault_token_destination.as_ref(),
        basket_total_supply,
        amount_in,
    )?;

    execute_swap(
        &ctx.accounts,
        is_swap_base_out,
        amount_in,
        amount_out,
        signer,
    )?;

    let (final_available_source_balance, final_available_destination_balance) =
        Rebalance::calculate_final_balances(
            &mut ctx.accounts.vault_token_source,
            &mut ctx.accounts.vault_token_destination,
            unminted_source_balance,
            unminted_destination_balance,
        )?;

    // remove input component if final available balance is 0
    if final_available_source_balance == 0 {
        ctx.accounts
            .basket_config
            .remove_component(ctx.accounts.vault_token_source.mint);
    } else {
        ctx.accounts.basket_config.upsert_component(
            ctx.accounts.vault_token_source.mint,
            final_available_source_balance,
            basket_total_supply,
        )?;
    }

    ctx.accounts.basket_config.upsert_component(
        ctx.accounts.vault_token_destination.mint,
        final_available_destination_balance,
        basket_total_supply,
    )?;

    emit!(ExecuteRebalancingEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_mint.key(),
        input_mint: ctx.accounts.vault_token_source.mint,
        output_mint: ctx.accounts.vault_token_destination.mint,
        is_swap_base_out,
        initial_available_source_balance,
        initial_available_destination_balance,
        final_available_source_balance,
        final_available_destination_balance,
    });

    Ok(())
}

pub fn execute_swap<'a: 'info, 'info>(
    accounts: &ExecuteRebalancing<'info>,
    is_swap_base_out: bool,
    amount_in: u64,
    amount_out: u64,
    signer: &[&[&[u8]]],
) -> Result<()> {
    let basket_config = &accounts.basket_config;

    if is_swap_base_out {
        let swap_base_out_inx = swap_base_out(
            &accounts.amm_program.key(),
            &accounts.amm.key(),
            &accounts.amm_authority.key(),
            &accounts.amm_open_orders.key(),
            &accounts.amm_coin_vault.key(),
            &accounts.amm_pc_vault.key(),
            &accounts.market_program.key(),
            &accounts.market.key(),
            &accounts.market_bids.key(),
            &accounts.market_asks.key(),
            &accounts.market_event_queue.key(),
            &accounts.market_coin_vault.key(),
            &accounts.market_pc_vault.key(),
            &accounts.market_vault_signer.key(),
            &accounts.vault_token_source.key(),
            &accounts.vault_token_destination.key(),
            &basket_config.key(),
            amount_in,
            amount_out,
        )?;

        let cpi_context = CpiContext::new_with_signer(
            accounts.amm_program.to_account_info(),
            SwapBaseOut {
                amm: accounts.amm.to_account_info(),
                amm_authority: accounts.amm_authority.to_account_info(),
                amm_open_orders: accounts.amm_open_orders.to_account_info(),
                amm_coin_vault: accounts.amm_coin_vault.to_account_info(),
                amm_pc_vault: accounts.amm_pc_vault.to_account_info(),
                market_program: accounts.market_program.to_account_info(),
                market: accounts.market.to_account_info(),
                market_bids: accounts.market_bids.to_account_info(),
                market_asks: accounts.market_asks.to_account_info(),
                market_event_queue: accounts.market_event_queue.to_account_info(),
                market_coin_vault: accounts.market_coin_vault.to_account_info(),
                market_pc_vault: accounts.market_pc_vault.to_account_info(),
                market_vault_signer: accounts.market_vault_signer.to_account_info(),
                user_token_source: accounts.vault_token_source.to_account_info(),
                user_token_destination: accounts.vault_token_destination.to_account_info(),
                user_source_owner: basket_config.to_account_info(),
                token_program: accounts.token_program.to_account_info(),
            },
            signer,
        );

        solana_program::program::invoke_signed(
            &swap_base_out_inx,
            &ToAccountInfos::to_account_infos(&cpi_context),
            signer,
        )?;
    } else {
        let swap_base_in_inx = swap_base_in(
            &accounts.amm_program.key(),
            &accounts.amm.key(),
            &accounts.amm_authority.key(),
            &accounts.amm_open_orders.key(),
            &accounts.amm_coin_vault.key(),
            &accounts.amm_pc_vault.key(),
            &accounts.market_program.key(),
            &accounts.market.key(),
            &accounts.market_bids.key(),
            &accounts.market_asks.key(),
            &accounts.market_event_queue.key(),
            &accounts.market_coin_vault.key(),
            &accounts.market_pc_vault.key(),
            &accounts.market_vault_signer.key(),
            &accounts.vault_token_source.key(),
            &accounts.vault_token_destination.key(),
            &basket_config.key(),
            amount_in,
            amount_out,
        )?;

        let cpi_context = CpiContext::new_with_signer(
            accounts.amm_program.to_account_info(),
            SwapBaseIn {
                amm: accounts.amm.to_account_info(),
                amm_authority: accounts.amm_authority.to_account_info(),
                amm_open_orders: accounts.amm_open_orders.to_account_info(),
                amm_coin_vault: accounts.amm_coin_vault.to_account_info(),
                amm_pc_vault: accounts.amm_pc_vault.to_account_info(),
                market_program: accounts.market_program.to_account_info(),
                market: accounts.market.to_account_info(),
                market_bids: accounts.market_bids.to_account_info(),
                market_asks: accounts.market_asks.to_account_info(),
                market_event_queue: accounts.market_event_queue.to_account_info(),
                market_coin_vault: accounts.market_coin_vault.to_account_info(),
                market_pc_vault: accounts.market_pc_vault.to_account_info(),
                market_vault_signer: accounts.market_vault_signer.to_account_info(),
                user_token_source: accounts.vault_token_source.to_account_info(),
                user_token_destination: accounts.vault_token_destination.to_account_info(),
                user_source_owner: basket_config.to_account_info(),
                token_program: accounts.token_program.to_account_info(),
            },
            signer,
        );
        solana_program::program::invoke_signed(
            &swap_base_in_inx,
            &ToAccountInfos::to_account_infos(&cpi_context),
            signer,
        )?;
    }

    Ok(())
}
