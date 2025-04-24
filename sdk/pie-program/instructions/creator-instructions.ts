import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import { CreateBasketArgs } from "../types";
import { isValidTransaction } from "../../utils/helper";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import { NATIVE_MINT } from "@solana/spl-token";

/**
 * Class for handling creator-related instructions
 */
export class CreatorInstructions extends ProgramStateManager {
  constructor(readonly connection: Connection, readonly programId: PublicKey) {
    super(programId, connection);
  }

  /**
   * Creates a basket.
   * @param creator - The creator account.
   * @param args - The basket arguments.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
  async createBasket({
    creator,
    args,
    basketId,
  }: {
    creator: PublicKey;
    args: CreateBasketArgs;
    basketId: BN;
  }): Promise<Transaction> {
    const basketMint = this.basketMintPDA({ basketId });

    const createBasketTx = await this.program.methods
      .createBasket(args)
      .accountsPartial({
        creator,
        programState: this.programStatePDA(),
        metadataAccount: this.metadataPDA({ mint: basketMint }),
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint: basketMint,
      })
      .transaction();

    const { tx: createPlatformFeeTokenAccountTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(NATIVE_MINT),
        creator,
        creator
      );

    if (isValidTransaction(createPlatformFeeTokenAccountTx)) {
      createBasketTx.add(createPlatformFeeTokenAccountTx);
    }

    return createBasketTx;
  }

  /**
   * Update the rebalancer for a basket
   */
  async updateRebalancer({
    creator,
    basketId,
    newRebalancer,
  }: {
    creator: PublicKey;
    basketId: BN;
    newRebalancer: PublicKey;
  }): Promise<Transaction> {
    return await this.program.methods
      .updateRebalancer(newRebalancer)
      .accountsPartial({
        creator,
        basketConfig: this.basketConfigPDA({ basketId }),
      })
      .transaction();
  }
}
