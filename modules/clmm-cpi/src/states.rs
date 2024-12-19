use anchor_lang::prelude::*;

pub const AMM_CONFIG_SEED: &str = "amm_config";
pub const POOL_SEED: &str = "pool";
pub const POOL_VAULT_SEED: &str = "pool_vault";
pub const POOL_REWARD_VAULT_SEED: &str = "pool_reward_vault";
pub const POOL_TICK_ARRAY_BITMAP_SEED: &str = "pool_tick_array_bitmap_extension";
/// Seed to derive account address and signature
pub const POSITION_SEED: &str = "position";
pub const TICK_ARRAY_SEED: &str = "tick_array";
// Seed to derive account address and signature
pub const OBSERVATION_SEED: &str = "observation";

// Number of ObservationState element
pub const OBSERVATION_NUM: usize = 1000;
pub const TICK_ARRAY_SIZE_USIZE: usize = 60;
pub const TICK_ARRAY_SIZE: i32 = 60;
// Number of rewards Token
pub const REWARD_NUM: usize = 3;
pub const OBSERVATION_UPDATE_DURATION_DEFAULT: u16 = 15;
pub const FEE_RATE_DENOMINATOR_VALUE: u32 = 1_000_000;

/// Holds the current owner of the factory
#[account]
#[derive(Default, Debug)]
pub struct AmmConfig {
    /// Bump to identify PDA
    pub bump: u8,
    pub index: u16,
    /// Address of the protocol owner
    pub owner: Pubkey,
    /// The protocol fee
    pub protocol_fee_rate: u32,
    /// The trade fee, denominated in hundredths of a bip (10^-6)
    pub trade_fee_rate: u32,
    /// The tick spacing
    pub tick_spacing: u16,
    /// The fund fee, denominated in hundredths of a bip (10^-6)
    pub fund_fee_rate: u32,
    // padding space for upgrade
    pub padding_u32: u32,
    pub fund_owner: Pubkey,
    pub padding: [u64; 3],
}

impl AmmConfig {
    pub const LEN: usize = 8 + 1 + 2 + 32 + 4 + 4 + 2 + 64;
}

/// The pool state
///
/// PDA of `[POOL_SEED, config, token_mint_0, token_mint_1]`
///
#[account(zero_copy(unsafe))]
#[repr(C, packed)]
#[derive(Default, Debug)]
pub struct PoolState {
    /// Bump to identify PDA
    pub bump: [u8; 1],
    // Which config the pool belongs
    pub amm_config: Pubkey,
    // Pool creator
    pub owner: Pubkey,

    /// Token pair of the pool, where token_mint_0 address < token_mint_1 address
    pub token_mint_0: Pubkey,
    pub token_mint_1: Pubkey,

    /// Token pair vault
    pub token_vault_0: Pubkey,
    pub token_vault_1: Pubkey,

    /// observation account key
    pub observation_key: Pubkey,

    /// mint0 and mint1 decimals
    pub mint_decimals_0: u8,
    pub mint_decimals_1: u8,

    /// The minimum number of ticks between initialized ticks
    pub tick_spacing: u16,
    /// The currently in range liquidity available to the pool.
    pub liquidity: u128,
    /// The current price of the pool as a sqrt(token_1/token_0) Q64.64 value
    pub sqrt_price_x64: u128,
    /// The current tick of the pool, i.e. according to the last tick transition that was run.
    pub tick_current: i32,

    /// the most-recently updated index of the observations array
    pub observation_index: u16,
    pub observation_update_duration: u16,

    /// The fee growth as a Q64.64 number, i.e. fees of token_0 and token_1 collected per
    /// unit of liquidity for the entire life of the pool.
    pub fee_growth_global_0_x64: u128,
    pub fee_growth_global_1_x64: u128,

    /// The amounts of token_0 and token_1 that are owed to the protocol.
    pub protocol_fees_token_0: u64,
    pub protocol_fees_token_1: u64,

    /// The amounts in and out of swap token_0 and token_1
    pub swap_in_amount_token_0: u128,
    pub swap_out_amount_token_1: u128,
    pub swap_in_amount_token_1: u128,
    pub swap_out_amount_token_0: u128,

    /// Bitwise representation of the state of the pool
    /// bit0, 1: disable open position and increase liquidity, 0: normal
    /// bit1, 1: disable decrease liquidity, 0: normal
    /// bit2, 1: disable collect fee, 0: normal
    /// bit3, 1: disable collect reward, 0: normal
    /// bit4, 1: disable swap, 0: normal
    pub status: u8,
    /// Leave blank for future use
    pub padding: [u8; 7],

    pub reward_infos: [RewardInfo; REWARD_NUM],

    /// Packed initialized tick array state
    pub tick_array_bitmap: [u64; 16],

    /// except protocol_fee and fund_fee
    pub total_fees_token_0: u64,
    /// except protocol_fee and fund_fee
    pub total_fees_claimed_token_0: u64,
    pub total_fees_token_1: u64,
    pub total_fees_claimed_token_1: u64,

    pub fund_fees_token_0: u64,
    pub fund_fees_token_1: u64,

    // The timestamp allowed for swap in the pool.
    pub open_time: u64,

    // Unused bytes for future upgrades.
    pub padding1: [u64; 25],
    pub padding2: [u64; 32],
}

impl PoolState {
    pub const LEN: usize = 8
        + 1
        + 32 * 7
        + 1
        + 1
        + 2
        + 16
        + 16
        + 4
        + 2
        + 2
        + 16
        + 16
        + 8
        + 8
        + 16
        + 16
        + 16
        + 16
        + 8
        + RewardInfo::LEN * REWARD_NUM
        + 8 * 16
        + 512;
}

