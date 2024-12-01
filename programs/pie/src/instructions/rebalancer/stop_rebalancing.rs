use anchor_lang::{prelude::*, solana_program};
use anchor_spl::{
    token::{Token, TokenAccount},
    token_interface::Mint,
};

use crate::{
    error::PieError,
    utils::{swap_base_in, swap_base_out, SwapBaseIn, SwapBaseOut},
    BasketConfig, Component, ProgramState, RebalancerState, BASKET_CONFIG, FUND, PROGRAM_STATE,
    REBALANCER_STATE,
};

#[derive(Accounts)]
pub struct StopRebalancing<'info> {
    #[account(mut)]
    pub rebalancer: Signer<'info>,

    #[account(
        seeds = [REBALANCER_STATE, rebalancer.key().as_ref()],
        bump,
        constraint = rebalancer_state.balancer == rebalancer.key() @ PieError::Unauthorized
    )]
    pub rebalancer_state: Box<Account<'info, RebalancerState>>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(
        seeds = [FUND, basket_mint.key().as_ref()],
        bump
    )]
    pub basket_config: Account<'info, BasketConfig>,

    // Required token accounts
    #[account(mut)]
    pub token_mint: Box<InterfaceAccount<'info, Mint>>,

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
    /// CHECK: user source token Account
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = basket_config,
    )]
    pub vault_token_source: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = basket_config,
    )]
    pub vault_token_destination: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    /// CHECK: amm_program
    pub amm_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,
}

pub fn stop_rebalancing<'a, 'b, 'c: 'info, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, StopRebalancing<'info>>,
    is_buy: bool,
    amount_out: u64,
) -> Result<()> {
    let program_state = &ctx.accounts.program_state;
    require!(!program_state.is_rebalancing, PieError::AlreadyRebalancing);

    let basket_mint_key = ctx.accounts.basket_mint.key();

    let basket_config_seeds = &[
        BASKET_CONFIG,
        &basket_mint_key.as_ref(),
        &[ctx.accounts.basket_config.bump],
    ];
    let signer = &[&basket_config_seeds[..]];

    let max_amount_in = ctx.accounts.vault_token_source.amount;

    execute_stop_swap(ctx.accounts, max_amount_in, is_buy, amount_out, signer)?;

    // Update basket configuration
    let basket_config = &mut ctx.accounts.basket_config;
    if is_buy {
        let token_mint = ctx.accounts.token_mint.key();
        if !basket_config
            .components
            .iter()
            .any(|c| c.mint == token_mint)
        {
            basket_config.components.push(Component {
                mint: token_mint,
                amount: amount_out,
            });
        }
    } else {
        let token_account = &ctx.accounts.vault_token_destination;
        if token_account.amount == 0 {
            let token_mint = ctx.accounts.token_mint.key();
            basket_config.components.retain(|c| c.mint != token_mint);
        }
    }

    // Set rebalancing state to false
    let program_state = &mut ctx.accounts.program_state;
    program_state.is_rebalancing = false;

    Ok(())
}

pub fn execute_stop_swap<'a: 'info, 'info>(
    accounts: &StopRebalancing<'info>,
    amount: u64,
    is_buy: bool,
    minimum_amount_out: u64,
    signer: &[&[&[u8]]],
) -> Result<()> {
    if is_buy {
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
            &accounts.vault_token_destination.key(),
            amount,
            minimum_amount_out,
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
                user_source_owner: accounts.basket_config.to_account_info(),
                token_program: accounts.token_program.to_account_info(),
            },
            signer,
        );

        solana_program::program::invoke_signed(
            &swap_base_in_inx,
            &ToAccountInfos::to_account_infos(&cpi_context),
            signer,
        )?;
    } else {
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
            &accounts.basket_config.key(),
            amount,
            minimum_amount_out,
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
                user_source_owner: accounts.basket_config.to_account_info(),
                token_program: accounts.token_program.to_account_info(),
            },
            signer,
        );

        solana_program::program::invoke_signed(
            &swap_base_out_inx,
            &ToAccountInfos::to_account_infos(&cpi_context),
            signer,
        )?;
    }

    Ok(())
}
