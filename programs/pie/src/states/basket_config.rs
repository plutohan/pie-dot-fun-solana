use crate::{constant::MAX_COMPONENTS, error::PieError, utils::Calculator};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BasketComponent {
    pub mint: Pubkey,
    pub quantity_in_sys_decimal: u128,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RebalanceType {
    Dynamic,  // Components can be added/removed
    Fixed,    // Components are fixed but quantities can be adjusted
    Disabled, // Rebalancing is completely disabled
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BasketState {
    Default,
    Rebalancing,
    Disabled, // When disabled, only redeem and sell are allowed
}

#[account]
pub struct BasketConfig {
    pub bump: u8,
    pub id: u64,
    pub creator: Pubkey,
    pub rebalancer: Pubkey,
    pub mint: Pubkey,
    pub state: BasketState,
    pub components: Vec<BasketComponent>,
    pub rebalance_type: RebalanceType,
    pub creator_fee_bp: u64,
    pub version: u8,
    pub reserved: [u64; 10],
}

// @dev: V2
impl Space for BasketConfig {
    const INIT_SPACE: usize = 8 // Account discriminator added by Anchor for each account
        + 1 // bump
        + 8 // id
        + 32 // creator
        + 32 // rebalancer
        + 32 // mint
        + 1  // state (BasketState)
        + 4 // vec length
        + (32 + 16) * MAX_COMPONENTS as usize // MAX_COMPONENTS was 30 in V1, now 15
        + 1  // rebalance_type (RebalanceType)
        + 8  // creator_fee_bp (u64)
        + 1  // version (u8)
        + 8 * 10; // reserved
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
            // validate if the basket allow component change
            require!(
                self.rebalance_type != RebalanceType::Fixed,
                PieError::ComponentChangeNotAllowedBasket
            );
            // validate if new component exceed the max components limit
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
        // if the basket is component fixed, instead of removing the component, we set the quantity to 0
        if self.rebalance_type == RebalanceType::Fixed {
            if let Some(component) = self.find_component_mut(mint) {
                component.quantity_in_sys_decimal = 0;
            }
        } else {
            self.components.retain(|component| component.mint != mint);
        }
    }
}
