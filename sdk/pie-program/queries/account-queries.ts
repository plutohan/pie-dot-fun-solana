import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { BasketConfig, ProgramState, UserFund } from "../types";
import { PDAs } from "../pda";
import { Pie } from "../../../target/types/pie";

/**
 * Class for handling account queries
 */
export class AccountQueries {
  constructor(
    private readonly program: Program<Pie>,
    private readonly pda: PDAs
  ) {}

  /**
   * Fetches the program state
   */
  async getProgramState(): Promise<ProgramState | null> {
    try {
      return await this.program.account.programState.fetch(
        this.pda.programState
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches a basket config for a given basket ID
   */
  async getBasketConfig({
    basketId,
  }: {
    basketId: BN;
  }): Promise<BasketConfig | null> {
    const basketConfigPDA = this.pda.basketConfig({ basketId });
    try {
      return await this.program.account.basketConfig.fetch(basketConfigPDA);
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches a user fund for a given user and basket ID
   */
  async getUserFund({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): Promise<UserFund | null> {
    const userFundPDA = this.pda.userFund({ user, basketId });
    try {
      return await this.program.account.userFund.fetch(userFundPDA);
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches all basket vaults for a given basket ID
   */
  async getBasketVaults({ basketId }: { basketId: BN }): Promise<
    {
      mint: PublicKey;
      balance: number;
    }[]
  > {
    const basketConfig = await this.getBasketConfig({ basketId });
    if (!basketConfig) return [];

    const tokenMints = [];

    for (const component of basketConfig.components) {
      tokenMints.push(new PublicKey(component.mint));
      // Token balances will be fetched by the TokenQueries class
    }

    return tokenMints.map((mint) => ({
      mint,
      balance: 0, // This will be populated by the PieProgram class
    }));
  }
}
