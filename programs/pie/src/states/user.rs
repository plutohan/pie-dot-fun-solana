use anchor_lang::prelude::*;

use crate::{constant::MAX_COMPONENTS, error::PieError};
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserComponent {
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct UserFund {
    pub bump: u8,
    pub components: Vec<UserComponent>,
}

impl UserFund {
    /// Adds `amount` of the given `mint` to `self.components`.
    /// - If `mint` already exists in `components`, it increments the existing amount.
    /// - Otherwise, it creates a new `UserComponent`, provided we haven’t hit `MAX_COMPONENTS`.
    pub fn upsert_component(&mut self, mint: Pubkey, amount: u64) -> Result<()> {
        if let Some(asset) = self.components.iter_mut().find(|component| component.mint == mint) {
            asset.amount = asset
                .amount
                .checked_add(amount)
                .ok_or(PieError::InvalidAmount)?;
        } else {
            require!(
                self.components.len() < MAX_COMPONENTS as usize,
                PieError::MaxAssetsExceeded
            );
            self.components.push(UserComponent { mint, amount });
        }
        Ok(())
    }
}

impl Space for UserFund {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 //bump
        + 4 // vec length
        + (32 + 8) * MAX_COMPONENTS as usize; // vec items
}
