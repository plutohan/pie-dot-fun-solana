import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import {
  buildClmmRemainingAccounts,
  getTokenAccount,
  isValidTransaction,
  unwrapSolIx,
  wrapSOLIx,
} from "../../utils/helper";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import {
  CurveCalculator,
  getPdaExBitmapAccount,
  getPdaObservationId,
  MAX_SQRT_PRICE_X64,
  MIN_SQRT_PRICE_X64,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";

/**
 * Class for handling buy-related instructions
 */
export class BuyInstructions extends ProgramStateManager {
  constructor(
    readonly connection: Connection,
    readonly programId: PublicKey,
    readonly raydium: Raydium
  ) {
    super(programId, connection);
  }

  /**
   * Deposits WSOL into the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of WSOL to deposit.
   * @returns A promise that resolves to a transaction.
   */
  async depositWsol({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: string;
  }): Promise<Transaction> {
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    const basketConfig = await this.getBasketConfig({ basketId });

    const tx = new Transaction();

    const { tokenAccount: userWsolAccount, tx: createUserWsolAccountTx } =
      await getOrCreateTokenAccountTx(this.connection, NATIVE_MINT, user, user);

    if (isValidTransaction(createUserWsolAccountTx)) {
      tx.add(createUserWsolAccountTx);
    }

    tx.add(...wrapSOLIx(user, Number(amount)));

    const {
      tokenAccount: creatorFeeTokenAccount,
      tx: creatorFeeTokenAccountCreationTx,
    } = await getOrCreateTokenAccountTx(
      this.connection,
      NATIVE_MINT,
      user,
      basketConfig.creator
    );

    if (isValidTransaction(creatorFeeTokenAccountCreationTx)) {
      tx.add(creatorFeeTokenAccountCreationTx);
    }

    const { tokenAccount: vaultWsolAccount, tx: createVaultWsolAccountTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        NATIVE_MINT,
        user,
        basketConfigPDA
      );

    if (isValidTransaction(createVaultWsolAccountTx)) {
      tx.add(createVaultWsolAccountTx);
    }

    const depositWsolTx = await this.program.methods
      .depositWsol(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfigPDA,
        userWsolAccount,
        vaultWsolAccount,
        creatorFeeTokenAccount,
      })
      .transaction();

    tx.add(depositWsolTx);

    return tx;
  }

  /**
   * Deposits a component into the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of component to deposit.
   * @param mint - The mint of the component.
   * @returns A promise that resolves to a transaction.
   */
  async depositComponent({
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

    const { tokenAccount: userTokenAccount } = await getOrCreateTokenAccountTx(
      this.connection,
      mint,
      user,
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        mint,
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const depositComponentTx = await this.program.methods
      .depositComponent(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userTokenAccount,
        vaultTokenAccount: outputTokenAccount,
      })
      .transaction();

    tx.add(depositComponentTx);

    return tx;
  }

  /**
   * Buys a component.
   * @param userSourceOwner - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponent({
    userSourceOwner,
    basketId,
    maxAmountIn,
    amountOut,
    ammId,
    unwrapSol = true,
  }: {
    userSourceOwner: PublicKey;
    basketId: BN;
    maxAmountIn: number;
    amountOut: number;
    ammId: string;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const inputMint = NATIVE_MINT;
    const basketConfig = this.basketConfigPDA({ basketId });

    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      userSourceOwner
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        userSourceOwner,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const buyComponentTx = await this.program.methods
      .buyComponent(new BN(maxAmountIn), new BN(amountOut))
      .accountsPartial({
        userSourceOwner: userSourceOwner,
        programState: this.programStatePDA(),
        basketConfig: basketConfig,
        amm: new PublicKey(ammId),
        userFund: this.userFundPDA({ user: userSourceOwner, basketId }),
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
        userTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        vaultTokenDestinationMint: new PublicKey(mintOut),
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
      })
      .transaction();

    tx.add(buyComponentTx);

    if (unwrapSol && inputMint === NATIVE_MINT) {
      tx.add(unwrapSolIx(inputTokenAccount, userSourceOwner, userSourceOwner));
    }
    return tx;
  }

  /**
   * Buys a component CPMM.
   * @param user - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponentCpmm({
    user,
    basketId,
    amountOut,
    poolId,
  }: {
    user: PublicKey;
    basketId: BN;
    amountOut: number;
    poolId: string;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
    const basketConfig = this.basketConfigPDA({ basketId });

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;
    const rpcData = data.rpcData;

    const baseIn = NATIVE_MINT.toString() === poolKeys.mintA.address;

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
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const swapResult = CurveCalculator.swapBaseOut({
      poolMintA: poolInfo.mintA,
      poolMintB: poolInfo.mintB,
      tradeFeeRate: rpcData.configInfo!.tradeFeeRate,
      baseReserve: rpcData.baseReserve,
      quoteReserve: rpcData.quoteReserve,
      outputMint: mintOut,
      outputAmount: new BN(amountOut),
    });

    const buyComponentCpmmTx = await this.program.methods
      .buyComponentCpmm(swapResult.amountIn, new BN(amountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA(),
        basketConfig: basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        authority: new PublicKey(poolKeys.authority),
        userTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        userTokenSourceMint: baseIn ? mintA : mintB,
        vaultTokenDestinationMint: baseIn ? mintB : mintA,
        inputVault: new PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
        outputVault: new PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
        inputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintA" : "mintB"].programId ?? TOKEN_PROGRAM_ID
        ),
        outputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintB" : "mintA"].programId ?? TOKEN_PROGRAM_ID
        ),
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();

    tx.add(buyComponentCpmmTx);
    return tx;
  }

  /**
   * Buys a component using CLMM from Raydium.
   * @param user - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param poolId - The CLMM pool ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponentClmm({
    user,
    basketId,
    amountOut,
    outputMint,
    poolId,
    slippage,
  }: {
    user: PublicKey;
    basketId: BN;
    amountOut: BN;
    outputMint: PublicKey;
    poolId: string;
    slippage: number;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA({ basketId });

    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;
    const { remainingAccounts, ...res } = PoolUtils.computeAmountIn({
      poolInfo: clmmPoolInfo,
      tickArrayCache: tickCache[poolId],
      amountOut,
      baseMint: outputMint,
      slippage,
      epochInfo: await this.raydium.fetchEpochInfo(),
    });

    let sqrtPriceLimitX64: BN;
    sqrtPriceLimitX64 =
      outputMint.toString() === poolInfo.mintB.address
        ? MIN_SQRT_PRICE_X64.add(new BN(1))
        : MAX_SQRT_PRICE_X64.sub(new BN(1));

    const [programId, id] = [
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
    ];

    const [mintAVault, mintBVault] = [
      new PublicKey(poolKeys.vault.A),
      new PublicKey(poolKeys.vault.B),
    ];
    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];
    const baseIn = NATIVE_MINT.toString() === poolKeys.mintA.address;

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(NATIVE_MINT),
      user
    );

    const {
      tokenAccount: outputTokenAccount,
      tx: outputTx,
      tokenProgram: outputTokenProgram,
    } = await getOrCreateTokenAccountTx(
      this.connection,
      new PublicKey(baseIn ? mintB : mintA),
      user,
      basketConfig
    );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const buyComponentTx = await this.program.methods
      .buyComponentClmm(
        new BN(amountOut),
        res.maxAmountIn.amount,
        sqrtPriceLimitX64
      )
      .accountsPartial({
        user: user,
        userFund: this.userFundPDA({ user, basketId }),
        programState: this.programStatePDA(),
        basketConfig: basketConfig,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolKeys.id),
        userTokenSource: inputTokenAccount,
        userTokenSourceMint: NATIVE_MINT,
        vaultTokenDestination: outputTokenAccount,
        vaultTokenDestinationMint: baseIn ? mintB : mintA,
        outputTokenProgram,
        inputVault: baseIn ? mintAVault : mintBVault,
        outputVault: baseIn ? mintBVault : mintAVault,
        observationState: new PublicKey(clmmPoolInfo.observationId),
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(programId, id).publicKey
        )
      )
      .transaction();

    tx.add(buyComponentTx);
    return tx;
  }

  /**
   * Mints a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount.
   * @returns A promise that resolves to a transaction.
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
    const tx = new Transaction();
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    const userFund = this.userFundPDA({ user, basketId });
    const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } =
      await getOrCreateTokenAccountTx(this.connection, basketMint, user, user);
    if (isValidTransaction(userBasketTokenTx)) {
      tx.add(userBasketTokenTx);
    }
    const mintBasketTokenTx = await this.program.methods
      .mintBasketToken(new BN(amount))
      .accountsPartial({
        user,
        basketConfig,
        userFund,
        basketMint,
        userBasketTokenAccount,
      })
      .transaction();
    tx.add(mintBasketTokenTx);
    return tx;
  }
}
