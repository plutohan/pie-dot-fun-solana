use anchor_lang::prelude::*;

#[account]
pub struct ProgramState {
    pub bump: u8,
    pub admin: Pubkey,
    pub basket_counter: u64,
    pub enable_creator: bool,
    pub is_initialized: bool,
    pub max_rebalance_margin_lamports: u64,
}

impl Space for ProgramState {
    const INIT_SPACE: usize = 8  // Account discriminator added by Anchor for each account
        + 1   // bump (u8)
        + 32  // admin (Pubkey)
        + 8   // basket_counter (u32)
        + 1   // enable_creator (bool)
        + 1  // is_initialized (bool)
        + 8; // max_rebalance_margin_lamports (u64)
}