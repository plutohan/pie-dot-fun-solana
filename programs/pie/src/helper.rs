use anchor_lang::prelude::*;
use std::str::FromStr;

use crate::Config;

const INITIALIZE_ADMIN: &str = "";

pub fn get_current_admin(program_state: &Account<Config>) -> Result<Pubkey> {
  if program_state.to_account_info().data_is_empty() {
      Ok(Pubkey::from_str(INITIALIZE_ADMIN).unwrap())
  } else {
      Ok(program_state.admin)
  }
}

