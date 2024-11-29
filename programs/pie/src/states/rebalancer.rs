use anchor_lang::prelude::*;

#[account]
pub struct RebalancerState {
    pub balancer: Pubkey,
}