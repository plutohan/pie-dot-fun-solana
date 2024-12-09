use crate::error::PieError;

#[derive(Clone, Debug, PartialEq)]
pub struct Calculator {}

// Ref: https://github.com/raydium-io/raydium-amm/blob/b1d59c0e57c4f639683c3256f4b0b481efa51866/program/src/math.rs#L46
impl Calculator {
    pub fn to_u128(val: u64) -> Result<u128, PieError> {
        val.try_into().map_err(|_| PieError::ConversionFailure)
    }

    pub fn to_u64(val: u128) -> Result<u64, PieError> {
        val.try_into().map_err(|_| PieError::ConversionFailure)
    }

    pub fn to_u32(val: u64) -> Result<u32, PieError> {
        val.try_into().map_err(|_| PieError::ConversionFailure)
    }

    pub fn normalize_decimal_v2(val: u64, native_decimal: u64, sys_decimal_value: u64) -> u128 {
        // e.g., amm.sys_decimal_value is 10**6, native_decimal is 10**9, price is 1.23, this function will convert (1.23*10**9) -> (1.23*10**6)
        //let ret:u64 = val.checked_mul(amm.sys_decimal_value).unwrap().checked_div((10 as u64).pow(native_decimal.into())).unwrap();
        let ret_mut = Self::to_u128(val).unwrap()
            .checked_mul(Self::to_u128(sys_decimal_value).unwrap())
            .unwrap();
        let ret = ret_mut
            .checked_div(10u128.checked_pow(Self::to_u32(native_decimal).unwrap()).unwrap())
            .unwrap();
        ret
    }

    pub fn restore_decimal(val: u128, native_decimal: u64, sys_decimal_value: u64) -> u128 {
        // e.g., amm.sys_decimal_value is 10**6, native_decimal is 10**9, price is 1.23, this function will convert (1.23*10**6) -> (1.23*10**9)
        // let ret:u64 = val.checked_mul((10 as u64).pow(native_decimal.into())).unwrap().checked_div(amm.sys_decimal_value).unwrap();
        let ret_mut = val
            .checked_mul(10u128.checked_pow(Self::to_u32(native_decimal).unwrap()).unwrap())
            .unwrap();
        let ret = ret_mut.checked_div(Self::to_u128(sys_decimal_value).unwrap()).unwrap();
        ret
    }
}