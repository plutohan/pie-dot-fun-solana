import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { TokenBalance } from "../types";

/**
 * Class for handling token-related queries
 */
export class TokenQueries {
  constructor(private readonly connection: Connection) {}

  /**
   * Fetches the token balance for a given mint and owner
   */
  async getTokenBalance({
    mint,
    owner,
    commitment = "confirmed",
  }: {
    mint: PublicKey;
    owner: PublicKey;
    commitment?: Commitment;
  }): Promise<number> {
    const tokenAccount = getAssociatedTokenAddressSync(mint, owner, true);

    try {
      const balance = await this.connection.getTokenAccountBalance(
        tokenAccount,
        commitment
      );
      return Number(balance.value.amount);
    } catch (error) {
      // Return 0 if the token account doesn't exist
      return 0;
    }
  }

  /**
   * Fetches all token accounts with balances for a given owner
   */
  async getAllTokenAccountWithBalance({
    owner,
  }: {
    owner: PublicKey;
  }): Promise<TokenBalance[]> {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      owner,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // TOKEN_PROGRAM_ID
      }
    );

    return tokenAccounts.value.map((tokenAccount) => ({
      mint: new PublicKey(tokenAccount.account.data.parsed.info.mint),
      owner: new PublicKey(tokenAccount.account.data.parsed.info.owner),
      pubkey: tokenAccount.pubkey,
      tokenAmount: tokenAccount.account.data.parsed.info.tokenAmount,
    }));
  }
}
