#[derive(Clone, Debug, PartialEq)]
pub struct Calculator {}

impl Calculator {
    // Ref: https://github.com/raydium-io/raydium-amm/blob/b1d59c0e57c4f639683c3256f4b0b481efa51866/program/src/math.rs#L112
    pub fn normalize_decimal_v2(val: u64, native_decimal: u64, sys_decimal_value: u64) -> u128 {
        // e.g., amm.sys_decimal_value is 10**6, native_decimal is 10**9, price is 1.23, this function will convert (1.23*10**9) -> (1.23*10**6)
        //let ret:u64 = val.checked_mul(amm.sys_decimal_value).unwrap().checked_div((10 as u64).pow(native_decimal.into())).unwrap();
        let ret_mut = (val as u128)
            .checked_mul(sys_decimal_value.into())
            .unwrap();
        let ret = ret_mut
            .checked_div((10u128).checked_pow(native_decimal.into()).unwrap())
            .unwrap();
        ret
    }
}