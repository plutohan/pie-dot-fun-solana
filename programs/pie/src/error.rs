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

    #[msg("Invalid fee")]
    InvalidFee,

    #[msg("Max asset exceeded")]
    MaxAssetsExceeded,

    #[msg("Invalid Basket")]
    InvalidBasket,

    #[msg("Insufficient Balance")]
    InsufficientBalance,

    #[msg("Invalid Amount")]
    InvalidAmount,

    #[msg("Component not found")]
    ComponentNotFound,

    #[msg("Not in rebalancing")]
    NotInRebalancing,

    #[msg("Already rebalancing")]
    AlreadyRebalancing,

    #[msg("Invalid margin value")]
    InvalidMargin,

    #[msg("Margin value for bottom exceeds the allowed limit")]
    InvalidMarginBottom,

    #[msg("Conversion to u64 failed with an overflow or underflow")]
    ConversionFailure,

    #[msg("Invalid basket mint")]
    InvalidBasketMint,
    
    #[msg("Duplicate component")]
    DuplicateComponent,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Invalid component quantity")]
    InvalidComponentQuantity,

    #[msg("Invalid quantity")]
    InvalidQuantity,

    #[msg("Rebalancing in process")]
    RebalancingInProgress
}
