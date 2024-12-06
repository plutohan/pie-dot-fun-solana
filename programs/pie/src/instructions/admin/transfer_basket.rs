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
    pub basket_mint: Pubkey,
    pub old_creator: Pubkey,
    pub new_creator: Pubkey,
}

pub fn transfer_basket(ctx: Context<TransferBasket>, new_creator: Pubkey) -> Result<()> {
    // Update the creator field
    ctx.accounts.basket_config.creator = new_creator;

    emit!(TransferBasketEvent {
        basket_mint: ctx.accounts.basket_config.mint,
        old_creator: ctx.accounts.current_creator.key(),
        new_creator,
    });

    Ok(())
}
