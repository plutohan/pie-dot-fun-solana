use anchor_lang::prelude::*;

use super::TokenConfig;

#[account]
pub struct UserFund {
    pub asset_info: Vec<TokenConfig>,
}

impl Space for UserFund {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 4 // vec length
        + (32 + 8) * 10; // vec items
}
