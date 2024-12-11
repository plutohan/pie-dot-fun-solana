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

pub fn calculate_fee_amount(program_state: &ProgramState, amount: u64) -> Result<(u64, u64)> {
    let platform_fee_percentage = program_state.platform_fee_percentage;
    let creator_fee_percentage = program_state
        .mint_redeem_fee_percentage
        .checked_sub(platform_fee_percentage)
        .unwrap();

    let platform_fee_amount = amount
        .checked_mul(platform_fee_percentage)
        .unwrap()
        .checked_div(BASIS_POINTS)
        .unwrap();
    let creator_fee_amount = amount
        .checked_mul(creator_fee_percentage)
        .unwrap()
        .checked_div(BASIS_POINTS)
        .unwrap();
    Ok((platform_fee_amount, creator_fee_amount))
}
