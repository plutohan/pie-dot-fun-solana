use anchor_lang::prelude::*;

use crate::constant::MAX_COMPONENTS;
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserComponent {
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct UserFund {
    pub components: Vec<UserComponent>,
}

impl Space for UserFund {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 4 // vec length
        + (32 + 8) * MAX_COMPONENTS as usize; // vec items
}
