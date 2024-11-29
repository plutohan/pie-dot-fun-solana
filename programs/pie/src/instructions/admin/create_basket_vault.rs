use anchor_lang::prelude::*;
use anchor_spl::metadata::mpl_token_metadata::types::DataV2;
use anchor_spl::metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata};
use anchor_spl::token::{Mint, Token};

use crate::{
    constant::{CONFIG, FUND},
    error::PieError,
    ProgramState, Component, BasketConfig,
};

#[derive(Accounts)]
pub struct CreateIndexFundVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        constraint = config.admin.key() == admin.key() @PieError::Unauthorized,
        seeds = [CONFIG],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramState>,

    #[account(
        init,
        payer = admin,
        space = BasketConfig::INIT_SPACE,
        seeds = [FUND, index_fund_mint.key().as_ref()],
        bump
    )]
    pub index_fund_config: Account<'info, BasketConfig>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 6,
        mint::authority = index_fund_config.key(),
    )]
    pub index_fund_mint: Account<'info, Mint>,

    /// To store metaplex metadata
    /// CHECK: Safety check performed inside function body
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,
    /// Program to create NFT metadata
    /// CHECK: Metadata program address constraint applied
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_index_fund_vault(
    ctx: Context<CreateIndexFundVault>,
    underly_assets: Vec<Component>,
) -> Result<()> {
    let index_fund_config: &mut Account<'_, BasketConfig> = &mut ctx.accounts.index_fund_config;
    let config = &mut ctx.accounts.config;

    create_metadata_accounts_v3(
        CpiContext::new(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.index_fund_mint.to_account_info(),
                mint_authority: index_fund_config.to_account_info(),
                update_authority: ctx.accounts.admin.to_account_info(),
                payer: ctx.accounts.admin.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ),
        DataV2 {
            name: String::from("Pie Dot Index Fund Token"),
            symbol: String::from("PDI"),
            uri: String::from("https:"), //TODO add uri
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        false,
        true,
        None,
    )?;

    index_fund_config.bump = ctx.bumps.index_fund_config;
    index_fund_config.id = config.basket_counter;
    index_fund_config.mint = ctx.accounts.index_fund_mint.key();
    index_fund_config.components = underly_assets;

    config.basket_counter += 1;

    Ok(())
}
