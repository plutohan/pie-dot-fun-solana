use anchor_lang::prelude::*;

#[error_code]
pub enum PieError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,

    #[msg("Program initialized")]
    ProgramInitialized,

    #[msg("Invalid initialized admin address")]
    InvalidInitializeAdminAddress,

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

    #[msg("Not in rebalancing")]
    NotInRebalancing,

    #[msg("Already rebalancing")]
    AlreadyRebalancing
}
