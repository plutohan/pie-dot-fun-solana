use crate::MAX_WHITELISTED_CREATORS;
use anchor_lang::prelude::*;

#[account]
pub struct ProgramState {
    pub bump: u8,
    pub admin: Pubkey,
    pub platform_fee_wallet: Pubkey,
    pub basket_counter: u64,
    pub creator_fee_percentage: u64,
    pub platform_fee_percentage: u64,
    pub is_initialized: bool,
    pub whitelisted_creators: Vec<Pubkey>,
}

impl Space for ProgramState {
    const INIT_SPACE: usize = 8  // Account discriminator added by Anchor for each account
        + 1   // bump (u8)
        + 32  // admin (Pubkey)
        + 32  // platform_fee_wallet (Pubkey)
        + 8   // basket_counter (u64)
        + 8   // creator_fee_percentage (u64)
        + 8   // platform_fee_percentage (u64)
        + 1   // is_initialized (bool)
        + 4   // vec length
        + 32 * MAX_WHITELISTED_CREATORS as usize; // vec items
}
