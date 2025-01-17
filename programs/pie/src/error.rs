use anchor_lang::prelude::*;

#[error_code]
pub enum PieError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,

    #[msg("Program initialized")]
    ProgramInitialized,

    #[msg("Invalid fee")]
    InvalidFee,

    #[msg("Max asset exceeded")]
    MaxAssetsExceeded,

    #[msg("Insufficient Balance")]
    InsufficientBalance,

    #[msg("Invalid Basket")]
    InvalidBasket,

    #[msg("Invalid Amount")]
    InvalidAmount,

    #[msg("Component not found")]
    ComponentNotFound,

    #[msg("Not in rebalancing")]
    NotInRebalancing,

    #[msg("Already rebalancing")]
    AlreadyRebalancing,

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
    RebalancingInProgress,

    #[msg("Invalid component")]
    InvalidComponent,

    #[msg("Max whitelisted creators exceeded")]
    MaxWhitelistedCreatorsExceeded,

    #[msg("Invalid token program")]
    InvalidTokenProgram,
}
