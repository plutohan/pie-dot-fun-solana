use anchor_lang::{prelude::Pubkey, pubkey};

pub const PROGRAM_STATE: &[u8] = b"program_state";
pub const USER_FUND: &[u8] = b"user_fund";
pub const USER_BALANCE: &[u8] = b"user_balance";
pub const BASKET_MINT: &[u8] = b"basket_mint";
pub const BASKET_CONFIG: &[u8] = b"basket_config";

pub const BASKET_DECIMALS: u8 = 6;
pub const SYS_DECIMALS: u64 = 1_000_000;
pub const MAX_COMPONENTS: u8 = 15;
pub const MAX_BALANCES: u16 = 1000; // @TODO: need to test the max balances
pub const NATIVE_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const JUPITER_PROGRAM_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

pub const BASIS_POINTS: u64 = 10_000;
