use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UnderlyAsset {
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct VaultConfig {
    pub bump: u8,
    pub id: u32,
    pub mint: Pubkey,
    pub underly_assets: Vec<UnderlyAsset>,
}

impl Space for VaultConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1
        + 4 
        + 32
        + 4 // vec length
        + (32 + 8) * 10; // vec items
}
