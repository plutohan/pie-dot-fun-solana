use crate::{constant::MAX_COMPONENTS, error::PieError, utils::Calculator};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasketComponent {
    pub mint: Pubkey,
    pub quantity_in_sys_decimal: u128,
}

#[account]
pub struct BasketConfig {
    pub bump: u8,
    pub id: u64,
    pub creator: Pubkey,
    pub rebalancer: Pubkey,
    pub mint: Pubkey,
    pub is_rebalancing: bool,
    pub components: Vec<BasketComponent>,
}

impl Space for BasketConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 // bump
        + 8 // id
        + 32 // creator
        + 32 // rebalancer
        + 32 // mint
        + 1  // is_rebalancing (bool)
        + 4 // vec length
        + (32 + 16) * MAX_COMPONENTS as usize; // vec items
}

impl BasketConfig {
    /// Finds a mutable reference to the component with the given mint.
    pub fn find_component_mut(&mut self, mint: Pubkey) -> Option<&mut BasketComponent> {
        self.components
            .iter_mut()
            .find(|component| component.mint == mint)
    }

    /// Adds or updates a component with the given mint and amount.
    /// Computes `quantity_in_sys_decimal` internally.
    pub fn upsert_component(&mut self, mint: Pubkey, amount: u64, total_supply: u64) -> Result<()> {
        let quantity_in_sys_decimal = Calculator::apply_sys_decimal(amount)
            .checked_div(total_supply.try_into().unwrap())
            .ok_or(PieError::InvalidQuantity)?;

        if let Some(component) = self.find_component_mut(mint) {
            component.quantity_in_sys_decimal = quantity_in_sys_decimal;
        } else {
            require!(
                self.components.len() < MAX_COMPONENTS as usize,
                PieError::MaxAssetsExceeded
            );
            self.components.push(BasketComponent {
                mint,
                quantity_in_sys_decimal,
            });
        }

        Ok(())
    }

    /// Removes a component with the given mint.
    pub fn remove_component(&mut self, mint: Pubkey) {
        self.components.retain(|component| component.mint != mint);
    }
}
