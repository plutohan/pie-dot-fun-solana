use crate::error::PieError;
use crate::utils::Calculator;
use crate::BasketConfig;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

#[derive(Clone, Debug, PartialEq)]
pub struct Rebalance {}

impl Rebalance {
    pub fn calculate_initial_balances(
        basket_config: &mut BasketConfig,
        vault_token_source: &InterfaceAccount<'_, TokenAccount>,
        vault_token_destination: &InterfaceAccount<'_, TokenAccount>,
        basket_total_supply: u64,
        amount_in: u64,
    ) -> Result<(u64, u64, u64, u64)> {
        let initial_available_source_balance;
        let mut initial_available_destination_balance = 0;
        let unminted_source_balance;
        let mut unminted_destination_balance = 0;

        // make sure amount in is less than initial available source balance
        if let Some(component) = basket_config.find_component_mut(vault_token_source.mint) {
            initial_available_source_balance = Calculator::restore_raw_decimal(
                component
                    .quantity_in_sys_decimal
                    .checked_mul(basket_total_supply.try_into().unwrap())
                    .unwrap(),
            );
            require!(
                initial_available_source_balance >= amount_in,
                PieError::InvalidAmount
            );
            unminted_source_balance = vault_token_source
                .amount
                .checked_sub(initial_available_source_balance)
                .unwrap();
        } else {
            return Err(PieError::ComponentNotFound.into());
        }

        // if destination component exists, calculate unminted destination balance
        if let Some(component) = basket_config.find_component_mut(vault_token_destination.mint) {
            initial_available_destination_balance = Calculator::restore_raw_decimal(
                component
                    .quantity_in_sys_decimal
                    .checked_mul(basket_total_supply.try_into().unwrap())
                    .unwrap(),
            );
            unminted_destination_balance = vault_token_destination
                .amount
                .checked_sub(initial_available_destination_balance)
                .unwrap();
        }

        Ok((
            initial_available_source_balance,
            initial_available_destination_balance,
            unminted_source_balance,
            unminted_destination_balance,
        ))
    }

    pub fn calculate_final_balances(
        vault_token_source: &mut InterfaceAccount<'_, TokenAccount>,
        vault_token_destination: &mut InterfaceAccount<'_, TokenAccount>,
        unminted_source_balance: u64,
        unminted_destination_balance: u64,
    ) -> Result<(u64, u64)> {
        vault_token_source.reload()?;
        vault_token_destination.reload()?;

        // calculate final available balances
        let final_available_source_balance = vault_token_source
            .amount
            .checked_sub(unminted_source_balance)
            .unwrap();
        let final_available_destination_balance = vault_token_destination
            .amount
            .checked_sub(unminted_destination_balance)
            .unwrap();

        Ok((
            final_available_source_balance,
            final_available_destination_balance,
        ))
    }
}
