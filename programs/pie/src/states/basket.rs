use anchor_lang::prelude::*;

use crate::constant::MAX_COMPONENTS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Component {
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct BasketConfig {
    pub bump: u8,
    pub creator: Pubkey,
    pub id: u32,
    pub mint: Pubkey,
    pub components: Vec<Component>,
    pub is_rebalancing: bool,
}

impl Space for BasketConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 // bump
        + 32 // creator
        + 4 // id
        + 32 // mint
        + 4 // vec length
        + 1   // is_rebalancing (bool)
        + (32 + 8) * MAX_COMPONENTS as usize; // vec items
}
