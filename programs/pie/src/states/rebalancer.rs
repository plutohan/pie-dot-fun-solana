use anchor_lang::prelude::*;

#[account]
pub struct RebalancerState {
    pub balancer: Pubkey,
}

impl Space for RebalancerState {
    const INIT_SPACE: usize = 8  // Account discriminator added by Anchor for each account
        + 32; // Size of Pubkey for balancer
}