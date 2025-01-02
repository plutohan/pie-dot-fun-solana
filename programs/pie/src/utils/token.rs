use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self},
    token_interface::TokenAccount,
};

use crate::{ProgramState, BASIS_POINTS};

pub fn transfer_from_pool_vault_to_user<'info>(
    from_vault: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            token::Transfer {
                from: from_vault.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )
}


pub fn transfer_from_user_to_pool_vault<'info>(
    from: &AccountInfo<'info>,
    to_vault: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }

    let from_token_info = from.to_account_info();

    token::transfer(
        CpiContext::new(
            token_program.to_account_info(),
            token::Transfer {
                from: from_token_info,
                to: to_vault.to_account_info(),
                authority: authority.to_account_info(),
            },
        ),
        amount,
    )
}

pub fn transfer_fees<'info>(
    source_account: &AccountInfo<'info>,
    platform_fee_account: &AccountInfo<'info>,
    creator_fee_account: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    platform_fee_amount: u64,
    creator_fee_amount: u64,
) -> Result<()> {
    // Transfer platform fee to platform fee wallet
    if platform_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            source_account,
            platform_fee_account,
            authority,
            token_program,
            platform_fee_amount,
        )?;
    }

    // Transfer creator fee to creator wallet
    if creator_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            source_account,
            creator_fee_account,
            authority,
            token_program,
            creator_fee_amount,
        )?;
    }

    Ok(())
}

pub fn calculate_fee_amount(program_state: &ProgramState, amount: u64) -> Result<(u64, u64)> {
    let platform_fee_amount = amount
        .checked_mul(program_state.platform_fee_percentage)
        .unwrap()
        .checked_div(BASIS_POINTS)
        .unwrap();
    let creator_fee_amount = amount
        .checked_mul(program_state.creator_fee_percentage)
        .unwrap()
        .checked_div(BASIS_POINTS)
        .unwrap();
    Ok((platform_fee_amount, creator_fee_amount))
}

pub fn calculate_amounts_swapped_and_received<'info>(
    token_source: &Box<InterfaceAccount<'info, TokenAccount>>,
    token_destination: &Box<InterfaceAccount<'info, TokenAccount>>,
    balance_in_before: u64,
    balance_out_before: u64,
) -> Result<(u64, u64)> {
    let balance_in_after = token_source.amount;
    let balance_out_after = token_destination.amount;

    let amount_swapped = balance_in_before.checked_sub(balance_in_after).unwrap();
    let amount_received = balance_out_after.checked_sub(balance_out_before).unwrap();

    Ok((amount_swapped, amount_received))
}
