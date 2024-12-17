use anchor_lang::{prelude::*, solana_program};
use anchor_spl::{
    token::{Token, TokenAccount},
    token_interface::Mint,
};

use crate::{
    constant::USER_FUND,
    error::PieError,
    utils::{calculate_fee_amount, swap_base_in, transfer_fees, SwapBaseIn},
    BasketConfig, ProgramState, UserFund, BASKET_CONFIG, NATIVE_MINT,
};

#[derive(Accounts)]
pub struct SellComponentContext<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_FUND, &user.key().as_ref(), &basket_config.id.to_be_bytes()],
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
        constraint = basket_config.mint == basket_mint.key() @PieError::InvalidBasketMint
    )]
    pub basket_config: Box<Account<'info, BasketConfig>>,

    #[account(mut)]
    pub basket_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub mint_in: Box<InterfaceAccount<'info, Mint>>,
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
    #[account(mut)]
    pub vault_token_source: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_token_destination: Box<Account<'info, TokenAccount>>,

    /// CHECK: Safe. user source token Account
    #[account(
        mut,
        token::authority = program_state.platform_fee_wallet,
        token::mint = NATIVE_MINT,
    )]
    pub platform_fee_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Safe. user source token Account
    #[account(
        mut,
        token::authority = basket_config.creator,
        token::mint = NATIVE_MINT,
    )]
    pub creator_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    /// CHECK: Safe. amm_program
    #[account(
        mut,
        address = crate::raydium_amm_address::id(),
    )]
    pub amm_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct SellComponentEvent {
    pub basket_id: u64,
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

pub fn sell_component(
    ctx: Context<SellComponentContext>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    require!(amount_in > 0, PieError::InvalidAmount);

    let user_fund = &mut ctx.accounts.user_fund;
    let component = user_fund
        .components
        .iter_mut()
        .find(|a| a.mint == ctx.accounts.mint_in.key())
        .ok_or(PieError::ComponentNotFound)?;

    require!(component.amount >= amount_in, PieError::InsufficientBalance);

    let balance_before = ctx.accounts.user_token_destination.amount;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &ctx.accounts.basket_config.id.to_be_bytes(),
        &[ctx.accounts.basket_config.bump],
    ]];

    let swap_base_in_inx = swap_base_in(
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
        &ctx.accounts.vault_token_source.key(),
        &ctx.accounts.user_token_destination.key(),
        &ctx.accounts.basket_config.key(),
        amount_in,
        minimum_amount_out,
    )?;

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.amm_program.to_account_info(),
        SwapBaseIn {
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
            user_token_source: ctx.accounts.vault_token_source.to_account_info(),
            user_token_destination: ctx.accounts.user_token_destination.to_account_info(),
            user_source_owner: ctx.accounts.basket_config.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        },
        signer,
    );

    solana_program::program::invoke_signed(
        &swap_base_in_inx,
        &ToAccountInfos::to_account_infos(&cpi_context),
        signer,
    )?;

    ctx.accounts.user_token_destination.reload()?;

    let balance_after = ctx.accounts.user_token_destination.amount;

    let amount_received: u64 = balance_after.checked_sub(balance_before).unwrap();

    let (platform_fee_amount, creator_fee_amount) =
        calculate_fee_amount(&ctx.accounts.program_state, amount_received)?;

    //transfer fees for creator and platform fee
    transfer_fees(
        &ctx.accounts.user_token_destination.to_account_info(),
        &ctx.accounts.platform_fee_token_account.to_account_info(),
        &ctx.accounts.creator_token_account.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        platform_fee_amount,
        creator_fee_amount,
    )?;
    
    // Update user's component balance
    component.amount = component.amount.checked_sub(amount_in).unwrap();

    emit!(SellComponentEvent {
        basket_id: ctx.accounts.basket_config.id,
        user: ctx.accounts.user.key(),
        mint: ctx.accounts.amm_coin_vault.key(),
        amount: amount_in,
    });

    Ok(())
}