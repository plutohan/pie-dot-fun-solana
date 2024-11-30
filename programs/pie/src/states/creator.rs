use anchor_lang::prelude::*;

#[account]
pub struct CreatorState {
    pub creator: Pubkey,
}

impl Space for CreatorState {
    const INIT_SPACE: usize = 8  // Account discriminator added by Anchor for each account
        + 32; // Size of Pubkey
}
