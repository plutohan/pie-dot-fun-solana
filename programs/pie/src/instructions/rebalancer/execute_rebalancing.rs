use std::cmp::min;

use anchor_lang::{prelude::*, solana_program};
use anchor_spl::{
    token::{Token, TokenAccount},
    token_interface::Mint,
};
use raydium_amm_cpi::{
    library::{swap_base_in, swap_base_out},
    SwapBaseIn, SwapBaseOut,
};

use crate::utils::Calculator;
use crate::{error::PieError, BasketComponent, BasketConfig, BASKET_CONFIG};

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
    /// CHECK: user source token Account
    #[account(mut)]
    pub vault_token_source: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub vault_token_destination: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    /// CHECK: amm_program
    #[account(
        mut,
        address = crate::raydium_amm_address::id(),
    )]
    pub amm_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct ExecuteRebalancingEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub is_buy: bool,
    pub initial_source_balance: u64,
    pub initial_destination_balance: u64,
    pub final_source_balance: u64,
    pub final_destination_balance: u64,
}

pub fn execute_rebalancing<'a, 'b, 'c: 'info, 'info>(
    mut ctx: Context<'a, 'b, 'c, 'info, ExecuteRebalancing<'info>>,
    is_buy: bool,
    amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    let basket_config = &ctx.accounts.basket_config;
    require!(basket_config.is_rebalancing, PieError::NotInRebalancing);

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    let initial_source_balance = ctx.accounts.vault_token_source.amount;
    let initial_destination_balance = ctx.accounts.vault_token_destination.amount;

    execute_swap(&mut ctx.accounts, is_buy, amount_in, amount_out, signer)?;

    // Fetch final balances
    ctx.accounts.vault_token_source.reload()?;
    ctx.accounts.vault_token_destination.reload()?;
    let final_source_balance = ctx.accounts.vault_token_source.amount;
    let final_destination_balance = ctx.accounts.vault_token_destination.amount;

    emit!(ExecuteRebalancingEvent {
        basket_id: ctx.accounts.basket_config.id,
        basket_mint: ctx.accounts.basket_mint.key(),
        is_buy,
        initial_source_balance,
        initial_destination_balance,
        final_source_balance,
        final_destination_balance,
    });

    Ok(())
}

pub fn execute_swap<'a: 'info, 'info>(
    accounts: &mut ExecuteRebalancing<'info>,
    is_buy: bool,
    amount_in: u64,
    amount_out: u64,
    signer: &[&[&[u8]]],
) -> Result<()> {
    let basket_config = &mut accounts.basket_config;
    let total_supply = accounts.basket_mint.supply;

    if is_buy {
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

        accounts.vault_token_destination.reload()?;

        let token_mint = accounts.vault_token_destination.mint;
        let quantity_in_sys_decimal =
            Calculator::apply_sys_decimal(accounts.vault_token_destination.amount)
                .checked_div(total_supply.try_into().unwrap())
                .unwrap();

        // **New validation step:** Ensure quantity_in_sys_decimal is not zero.
        require!(quantity_in_sys_decimal > 0, PieError::InvalidQuantity);

        if let Some(component) = basket_config
            .components
            .iter_mut()
            .find(|c| c.mint == token_mint)
        {
            component.quantity_in_sys_decimal = quantity_in_sys_decimal;
        } else {
            basket_config.components.push(BasketComponent {
                mint: token_mint,
                quantity_in_sys_decimal,
            });
        }
    } else {
        if let Some(component) = basket_config
            .components
            .iter()
            .find(|c| c.mint == accounts.vault_token_source.mint)
        {
            let amount_swapped = min(
                amount_in,
                total_supply
                    .checked_mul(component.quantity_in_sys_decimal as u64)
                    .unwrap(),
            );

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
                amount_swapped,
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

            accounts.vault_token_source.reload()?;

            let token_mint = accounts.vault_token_source.mint;
            let quantity_in_sys_decimal =
                Calculator::apply_sys_decimal(accounts.vault_token_source.amount)
                    .checked_div(total_supply.try_into().unwrap())
                    .unwrap();

            if quantity_in_sys_decimal == 0 {
                basket_config.components.retain(|c| c.mint != token_mint);
            } else {
                if let Some(component) = basket_config
                    .components
                    .iter_mut()
                    .find(|c| c.mint == token_mint)
                {
                    component.quantity_in_sys_decimal = quantity_in_sys_decimal;
                }
            }
        } else {
            return Err(PieError::ComponentNotFound.into());
        }
    }

    Ok(())
}
