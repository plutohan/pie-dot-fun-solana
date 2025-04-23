import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { PDAs } from "../pda";
import { Pie } from "../../../target/types/pie";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getOrCreateTokenAccountTx } from "../../utils/helper";

/**
 * Class for handling token-related instructions
 */
export class TokenInstructions {
  constructor(
    private readonly program: Program<Pie>,
    private readonly pda: PDAs
  ) {}

  /**
   * Mints basket tokens
   */
  async mintBasketToken({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: string;
  }): Promise<Transaction> {
    const basketMint = this.pda.basketMint({ basketId });
    const tx = new Transaction();

    const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } =
      await getOrCreateTokenAccountTx(
        this.program.provider.connection,
        basketMint,
        user,
        user
      );

    if (userBasketTokenTx) {
      tx.add(userBasketTokenTx);
    }

    const mintBasketTokenTx = await this.program.methods
      .mintBasketToken(new BN(amount))
      .accountsPartial({
        user,
        basketConfig: this.pda.basketConfig({ basketId }),
        userFund: this.pda.userFund({ user, basketId }),
        basketMint,
        userBasketTokenAccount,
      })
      .transaction();

    tx.add(mintBasketTokenTx);

    return tx;
  }

  /**
   * Redeems basket tokens
   */
  async redeemBasketToken({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const basketMint = this.pda.basketMint({ basketId });
    const userBasketTokenAccount = getAssociatedTokenAddressSync(
      basketMint,
      user,
      true
    );

    return await this.program.methods
      .redeemBasketToken(new BN(amount))
      .accountsPartial({
        user,
        basketConfig: this.pda.basketConfig({ basketId }),
        userFund: this.pda.userFund({ user, basketId }),
        basketMint,
        userBasketTokenAccount,
      })
      .transaction();
  }
}
