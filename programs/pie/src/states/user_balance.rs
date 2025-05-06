use anchor_lang::prelude::*;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::system_program;

use crate::{constant::MAX_BALANCES, error::PieError};
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Balance {
    pub basket_id: u64,
    pub mint: Pubkey,
    pub amount: u64,
}

#[account]
pub struct UserBalance {
    pub bump: u8,
    pub balances: Vec<Balance>,
}

impl UserBalance {
    /// - If `basket_id` and `mint` already exists in `balances`, it increments the existing amount.
    /// - Otherwise, it creates a new `Balance`, provided we haven’t hit `MAX_BALANCES`.
    pub fn upsert_balance(&mut self, basket_id: u64, mint: Pubkey, amount: u64) -> Result<()> {
        if let Some(asset) = self
            .balances
            .iter_mut()
            .find(|balance| balance.mint == mint && balance.basket_id == basket_id)
        {
            asset.amount = asset
                .amount
                .checked_add(amount)
                .ok_or(PieError::InvalidAmount)?;
        } else {
            require!(
                self.balances.len() < MAX_BALANCES as usize,
                PieError::MaxBalancesExceeded
            );
            self.balances.push(Balance {
                basket_id,
                mint,
                amount,
            });
        }
        Ok(())
    }

    pub fn remove_balance(&mut self, index: usize) -> Result<()> {
        self.balances.remove(index);
        Ok(())
    }

    pub fn close_if_empty(
        &self,
        user_balance: AccountInfo,
        sol_destination: AccountInfo,
    ) -> Result<bool> {
        if self.balances.len() == 0 {
            msg!(
                "Closing user balance account at {} with lamports: {}",
                user_balance.key(),
                user_balance.lamports()
            );

            // Transfer tokens from the account to the sol_destination.
            let dest_starting_lamports: u64 = sol_destination.lamports();
            **sol_destination.lamports.borrow_mut() = dest_starting_lamports
                .checked_add(user_balance.lamports())
                .unwrap();
            **user_balance.lamports.borrow_mut() = 0;

            user_balance.assign(&system_program::ID);
            user_balance.realloc(0, false)?;

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

    /// Computes the total account size for a given number of balances.
    pub fn size_for_len(len: usize) -> usize {
        1 //bump
        + 4 // vec length
        + (8 + 32 + 8) * len // 8 bytes per u64 element
    }
}
