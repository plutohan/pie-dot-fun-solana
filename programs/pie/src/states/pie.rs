use anchor_lang::prelude::*;

#[account]
pub struct ProgramState {
    pub bump: u8,
    pub admin: Pubkey,
    pub platform_fee_wallet: Pubkey,
    pub basket_counter: u64,
    pub rebalance_margin_lamports: u64,
    pub mint_redeem_fee_percentage: u64,
    pub platform_fee_percentage: u64,
    pub enable_creator: bool,
    pub is_initialized: bool,
}

impl Space for ProgramState {
    const INIT_SPACE: usize = 8  // Account discriminator added by Anchor for each account
        + 1   // bump (u8)
        + 32  // admin (Pubkey)
        + 32  // platform_fee_wallet (Pubkey)
        + 8   // basket_counter (u32)
        + 8   // rebalance_margin_lamports (u64)
        + 8   // mint_redeem_fee_percentage (u64)
        + 8   // platform_fee_percentage (u64)
        + 1   // enable_creator (bool)
        + 1; // is_initialized (bool)
}
