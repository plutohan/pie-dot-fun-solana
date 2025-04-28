use anchor_lang::{prelude::*, solana_program};
use anchor_spl::{
    token::Token,
    token_interface::{Mint, TokenAccount},
};
use raydium_amm_cpi::{library::swap_base_out, program::RaydiumAmm, SwapBaseOut};

use crate::{
    constant::USER_FUND, error::PieError, utils::{calculate_amounts_swapped_and_received, calculate_fee_amount, transfer_fees}, BasketConfig, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT, PROGRAM_STATE
};

#[derive(Accounts)]
pub struct BuyComponentContext<'info> {
    #[account(mut)]
    pub user_source_owner: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user_source_owner,
        space = UserFund::INIT_SPACE,
        seeds = [USER_FUND, &user_source_owner.key().as_ref(), &basket_config.id.to_be_bytes()],
        bump
    )]
    pub user_fund: Box<Account<'info, UserFund>>,
    #[account(
        mut, 
        seeds = [PROGRAM_STATE], 
        bump = program_state.bump
    )]    
    pub program_state: Box<Account<'info, ProgramState>>,
    #[account(        
        mut,
        seeds = [BASKET_CONFIG, &basket_config.id.to_be_bytes()],
        bump    
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,
    /// CHECK: Safe. amm Account
    #[account(mut)]
    pub amm: AccountInfo<'info>,
    /// CHECK: Safe. Amm authority Account
    pub amm_authority: AccountInfo<'info>,
    /// CHECK: Safe. amm open_orders Account
    #[account(mut)]
    pub amm_open_orders: AccountInfo<'info>,
    /// CHECK: Safe. amm_coin_vault Account
    #[account(mut)]
    pub amm_coin_vault: AccountInfo<'info>,
    /// CHECK: Safe. amm_pc_vault Account
    #[account(mut)]
    pub amm_pc_vault: AccountInfo<'info>,
    /// CHECK: Safe. OpenBook program id
    pub market_program: AccountInfo<'info>,
    /// CHECK: Safe. OpenBook market Account
    #[account(mut)]
    pub market: AccountInfo<'info>,
    /// CHECK: Safe. bids Account
    #[account(mut)]
    pub market_bids: AccountInfo<'info>,
    /// CHECK: Safe. asks Account
    #[account(mut)]
    pub market_asks: AccountInfo<'info>,
    /// CHECK: Safe. event_q Account
    #[account(mut)]
    pub market_event_queue: AccountInfo<'info>,
    /// CHECK: Safe. coin_vault Account
    #[account(mut)]
    pub market_coin_vault: AccountInfo<'info>,
    /// CHECK: Safe. pc_vault Account
    #[account(mut)]
    pub market_pc_vault: AccountInfo<'info>,
    /// CHECK: Safe. vault_signer Account
    pub market_vault_signer: AccountInfo<'info>,
    /// CHECK: Safe. user source token Account
    #[account(
        mut,
        token::authority = user_source_owner,
        token::mint = NATIVE_MINT,
    )]
    pub user_token_source: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        address = vault_token_destination.mint
    )]
    pub vault_token_destination_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::authority = basket_config,
        associated_token::mint = vault_token_destination_mint,
        associated_token::token_program = token_program
    )]
    pub vault_token_destination: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Safe. user source token Account
    #[account(
        mut,
        token::authority = program_state.platform_fee_wallet,
        token::mint = NATIVE_MINT,
    )]
    pub platform_fee_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Safe. user source token Account
    #[account(
        mut,
        token::authority = basket_config.creator,
        token::mint = NATIVE_MINT,
    )]
    pub creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,

    pub amm_program: Program<'info, RaydiumAmm>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct BuyComponentEvent {
    pub basket_id: u64,
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

