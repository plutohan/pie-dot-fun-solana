use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::metadata::mpl_token_metadata::types::DataV2;
use anchor_spl::metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata};
use anchor_spl::token::{Mint, Token};

use std::collections::HashSet;

use crate::{
    constant::{BASIS_POINTS, BASKET_CONFIG, PROGRAM_STATE},
    error::PieError,
    states::RebalanceType,
    BasketComponent, BasketConfig, ProgramState,
};
use crate::{BASKET_DECIMALS, BASKET_MINT};

// Fee in lamports for creating a basket
const CREATE_BASKET_FEE_LAMPORTS: u64 = 10_000_000; // 0.01 SOL

#[derive(Accounts)]
#[instruction(args: CreateBasketArgs)]
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
        seeds = [BASKET_CONFIG, &program_state.basket_counter.to_be_bytes()],
        bump
    )]
    pub basket_config: Account<'info, BasketConfig>,

    #[account(
        init_if_needed,
        seeds = [BASKET_MINT, &program_state.basket_counter.to_be_bytes()],
        bump,
        payer = creator,
        mint::decimals = BASKET_DECIMALS,
        mint::authority = basket_config,
    )]
    pub basket_mint: Account<'info, Mint>,

    /// CHECK: Platform fee wallet that receives the creation fee
    #[account(address = program_state.platform_fee_wallet)]
    pub platform_fee_wallet: AccountInfo<'info>,

    /// Metadata account to store Metaplex metadata
    /// CHECK: Safety check performed inside function body
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// The Metaplex metadata program
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
    pub rebalancer: Pubkey,
    pub rebalance_type: RebalanceType,
    pub creator_fee_bp: u64,
}

#[event]
pub struct CreateBasketEvent {
    pub basket_id: u64,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub components: Vec<BasketComponent>,
    pub rebalance_type: RebalanceType,
    pub creator_fee_bp: u64,
}

pub fn create_basket(ctx: Context<CreateBasketContext>, args: CreateBasketArgs) -> Result<()> {
    // Validate components
    validate_components(&args.components)?;

    let basket_config = &mut ctx.accounts.basket_config;
    let program_state = &mut ctx.accounts.program_state;

    basket_config.bump = ctx.bumps.basket_config;
    basket_config.creator = ctx.accounts.creator.key();
    basket_config.rebalancer = args.rebalancer;
    basket_config.id = program_state.basket_counter;
    basket_config.mint = ctx.accounts.basket_mint.key();
    basket_config.components = args.components.clone();
    basket_config.rebalance_type = args.rebalance_type;
    basket_config.creator_fee_bp = args.creator_fee_bp;
    program_state.basket_counter += 1;

    let signer: &[&[&[u8]]] = &[&[
        BASKET_CONFIG,
        &basket_config.id.to_be_bytes(),
        &[basket_config.bump],
    ]];

    // Create metadata for the basket mint
    create_metadata_accounts_v3(
        CpiContext::new_with_signer(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.basket_mint.to_account_info(),
                mint_authority: basket_config.to_account_info(),
                update_authority: basket_config.to_account_info(),
                payer: ctx.accounts.creator.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
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

    // Transfer the basket creation fee to the platform fee wallet
    if program_state.basket_creation_fee > 0 {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.platform_fee_wallet.to_account_info(),
                },
            ),
            program_state.basket_creation_fee,
        )?;

        msg!(
            "Transferred {} lamports to platform fee wallet",
            program_state.basket_creation_fee
        );
    }

    emit!(CreateBasketEvent {
        basket_id: basket_config.id,
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        creator: basket_config.creator,
        mint: basket_config.mint,
        components: basket_config.components.clone(),
        rebalance_type: basket_config.rebalance_type,
        creator_fee_bp: basket_config.creator_fee_bp,
    });

    Ok(())
}

fn validate_components(components: &[BasketComponent]) -> Result<()> {
    let mut mint_set = HashSet::new();
    for component in components {
        // Check for duplicates
        if !mint_set.insert(component.mint) {
            return Err(PieError::DuplicateComponent.into());
        }

        require!(component.mint != Pubkey::default(), PieError::InvalidMint);

        require!(
            component.quantity_in_sys_decimal > 0,
            PieError::InvalidComponentQuantity
        );
    }

    Ok(())
}
