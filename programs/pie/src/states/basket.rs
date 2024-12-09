use anchor_lang::prelude::*;

use crate::constant::MAX_COMPONENTS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasketComponent {
    pub mint: Pubkey,
    pub ratio: u64,
    pub decimals: u8,
}

#[account]
pub struct BasketConfig {
    pub bump: u8,
    pub id: u64,
    pub creator: Pubkey,
    pub rebalancer: Pubkey,
    pub mint: Pubkey,
    pub components: Vec<BasketComponent>,
    pub is_rebalancing: bool,
}

impl Space for BasketConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 // bump
        + 8 // id
        + 32 // creator
        + 32 // rebalancer
        + 32 // mint
        + 4 // vec length
        + 1   // is_rebalancing (bool)
        + BasketComponent::INIT_SPACE * MAX_COMPONENTS as usize; // vec items
}

impl Space for BasketComponent {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 32 // mint
        + 8 // ratio
        + 1; // decimals
}
