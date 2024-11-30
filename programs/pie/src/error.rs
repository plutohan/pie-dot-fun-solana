
use anchor_lang::prelude::*;

#[error_code]
pub enum PieError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,

    #[msg("Can't found rebalancer info.")]
    RebalancerNotFound,

    #[msg("Max asset exceeded")]
    MaxAssetsExceeded,

    #[msg("Insufficient Balance")]
    InsufficientBalance,

    #[msg("Invalid Amount")]
    InvalidAmount,

    #[msg("Component not found")]
    ComponentNotFound,

    #[msg("Creator state not provided")]
    CreatorStateNotProvided,
}
