
use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub bump: u8,
    pub admin: Pubkey,
    pub counter: u32
}