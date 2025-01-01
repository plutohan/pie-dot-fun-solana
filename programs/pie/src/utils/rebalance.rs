use crate::error::PieError;
use crate::utils::Calculator;
use crate::BasketConfig;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
#[derive(Clone, Debug, PartialEq)]
pub struct Rebalance {}

impl Rebalance {
    pub fn prepare_rebalancing(
        basket_config: &mut BasketConfig,
        vault_token_source: &Account<'_, TokenAccount>,
        vault_token_destination: &Account<'_, TokenAccount>,
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
            unminted_source_balance = initial_available_source_balance - vault_token_source.amount;
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
            unminted_destination_balance =
                initial_available_destination_balance - vault_token_destination.amount;
        }

        Ok((
            initial_available_source_balance,
            initial_available_destination_balance,
            unminted_source_balance,
            unminted_destination_balance,
        ))
    }

    pub fn finalize_rebalancing(
        basket_config: &mut BasketConfig,
        vault_token_source: &mut Account<'_, TokenAccount>,
        vault_token_destination: &mut Account<'_, TokenAccount>,
        basket_total_supply: u64,
        unminted_source_balance: u64,
        unminted_destination_balance: u64,
    ) -> Result<(u64, u64)> {
        vault_token_source.reload()?;
        vault_token_destination.reload()?;

        // calculate final available balances
        let final_available_source_balance = vault_token_source.amount - unminted_source_balance;
        let final_available_destination_balance =
            vault_token_destination.amount - unminted_destination_balance;

        // remove input component if final available balance is 0
        if final_available_source_balance == 0 {
            basket_config.remove_component(vault_token_source.mint);
        } else {
            basket_config.upsert_component(
                vault_token_source.mint,
                final_available_source_balance,
                basket_total_supply,
            )?;
        }

        basket_config.upsert_component(
            vault_token_destination.mint,
            final_available_destination_balance,
            basket_total_supply,
        )?;

        Ok((
            final_available_source_balance,
            final_available_destination_balance,
        ))
    }
}
