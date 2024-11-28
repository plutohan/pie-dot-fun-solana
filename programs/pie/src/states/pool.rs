use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenConfig {
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct PoolConfig {
    pub bump: u8,
    pub pool_id: u32,
    pub token_configs: Vec<TokenConfig>,
}

impl Space for PoolConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1
        + 4 
        + 4 // vec length
        + (32 + 8) * 10; // vec items
}
