use crate::{error::PieError, SYS_DECIMALS};

#[derive(Clone, Debug, PartialEq)]
pub struct Calculator {}

// Ref: https://github.com/raydium-io/raydium-amm/blob/b1d59c0e57c4f639683c3256f4b0b481efa51866/program/src/math.rs#L46
impl Calculator {
    pub fn to_u64(val: u128) -> Result<u64, PieError> {
        val.try_into().map_err(|_| PieError::ConversionFailure)
    }

    pub fn apply_sys_decimal(val: u64) -> u128 {
        let val: u128 = val.into();
        val.checked_mul(SYS_DECIMALS.into()).unwrap()
    }

    pub fn restore_raw_decimal(val: u128) -> u64 {
        Self::to_u64(val.checked_div(SYS_DECIMALS.into()).unwrap()).unwrap()
    }

    pub fn restore_raw_decimal_round_up(val: u128) -> u64 {
        if val % SYS_DECIMALS as u128 != 0 {
            return Self::restore_raw_decimal(val) + 1;
        }
        Self::restore_raw_decimal(val)
    }
}
