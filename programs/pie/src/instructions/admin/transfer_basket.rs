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

pub fn transfer_basket(ctx: Context<TransferBasket>, new_creator: Pubkey) -> Result<()> {
    // Update the creator field
    ctx.accounts.basket_config.creator = new_creator;

    msg!(
        "Basket {} ownership transferred from {} to {}",
        ctx.accounts.basket_config.mint,
        ctx.accounts.current_creator.key(),
        new_creator
    );

    Ok(())
}
