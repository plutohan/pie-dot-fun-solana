use anchor_lang::{prelude::Pubkey, pubkey};

pub const PROGRAM_STATE: &[u8] = b"program_state";
pub const USER_FUND: &[u8] = b"user_fund";

pub const BASKET_MINT: &[u8] = b"basket_mint";
pub const BASKET_CONFIG: &[u8] = b"basket_config";

pub const BASKET_DECIMALS: u8 = 6;
pub const SYS_DECIMALS: u64 = 1_000_000;
pub const MAX_COMPONENTS: u8 = 30;
pub const MAX_WHITELISTED_CREATORS: u8 = 50;
pub const NATIVE_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const INITIALIZER: Pubkey = pubkey!("6tfUrp38Q5jRysrgLhNadxmrmXVKt7Rz5dC593x1wu1Q");

pub const BASIS_POINTS: u64 = 10_000;
