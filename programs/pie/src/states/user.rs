use anchor_lang::prelude::*;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::system_program;

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
        if let Some(asset) = self
            .components
            .iter_mut()
            .find(|component| component.mint == mint)
        {
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
    pub fn close_if_empty(
        &self,
        user_fund: AccountInfo,
        sol_destination: AccountInfo,
    ) -> Result<bool> {
        if self
            .components
            .iter()
            .all(|component| component.amount == 0)
        {
            msg!(
                "Closing user fund account at {} with lamports: {}",
                user_fund.key(),
                user_fund.lamports()
            );

            // Transfer tokens from the account to the sol_destination.
            let dest_starting_lamports: u64 = sol_destination.lamports();
            **sol_destination.lamports.borrow_mut() = dest_starting_lamports
                .checked_add(user_fund.lamports())
                .unwrap();
            **user_fund.lamports.borrow_mut() = 0;

            user_fund.assign(&system_program::ID);
            user_fund.realloc(0, false)?;

            msg!(
                "Transferred lamports to {}. 
                Balance before: {}, after: {}",
                sol_destination.key(),
                dest_starting_lamports,
                sol_destination.lamports()
            );

            Ok(true)
        } else {
            Ok(false)
        }
    }
}

impl Space for UserFund {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 //bump
        + 4 // vec length
        + (32 + 8) * MAX_COMPONENTS as usize; // vec items
}
