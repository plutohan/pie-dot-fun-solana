
use anchor_lang::prelude::*;

#[account]
pub struct ProgramState {
    pub bump: u8,
    pub admin: Pubkey,
    pub basket_counter: u32
}