import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import {
  buildClmmRemainingAccounts,
  getTokenAccount,
  isValidTransaction,
} from "../../utils/helper";
import {
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import {
  getPdaExBitmapAccount,
  getPdaObservationId,
  MAX_SQRT_PRICE_X64,
  MIN_SQRT_PRICE_X64,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";

/**
 * Class for handling sell-related instructions
 */
export class SellInstructions extends ProgramStateManager {
  constructor(
    readonly connection: Connection,
    readonly programId: PublicKey,
    readonly raydium: Raydium
  ) {
    super(programId, connection);
  }

  /**
   * Sells a component.
   * @param user - The user account.
   * @param inputMint - The input mint.
   * @param basketId - The basket ID.
   * @param amountIn - The amount in.
   * @param minimumAmountOut - The minimum amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponent({
    user,
    inputMint,
    basketId,
    amountIn,
    minimumAmountOut,
    ammId,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    inputMint: PublicKey;
    basketId: BN;
    amountIn: number;
    minimumAmountOut: number;
    ammId: string;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketMint = this.basketMintPDA({ basketId });
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });

    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const basketConfig = this.basketConfigPDA({ basketId });

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: createNativeMintATATx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        user
      );

    if (createNativeMintATA && isValidTransaction(createNativeMintATATx)) {
      tx.add(createNativeMintATATx);
    }

    const sellComponentTx = await this.program.methods
      .sellComponent(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA(),
        basketConfig: basketConfig,
        basketMint: basketMint,
        amm: new PublicKey(ammId),
        userFund: this.userFundPDA({ user, basketId }),
        ammAuthority: new PublicKey(poolKeys.authority),
        ammOpenOrders: new PublicKey(poolKeys.openOrders),
        ammCoinVault: new PublicKey(poolKeys.vault.A),
        ammPcVault: new PublicKey(poolKeys.vault.B),
        marketProgram: new PublicKey(poolKeys.marketProgramId),
        market: new PublicKey(poolKeys.marketId),
        marketBids: new PublicKey(poolKeys.marketBids),
        marketAsks: new PublicKey(poolKeys.marketAsks),
        marketEventQueue: new PublicKey(poolKeys.marketEventQueue),
        marketCoinVault: new PublicKey(poolKeys.marketBaseVault),
        marketPcVault: new PublicKey(poolKeys.marketQuoteVault),
        marketVaultSigner: new PublicKey(poolKeys.marketAuthority),
        ammProgram: new PublicKey(poolKeys.programId),
        userTokenDestination: outputTokenAccount,
        vaultTokenSource: inputTokenAccount,
        vaultTokenSourceMint: new PublicKey(mintIn),
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
      })
      .transaction();
    tx.add(sellComponentTx);

    if (unwrapSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }

    return tx;
  }

  /**
   * Sell a component CPMM.
   * @param user - The user also payer.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponentCpmm({
    user,
    basketId,
    inputMint,
    amountIn,
    minimumAmountOut,
    poolId,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    basketId: BN;
    inputMint: PublicKey;
    amountIn: number;
    minimumAmountOut: number;
    poolId: string;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA({ basketId });
    const basketMint = this.basketMintPDA({ basketId });

    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        user
      );

    if (createNativeMintATA && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const sellComponentTx = await this.program.methods
      .sellComponentCpmm(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA(),
        basketConfig: basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        basketMint: basketMint,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        authority: new PublicKey(poolKeys.authority),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        vaultTokenSource: inputTokenAccount,
        userTokenDestination: outputTokenAccount,
        vaultTokenSourceMint: baseIn ? mintA : mintB,
        userTokenDestinationMint: baseIn ? mintB : mintA,
        inputVault: new PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
        outputVault: new PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
        inputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintA" : "mintB"].programId ?? TOKEN_PROGRAM_ID
        ),
        outputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintB" : "mintA"].programId ?? TOKEN_PROGRAM_ID
        ),
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();

    tx.add(sellComponentTx);

    if (unwrapSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }
    return tx;
  }

  /**
   * Sell a component CLMM.
   * @param user - The user also payer.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponentClmm({
    user,
    basketId,
    amountIn,
    inputMint,
    poolId,
    slippage,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    basketId: BN;
    amountIn: BN;
    inputMint: PublicKey;
    poolId: string;
    slippage: number;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA({ basketId });

    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;
    const baseIn = inputMint.toString() === poolInfo.mintA.address;

    const { minAmountOut, remainingAccounts } =
      PoolUtils.computeAmountOutFormat({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountIn,
        tokenOut: poolInfo[baseIn ? "mintB" : "mintA"],
        slippage,
        epochInfo: await this.raydium.fetchEpochInfo(),
      });

    let sqrtPriceLimitX64: BN;
    sqrtPriceLimitX64 = baseIn
      ? MIN_SQRT_PRICE_X64.add(new BN(1))
      : MAX_SQRT_PRICE_X64.sub(new BN(1));

    const [programId, id] = [
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
    ];

    // const [mintAVault, mintBVault] = [
    //   new PublicKey(poolKeys.vault.A),
    //   new PublicKey(poolKeys.vault.B),
    // ];
    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(inputMint),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(NATIVE_MINT),
        user,
        user
      );

    if (createNativeMintATA && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    // @TODO should be minAmountOut.amount.raw but I get negative value
    const otherAmountThreshold = new BN(0);

    const sellComponentTx = await this.program.methods
      .sellComponentClmm(amountIn, otherAmountThreshold, sqrtPriceLimitX64)
      .accountsPartial({
        user: user,
        programState: this.programStatePDA(),
        basketConfig: basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        vaultTokenSource: inputTokenAccount,
        userTokenDestination: outputTokenAccount,
        vaultTokenSourceMint: baseIn ? mintA : mintB,
        userTokenDestinationMint: baseIn ? mintB : mintA,
        inputVault: new PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
        outputVault: new PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
        inputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintA" : "mintB"].programId ?? TOKEN_PROGRAM_ID
        ),
        observationState: new PublicKey(clmmPoolInfo.observationId),
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(programId, id).publicKey
        )
      )
      .transaction();

    tx.add(sellComponentTx);

    if (unwrapSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }
    return tx;
  }

  /**
   * Withdraws a WSOL from the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of WSOL to deposit.
   * @returns A promise that resolves to a transaction.
   */
  async withdrawWsol({
    user,
    basketId,
    amount,
    userWsolAccount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: string;
    userWsolAccount: PublicKey;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({ basketId });
    const tx = new Transaction();

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        NATIVE_MINT,
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const withdrawWsolTx = await this.program.methods
      .withdrawWsol(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userWsolAccount,
        vaultWsolAccount: outputTokenAccount,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
      })
      .transaction();

    tx.add(withdrawWsolTx);

    return tx;
  }

  /**
   * Withdraws a component from the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of component to withdraw.
   * @param mint - The mint of the component.
   * @returns A promise that resolves to a transaction.
   */
  async withdrawComponent({
    user,
    basketId,
    amount,
    mint,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: string;
    mint: PublicKey;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({ basketId });
    const tx = new Transaction();

    const { tokenAccount: vaultTokenAccount } = await getOrCreateTokenAccountTx(
      this.connection,
      mint,
      user,
      basketConfig
    );

    const { tokenAccount: userTokenAccount, tx: createUserTokenAccountTx } =
      await getOrCreateTokenAccountTx(this.connection, mint, user, user);

    if (isValidTransaction(createUserTokenAccountTx)) {
      tx.add(createUserTokenAccountTx);
    }

    const withdrawComponentTx = await this.program.methods
      .withdrawComponent(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userTokenAccount,
        vaultTokenAccount,
      })
      .transaction();

    tx.add(withdrawComponentTx);

    return tx;
  }
  /**
   * Redeems a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount.
   * @returns A promise that resolves to a transaction.
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
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    const userBasketTokenAccount = getAssociatedTokenAddressSync(
      basketMint,
      user,
      false
    );
    const burnBasketTokenTx = await this.program.methods
      .redeemBasketToken(new BN(amount))
      .accountsPartial({
        programState: this.programStatePDA(),
        user,
        basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        basketMint,
        userBasketTokenAccount: userBasketTokenAccount,
      })
      .transaction();
    return burnBasketTokenTx;
  }
}
