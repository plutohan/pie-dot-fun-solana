use anchor_lang::prelude::*;

declare_id!("3DpBbvPMtKaDkHnP3FEKfvWBAYWT9LywfN3g8z27YwNf");

#[program]
pub mod pie {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
