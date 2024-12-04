use anchor_lang::prelude::*;
use anchor_spl::metadata::mpl_token_metadata::types::DataV2;
use anchor_spl::metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata};
use anchor_spl::token::spl_token::instruction::AuthorityType;
use anchor_spl::token::{set_authority, Mint, SetAuthority, Token};

use crate::{
    constant::{BASKET_CONFIG, PROGRAM_STATE},
    error::PieError,
    BasketComponent, BasketConfig, ProgramState,
};

#[derive(Accounts)]
pub struct CreateBasketContext<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [PROGRAM_STATE],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(
        init_if_needed,
        payer = creator,
        space = BasketConfig::INIT_SPACE,
        seeds = [BASKET_CONFIG, basket_mint.key().as_ref()],
        bump
    )]
    pub basket_config: Account<'info, BasketConfig>,
    #[account(mut)]
    pub basket_mint: Account<'info, Mint>,
    /// To store Metaplex metadata
    /// CHECK: Safety check performed inside function body
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,
    /// CHECK: Metadata program address constraint applied
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateBasketArgs {
    pub components: Vec<BasketComponent>,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[event]
pub struct CreateBasketEvent {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub creator: Pubkey,
    pub id: u32,
    pub mint: Pubkey,
    pub components: Vec<BasketComponent>,
}

pub fn create_basket(ctx: Context<CreateBasketContext>, args: CreateBasketArgs) -> Result<()> {
    let program_state = &ctx.accounts.program_state;

    if !program_state.enable_creator {
        let current_admin = program_state.admin;

        if ctx.accounts.creator.key() != current_admin {
            return Err(PieError::Unauthorized.into());
        }
    }

    let basket_config = &mut ctx.accounts.basket_config;
    let config = &mut ctx.accounts.program_state;

    create_metadata_accounts_v3(
        CpiContext::new(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.basket_mint.to_account_info(),
                mint_authority: ctx.accounts.creator.to_account_info(),
                update_authority: ctx.accounts.creator.to_account_info(),
                payer: ctx.accounts.creator.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ),
        DataV2 {
            name: args.name.clone(),
            symbol: args.symbol.clone(),
            uri: args.uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        false,
        true,
        None,
    )?;

    set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.creator.to_account_info(),
                account_or_mint: ctx.accounts.basket_mint.to_account_info(),
            },
        ),
        AuthorityType::MintTokens,
        Some(basket_config.key()),
    )?;

    basket_config.bump = ctx.bumps.basket_config;
    basket_config.creator = ctx.accounts.creator.key();
    basket_config.id = config.basket_counter;
    basket_config.mint = ctx.accounts.basket_mint.key();
    basket_config.components = args.components;

    config.basket_counter += 1;

    emit!(CreateBasketEvent {
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        creator: basket_config.creator,
        id: basket_config.id,
        mint: basket_config.mint,
        components: basket_config.components.clone(),
    });

    Ok(())
}
