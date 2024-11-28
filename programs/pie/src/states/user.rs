use anchor_lang::prelude::*;

use crate::constant::MAX_UNDERLY_ASSETS;

use super::UnderlyAsset;

#[account]
pub struct UserFund {
    pub asset_info: Vec<UnderlyAsset>,
}

impl Space for UserFund {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 4 // vec length
        + (32 + 8) * MAX_UNDERLY_ASSETS as usize; // vec items
}
