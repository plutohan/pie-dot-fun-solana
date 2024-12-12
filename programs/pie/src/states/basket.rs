use anchor_lang::prelude::*;

use crate::constant::MAX_COMPONENTS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasketComponent {
    pub mint: Pubkey,
    pub quantity_in_sys_decimal: u128,
}

#[account]
pub struct BasketConfig {
    pub bump: u8,
    pub id: u64,
    pub creator: Pubkey,
    pub rebalancer: Pubkey,
    pub mint: Pubkey,
    pub is_rebalancing: bool,
    pub components: Vec<BasketComponent>,
}

impl Space for BasketConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 // bump
        + 8 // id
        + 32 // creator
        + 32 // rebalancer
        + 32 // mint
        + 1  // is_rebalancing (bool)
        + 4 // vec length
        + (32+ 16)* MAX_COMPONENTS as usize; // vec items
}
