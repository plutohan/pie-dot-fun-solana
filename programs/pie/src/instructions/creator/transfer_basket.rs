use anchor_lang::prelude::*;

use crate::BasketConfig;

#[derive(Accounts)]
#[instruction(new_creator: Pubkey)]
pub struct TransferBasket<'info> {
    #[account(mut)]
    pub current_creator: Signer<'info>,
    #[account(
        mut,
        constraint = basket_config.creator == current_creator.key()
    )]
    pub basket_config: Account<'info, BasketConfig>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct TransferBasketEvent {
    pub basket_id: u64,
    pub basket_mint: Pubkey,
    pub old_creator: Pubkey,
    pub new_creator: Pubkey,
}

pub fn transfer_basket(ctx: Context<TransferBasket>, new_creator: Pubkey) -> Result<()> {
    let basket_config = &mut ctx.accounts.basket_config;
    let old_creator = basket_config.creator;
    basket_config.creator = new_creator;

    emit!(TransferBasketEvent {
        basket_id: basket_config.id,
        basket_mint: basket_config.mint,
        old_creator,
        new_creator,
    });

    Ok(())
}
