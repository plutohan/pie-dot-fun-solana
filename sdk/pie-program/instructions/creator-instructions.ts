import { BN } from "@coral-xyz/anchor";
import {
  Transaction,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import {
  BasketComponent,
  CreateBasketArgs,
  CreateBasketWithTokenWeightsArgs,
} from "../types";
import {
  getTokenPriceAndDecimals,
  isValidTransaction,
} from "../../utils/helper";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import { NATIVE_MINT } from "@solana/spl-token";
import { BASIS_POINTS, SYS_DECIMALS } from "../../constants";

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
    const programState = await this.getProgramState();
    const basketMint = this.basketMintPDA({ basketId });

    const createBasketTx = await this.program.methods
      .createBasket(args)
      .accountsPartial({
        creator,
        programState: this.programStatePDA(),
        metadataAccount: this.metadataPDA({ mint: basketMint }),
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint: basketMint,
        platformFeeWallet: programState.platformFeeWallet,
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
   * Creates a basket with token weights
   * @param creator - The creator account.
   * @param args - CreateBasketWithTokenWeightsArgs
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
  async createBasketWithTokenWeights({
    creator,
    args,
    targetBasketTokenPriceInLamports = new BN(0.1 * LAMPORTS_PER_SOL),
  }: {
    creator: PublicKey;
    args: CreateBasketWithTokenWeightsArgs;
    targetBasketTokenPriceInLamports?: BN;
  }): Promise<Transaction> {
    const programState = await this.getProgramState();
    const basketId = programState.basketCounter;

    const totalWeightInBp = args.tokenWeights.reduce(
      (acc, weight) => acc + weight.weightInBp,
      0
    );

    if (totalWeightInBp !== 10000) {
      throw new Error("Total weight in basis points must be 10000");
    }

    const tokenPriceAndDecimals = await Promise.all(
      args.tokenWeights.map(async (weight) => {
        return getTokenPriceAndDecimals({
          mint: weight.mint,
          connection: this.connection,
        });
      })
    );

    const components: BasketComponent[] = [];

    for (let i = 0; i < args.tokenWeights.length; i++) {
      const { price, decimals } = tokenPriceAndDecimals[i];
      const quantityInSysDecimal = targetBasketTokenPriceInLamports
        .mul(new BN(args.tokenWeights[i].weightInBp))
        .div(new BN(BASIS_POINTS))
        .mul(new BN(10 ** decimals))
        // .mul(new BN(SYS_DECIMALS))
        .div(new BN(price.rawAmount));

      components.push({
        mint: args.tokenWeights[i].mint,
        quantityInSysDecimal,
      });
    }

    console.log({ components });

    const createBasketTx = await this.createBasket({
      creator,
      args: { ...args, components },
      basketId,
    });

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

  /**
   * Inactivate a basket
   */
  async inactivateBasket({
    creator,
    basketId,
  }: {
    creator: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    return await this.program.methods
      .inactivateBasket()
      .accountsPartial({
        creator,
        basketConfig: this.basketConfigPDA({ basketId }),
      })
      .transaction();
  }
}
