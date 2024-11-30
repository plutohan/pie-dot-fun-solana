use anchor_lang::prelude::*;

#[account]
pub struct ProgramState {
    pub bump: u8,
    pub admin: Pubkey,
    pub basket_counter: u32,
    pub rebalancing_state: bool,
    pub enable_creator: bool,
}

impl Space for ProgramState {
    const INIT_SPACE: usize = 8  // Account discriminator added by Anchor for each account
        + 1   // bump (u8)
        + 32  // admin (Pubkey)
        + 4   // basket_counter (u32)
        + 1   // rebalancing_state (bool)
        + 1; // enable_creator (bool)
}
