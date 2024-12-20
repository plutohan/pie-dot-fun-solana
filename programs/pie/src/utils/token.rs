use anchor_lang::prelude::*;
use anchor_spl::token::{self};

use crate::{ProgramState, BASIS_POINTS};

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
    user_account: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    platform_fee_amount: u64,
    creator_fee_amount: u64,
) -> Result<()> {
    // Transfer platform fee to platform fee wallet
    if platform_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            source_account,
            platform_fee_account,
            user_account,
            token_program,
            platform_fee_amount,
        )?;
    }

    // Transfer creator fee to creator wallet
    if creator_fee_amount > 0 {
        transfer_from_user_to_pool_vault(
            source_account,
            creator_fee_account,
            user_account,
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