pub fn buy_component(
    ctx: Context<BuyComponentContext>,
    max_amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    require!(max_amount_in > 0, PieError::InvalidAmount);
    require!(!ctx.accounts.basket_config.is_rebalancing, PieError::RebalancingInProgress);
    require!(
        ctx.accounts.basket_config.components
            .iter()
            .any(|c| c.mint == ctx.accounts.vault_token_destination_mint.key()),
        PieError::InvalidComponent
    );

    let user_fund = &mut ctx.accounts.user_fund;

    let balance_in_before = ctx.accounts.user_token_source.amount;
    let balance_out_before = ctx.accounts.vault_token_destination.amount;

    let swap_base_out_inx = swap_base_out(
        &ctx.accounts.amm_program.key(),
        &ctx.accounts.amm.key(),
        &ctx.accounts.amm_authority.key(),
        &ctx.accounts.amm_open_orders.key(),
        &ctx.accounts.amm_coin_vault.key(),
        &ctx.accounts.amm_pc_vault.key(),
        &ctx.accounts.market_program.key(),
        &ctx.accounts.market.key(),
        &ctx.accounts.market_bids.key(),
        &ctx.accounts.market_asks.key(),
        &ctx.accounts.market_event_queue.key(),
        &ctx.accounts.market_coin_vault.key(),
        &ctx.accounts.market_pc_vault.key(),
        &ctx.accounts.market_vault_signer.key(),
        &ctx.accounts.user_token_source.key(),
        &ctx.accounts.vault_token_destination.key(),
        &ctx.accounts.user_source_owner.key(),
        max_amount_in,
        amount_out,
    )?;

    let cpi_context = CpiContext::new(
        ctx.accounts.amm_program.to_account_info(),
        SwapBaseOut {
            amm: ctx.accounts.amm.to_account_info(),
            amm_authority: ctx.accounts.amm_authority.to_account_info(),
            amm_open_orders: ctx.accounts.amm_open_orders.to_account_info(),
            amm_coin_vault: ctx.accounts.amm_coin_vault.to_account_info(),
            amm_pc_vault: ctx.accounts.amm_pc_vault.to_account_info(),
            market_program: ctx.accounts.market_program.to_account_info(),
            market: ctx.accounts.market.to_account_info(),
            market_bids: ctx.accounts.market_bids.to_account_info(),
            market_asks: ctx.accounts.market_asks.to_account_info(),
            market_event_queue: ctx.accounts.market_event_queue.to_account_info(),
            market_coin_vault: ctx.accounts.market_coin_vault.to_account_info(),
            market_pc_vault: ctx.accounts.market_pc_vault.to_account_info(),
            market_vault_signer: ctx.accounts.market_vault_signer.to_account_info(),
            user_token_source: ctx.accounts.user_token_source.to_account_info(),
            user_token_destination: ctx.accounts.vault_token_destination.to_account_info(),
            user_source_owner: ctx.accounts.user_source_owner.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        },
    );

    solana_program::program::invoke(
        &swap_base_out_inx,
        &ToAccountInfos::to_account_infos(&cpi_context),
    )?;

    ctx.accounts.user_token_source.reload()?;
    ctx.accounts.vault_token_destination.reload()?;

    let (amount_swapped, amount_received) = calculate_amounts_swapped_and_received(
        &ctx.accounts.user_token_source,
        &ctx.accounts.vault_token_destination,
        balance_in_before,
        balance_out_before,
    )?;

    let (platform_fee_amount, creator_fee_amount) =
        calculate_fee_amount(&ctx.accounts.program_state, amount_swapped)?;

    //transfer fees for creator and platform fee
    transfer_fees(
        &ctx.accounts.user_token_source.to_account_info(),
        &ctx.accounts.platform_fee_token_account.to_account_info(),
        &ctx.accounts.creator_token_account.to_account_info(),
        &ctx.accounts.user_source_owner.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        platform_fee_amount,
        creator_fee_amount,
    )?;

    user_fund.bump = ctx.bumps.user_fund;
    user_fund
        .upsert_component(ctx.accounts.vault_token_destination.mint.key(), amount_received)?;

    emit!(BuyComponentEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user_source_owner.key(),
        mint: ctx.accounts.vault_token_destination.mint.key(),
        amount: amount_received,
    });

    Ok(())
}