#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize, Debug, PartialEq)]
/// State of reward
pub enum RewardState {
    /// Reward not initialized
    Uninitialized,
    /// Reward initialized, but reward time is not start
    Initialized,
    /// Reward in progress
    Opening,
    /// Reward end, reward time expire or
    Ended,
}

#[zero_copy(unsafe)]
#[repr(C, packed)]
#[derive(Default, Debug, PartialEq, Eq)]
pub struct RewardInfo {
    /// Reward state
    pub reward_state: u8,
    /// Reward open time
    pub open_time: u64,
    /// Reward end time
    pub end_time: u64,
    /// Reward last update time
    pub last_update_time: u64,
    /// Q64.64 number indicates how many tokens per second are earned per unit of liquidity.
    pub emissions_per_second_x64: u128,
    /// The total amount of reward emissioned
    pub reward_total_emissioned: u64,
    /// The total amount of claimed reward
    pub reward_claimed: u64,
    /// Reward token mint.
    pub token_mint: Pubkey,
    /// Reward vault token account.
    pub token_vault: Pubkey,
    /// The owner that has permission to set reward param
    pub authority: Pubkey,
    /// Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward
    /// emissions were turned on.
    pub reward_growth_global_x64: u128,
}

impl RewardInfo {
    pub const LEN: usize = 1 + 8 + 8 + 8 + 16 + 8 + 8 + 32 + 32 + 32 + 16;
}

/// Info stored for each user's position
#[account]
#[derive(Default, Debug)]
pub struct ProtocolPositionState {
    /// Bump to identify PDA
    pub bump: u8,

    /// The ID of the pool with which this token is connected
    pub pool_id: Pubkey,

    /// The lower bound tick of the position
    pub tick_lower_index: i32,

    /// The upper bound tick of the position
    pub tick_upper_index: i32,

    /// The amount of liquidity owned by this position
    pub liquidity: u128,

    /// The token_0 fee growth per unit of liquidity as of the last update to liquidity or fees owed
    pub fee_growth_inside_0_last_x64: u128,

    /// The token_1 fee growth per unit of liquidity as of the last update to liquidity or fees owed
    pub fee_growth_inside_1_last_x64: u128,

    /// The fees owed to the position owner in token_0
    pub token_fees_owed_0: u64,

    /// The fees owed to the position owner in token_1
    pub token_fees_owed_1: u64,

    /// The reward growth per unit of liquidity as of the last update to liquidity
    pub reward_growth_inside: [u128; REWARD_NUM], // 24
    // Unused bytes for future upgrades.
    pub padding: [u64; 8],
}

impl ProtocolPositionState {
    pub const LEN: usize = 8 + 1 + 32 + 4 + 4 + 16 + 16 + 16 + 8 + 8 + 16 * REWARD_NUM + 64;
}

#[account(zero_copy(unsafe))]
#[repr(C, packed)]
pub struct TickArrayState {
    pub pool_id: Pubkey,
    pub start_tick_index: i32,
    pub ticks: [TickState; TICK_ARRAY_SIZE_USIZE],
    pub initialized_tick_count: u8,
    // Unused bytes for future upgrades.
    pub padding: [u8; 115],
}

impl TickArrayState {
    pub const LEN: usize = 8 + 32 + 4 + TickState::LEN * TICK_ARRAY_SIZE_USIZE + 1 + 115;
}

#[zero_copy(unsafe)]
#[repr(C, packed)]
#[derive(Default, Debug)]
pub struct TickState {
    pub tick: i32,
    /// Amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left)
    pub liquidity_net: i128,
    /// The total position liquidity that references this tick
    pub liquidity_gross: u128,

    /// Fee growth per unit of liquidity on the _other_ side of this tick (relative to the current tick)
    /// only has relative meaning, not absolute — the value depends on when the tick is initialized
    pub fee_growth_outside_0_x64: u128,
    pub fee_growth_outside_1_x64: u128,

    // Reward growth per unit of liquidity like fee, array of Q64.64
    pub reward_growths_outside_x64: [u128; REWARD_NUM],
    // Unused bytes for future upgrades.
    pub padding: [u32; 13],
}

impl TickState {
    pub const LEN: usize = 4 + 16 + 16 + 16 + 16 + 16 * REWARD_NUM + 16 + 16 + 8 + 8 + 4;
}

const EXTENSION_TICKARRAY_BITMAP_SIZE: usize = 14;

/// The element of observations in ObservationState
#[zero_copy(unsafe)]
#[repr(C, packed)]
#[derive(Default, Debug)]
pub struct Observation {
    /// The block timestamp of the observation
    pub block_timestamp: u32,
    /// the price of the observation timestamp, Q64.64
    pub sqrt_price_x64: u128,
    /// the cumulative of price during the duration time, Q64.64
    pub cumulative_time_price_x64: u128,
    /// padding for feature update
    pub padding: u128,
}
impl Observation {
    pub const LEN: usize = 4 + 16 + 16 + 16;
}

#[account(zero_copy(unsafe))]
#[repr(C, packed)]
pub struct ObservationState {
    /// Whether the ObservationState is initialized
    pub initialized: bool,
    pub pool_id: Pubkey,
    /// observation array
    pub observations: [Observation; OBSERVATION_NUM],
    /// padding for feature update
    pub padding: [u128; 5],
}

impl ObservationState {
    pub const LEN: usize = 8 + 1 + 32 + (Observation::LEN * OBSERVATION_NUM) + 16 * 5;
}
