use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Component {
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct BasketConfig {
    pub bump: u8,
    pub id: u32,
    pub mint: Pubkey,
    pub underly_assets: Vec<Component>,
}

impl Space for BasketConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1
        + 4 
        + 32
        + 4 // vec length
        + (32 + 8) * 10; // vec items
}
