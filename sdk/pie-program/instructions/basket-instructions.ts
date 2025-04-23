import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { PDAs } from "../pda";
import { Pie } from "../../../target/types/pie";
import { NATIVE_MINT } from "@solana/spl-token";
import { CreateBasketArgs } from "../types";
import {
  getOrCreateTokenAccountTx,
  isValidTransaction,
} from "../../utils/helper";

/**
 * Class for handling basket-related instructions
 */
export class BasketInstructions {
  constructor(
    private readonly program: Program<Pie>,
    private readonly pda: PDAs
  ) {}

  /**
   * Creates a basket
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
    const basketMint = this.pda.basketMint({ basketId });

    const createBasketTx = await this.program.methods
      .createBasket(args)
      .accountsPartial({
        creator,
        programState: this.pda.programState,
        metadataAccount: this.pda.metadata({ mint: basketMint }),
        basketConfig: this.pda.basketConfig({ basketId }),
        basketMint: basketMint,
      })
      .transaction();

    const { tx: createPlatformFeeTokenAccountTx } =
      await getOrCreateTokenAccountTx(
        this.program.provider.connection,
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
   * Updates the rebalancer for a basket
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
        basketConfig: this.pda.basketConfig({ basketId }),
      })
      .transaction();
  }

  /**
   * Starts rebalancing for a basket
   */
  async startRebalancing({
    rebalancer,
    basketId,
  }: {
    rebalancer: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    return await this.program.methods
      .startRebalancing()
      .accountsPartial({
        rebalancer,
        basketConfig: this.pda.basketConfig({ basketId }),
      })
      .transaction();
  }

  /**
   * Stops rebalancing for a basket
   */
  async stopRebalancing({
    rebalancer,
    basketId,
  }: {
    rebalancer: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    return await this.program.methods
      .stopRebalancing()
      .accountsPartial({
        rebalancer,
        basketConfig: this.pda.basketConfig({ basketId }),
      })
      .transaction();
  }
}
