import { BN } from "@coral-xyz/anchor";
import {
  Transaction,
  PublicKey,
  Connection,
  TransactionInstruction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import {
  buildClmmRemainingAccounts,
  getTokenAccount,
  getTokenAccountWithTokenProgram,
  isValidTransaction,
} from "../../utils/helper";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import {
  getPdaExBitmapAccount,
  getPdaObservationId,
  MAX_SQRT_PRICE_X64,
  MIN_SQRT_PRICE_X64,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import { createJupiterSwapIx } from "../../utils/jupiter";
import { JUPITER_PROGRAM_ID } from "../../constants";

/**
 * Class for handling rebalancer-related instructions
 */
export class RebalancerInstructions extends ProgramStateManager {
  constructor(
    readonly connection: Connection,
    readonly programId: PublicKey,
    readonly raydium: Raydium
  ) {
    super(programId, connection);
  }

  /**
   * Starts rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
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
        basketConfig: this.basketConfigPDA({ basketId }),
      })
      .transaction();
  }

  /**
   * Stops rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
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
        basketConfig: this.basketConfigPDA({ basketId }),
      })
      .transaction();
  }

  /**
   * Executes rebalancing using Jupiter.
   * @param rebalancer - The rebalancer account.
   * @param basketId - The basket ID.
   * @param inputMint - The input mint.
   * @param outputMint - The output mint.
   * @param amount - The amount to swap.
   * @param swapMode - The swap mode.
   * @param maxAccounts - The maximum number of accounts.
   * @returns A promise that resolves to a transaction instruction and address lookup table accounts.
   */
  async executeRebalancingJupiterIx({
    basketId,
    inputMint,
    outputMint,
    amount,
    swapMode,
    maxAccounts,
    rebalancer,
  }: {
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    swapMode: "ExactIn" | "ExactOut";
    maxAccounts?: number;
    rebalancer: PublicKey;
  }): Promise<{
    swapIx: TransactionInstruction;
    addressLookupTableAccounts: AddressLookupTableAccount[];
  }> {
    const basketConfig = this.basketConfigPDA({ basketId });

    const { swapInstructions, addressLookupTableAccounts } =
      await createJupiterSwapIx({
        connection: this.connection,
        inputMint,
        outputMint,
        amount,
        fromAccount: basketConfig,
        swapMode,
        maxAccounts,
      });

    const { tokenAccount: vaultTokenSource, tokenProgram: inputTokenProgram } =
      await getTokenAccountWithTokenProgram(
        this.connection,
        inputMint,
        basketConfig
      );
    const {
      tokenAccount: vaultTokenDestination,
      tokenProgram: outputTokenProgram,
    } = await getTokenAccountWithTokenProgram(
      this.connection,
      outputMint,
      basketConfig
    );

    const swapIx = await this.program.methods
      .executeRebalancingJupiter(
        Buffer.from(swapInstructions.swapInstruction.data, "base64")
      )
      .accountsPartial({
        rebalancer,
        basketConfig,
        basketMint: this.basketMintPDA({ basketId }),
        vaultTokenSourceMint: inputMint,
        vaultTokenDestinationMint: outputMint,
        vaultTokenSource: vaultTokenSource,
        vaultTokenDestination: vaultTokenDestination,
        inputTokenProgram,
        outputTokenProgram,
        jupiterProgram: new PublicKey(JUPITER_PROGRAM_ID),
      })
      .remainingAccounts(
        swapInstructions.swapInstruction.accounts.map((acc) => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: false,
          isWritable: acc.isWritable,
        }))
      )
      .instruction();

    return { swapIx, addressLookupTableAccounts };
  }

  /**
   * Executes rebalancing using Jupiter.
   * @param rebalancer - The rebalancer account.
   * @param connection - The connection to the network.
   * @param basketId - The basket ID.
   * @param inputMint - The input mint.
   * @param outputMint - The output mint.
   * @param amount - The amount to swap.
   * @param swapMode - The swap mode.
   * @param maxAccounts - The maximum number of accounts.
   * @returns A promise that resolves to a versioned transaction.
   */
  async executeRebalancingJupiterTx({
    connection,
    rebalancer,
    basketId,
    inputMint,
    outputMint,
    amount,
    swapMode,
    maxAccounts,
  }: {
    connection: Connection;
    rebalancer: PublicKey;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    swapMode: "ExactIn" | "ExactOut";
    maxAccounts?: number;
  }): Promise<VersionedTransaction> {
    const { swapIx, addressLookupTableAccounts } =
      await this.executeRebalancingJupiterIx({
        basketId,
        inputMint,
        outputMint,
        amount,
        swapMode,
        maxAccounts,
        rebalancer,
      });

    const recentBlockhash = (await connection.getLatestBlockhash("confirmed"))
      .blockhash;

    const simulateMessage = new Transaction({
      recentBlockhash,
      feePayer: rebalancer,
    }).add(swapIx);

    const simulateTx = VersionedTransaction.deserialize(
      new Uint8Array(simulateMessage.serialize())
    );

    const simulation = await connection.simulateTransaction(simulateTx, {
      commitment: "confirmed",
      replaceRecentBlockhash: true,
      sigVerify: false,
    });

    console.log(simulation.value.logs, "simulation.value.logs");

    // Build final transaction
    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: simulation.value.unitsConsumed + 100_000,
    });

    const message = new TransactionMessage({
      payerKey: rebalancer,
      recentBlockhash,
      instructions: [cuIx, swapIx],
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(message);

    return tx;
  }
  /**
   * Executes rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param isSwapBaseOut - Whether to swap base out.
   * @param amount - The amount in when swap base in, or the amount out when swap base out.
   * @param otherAmountThreshold - Maximum amount in or minimum amount out.
   * @param ammId - The AMM ID.
   * @param basketId - The basket ID.
   * @param inputMint - The input mint.
   * @param outputMint - The output mint.
   * @param createTokenAccount - Whether to create the output token account.
   * @returns A promise that resolves to a transaction or null.
   */
  async executeRebalancing({
    rebalancer,
    isSwapBaseOut,
    amount,
    otherAmountThreshold,
    ammId,
    basketId,
    inputMint,
    outputMint,
    createTokenAccount = true,
  }: {
    rebalancer: PublicKey;
    isSwapBaseOut: boolean;
    amount: string;
    otherAmountThreshold: string;
    ammId: string;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    createTokenAccount?: boolean;
  }): Promise<Transaction | null> {
    const tx = new Transaction();
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });

    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    const poolKeys = data.poolKeys;

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(inputMint),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(outputMint),
        rebalancer,
        basketConfig
      );

    if (createTokenAccount && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const amountIn = isSwapBaseOut ? otherAmountThreshold : amount;
    const amountOut = isSwapBaseOut ? amount : otherAmountThreshold;

    const executeRebalancingTx = await this.program.methods
      .executeRebalancing(isSwapBaseOut, new BN(amountIn), new BN(amountOut))
      .accountsPartial({
        rebalancer,
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint,
        amm: new PublicKey(ammId),
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
        vaultTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        vaultTokenSourceMint: new PublicKey(inputMint),
        vaultTokenDestinationMint: new PublicKey(outputMint),
      })
      .transaction();
    tx.add(executeRebalancingTx);
    return tx;
  }

  async executeRebalancingCpmm({
    rebalancer,
    isSwapBaseOut,
    amount,
    otherAmountThreshold,
    poolId,
    basketId,
    inputMint,
    outputMint,
    createTokenAccount = true,
  }: {
    rebalancer: PublicKey;
    isSwapBaseOut: boolean;
    amount: string;
    otherAmountThreshold: string;
    poolId: string;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    createTokenAccount?: boolean;
  }): Promise<Transaction | null> {
    const tx = new Transaction();
    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(inputMint),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(outputMint),
        rebalancer,
        basketConfig
      );

    if (createTokenAccount && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;

    let inputVault;
    let outputVault;
    let inputTokenProgram;
    let outputTokenProgram;
    let inputTokenMint;
    let outputTokenMint;

    if (isInputMintA) {
      inputVault = new PublicKey(poolKeys.vault.A);
      outputVault = new PublicKey(poolKeys.vault.B);
      inputTokenProgram = new PublicKey(poolKeys.mintA.programId);
      outputTokenProgram = new PublicKey(poolKeys.mintB.programId);
      inputTokenMint = new PublicKey(poolKeys.mintA.address);
      outputTokenMint = new PublicKey(poolKeys.mintB.address);
    } else {
      inputVault = new PublicKey(poolKeys.vault.B);
      outputVault = new PublicKey(poolKeys.vault.A);
      inputTokenProgram = new PublicKey(poolKeys.mintB.programId);
      outputTokenProgram = new PublicKey(poolKeys.mintA.programId);
      inputTokenMint = new PublicKey(poolKeys.mintB.address);
      outputTokenMint = new PublicKey(poolKeys.mintA.address);
    }

    const amountIn = isSwapBaseOut ? otherAmountThreshold : amount;
    const amountOut = isSwapBaseOut ? amount : otherAmountThreshold;

    const executeRebalancingTx = await this.program.methods
      .executeRebalancingCpmm(
        isSwapBaseOut,
        new BN(amountIn),
        new BN(amountOut)
      )
      .accountsPartial({
        rebalancer,
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint,
        authority: new PublicKey(poolKeys.authority),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        vaultTokenSourceMint: new PublicKey(inputMint),
        vaultTokenDestinationMint: new PublicKey(outputMint),
        vaultTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        inputVault,
        outputVault,
        inputTokenProgram,
        outputTokenProgram,
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();
    tx.add(executeRebalancingTx);
    return tx;
  }

  /**
   * Execute rebalancing using Raydium CLMM (Concentrated Liquidity Market Maker) pool
   * @param rebalancer - The rebalancer's public key who has permission to rebalance
   * @param isSwapBaseOut - Whether this is a swap where amount specified is the output amount
   * @param basketId - The ID of the basket being rebalanced
   * @param amount - The amount to swap (either input or output amount depending on isSwapBaseOut)
   * @param slippage - Slippage in basis points
   * @param poolId - The Raydium CLMM pool ID to execute the swap on
   * @param inputMint - The mint address of the input token
   * @param outputMint - The mint address of the output token
   */
  async executeRebalancingClmm({
    rebalancer,
    isSwapBaseOut,
    basketId,
    amount,
    otherAmountThreshold,
    slippage,
    poolId,
    inputMint,
    outputMint,
    createTokenAccount = true,
  }: {
    rebalancer: PublicKey;
    isSwapBaseOut: boolean;
    basketId: BN;
    amount: string;
    otherAmountThreshold: string;
    slippage: number;
    poolId: string;
    inputMint: PublicKey;
    outputMint: PublicKey;
    createTokenAccount?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfigPDA = this.basketConfigPDA({ basketId });

    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;

    let remainingAccounts;

    // let otherAmountThreshold;
    const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;
    const sqrtPriceLimitX64 = isInputMintA
      ? MIN_SQRT_PRICE_X64.add(new BN(1))
      : MAX_SQRT_PRICE_X64.sub(new BN(1));
    if (isSwapBaseOut) {
      const computed = PoolUtils.computeAmountIn({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountOut: new BN(amount),
        baseMint: outputMint,
        slippage,
        epochInfo: await this.raydium.fetchEpochInfo(),
      });
      remainingAccounts = computed.remainingAccounts;
    } else {
      const computed = PoolUtils.computeAmountOut({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountIn: new BN(amount),
        baseMint: inputMint,
        slippage,
        epochInfo: await this.raydium.fetchEpochInfo(),
        catchLiquidityInsufficient: true,
      });

      remainingAccounts = computed.remainingAccounts;
      // @TODO should be computed.minAmountOut.amount, but it's not working
      // otherAmountThreshold = new BN(0);
    }

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        outputMint,
        rebalancer,
        basketConfigPDA
      );

    if (createTokenAccount && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }
    const executeRabalancingClmmTx = await this.program.methods
      .executeRebalancingClmm(
        isSwapBaseOut,
        new BN(amount),
        new BN(otherAmountThreshold),
        sqrtPriceLimitX64
      )
      .accountsPartial({
        rebalancer,
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint: this.basketMintPDA({ basketId }),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolKeys.id),
        vaultTokenSource: await getTokenAccount(
          this.connection,
          inputMint,
          basketConfigPDA
        ),
        vaultTokenDestination: outputTokenAccount,
        inputVault: isInputMintA
          ? new PublicKey(poolKeys.vault.A)
          : new PublicKey(poolKeys.vault.B),
        outputVault: isInputMintA
          ? new PublicKey(poolKeys.vault.B)
          : new PublicKey(poolKeys.vault.A),
        inputTokenProgram: isInputMintA
          ? new PublicKey(poolKeys.mintA.programId)
          : new PublicKey(poolKeys.mintB.programId),
        outputTokenProgram: isInputMintA
          ? new PublicKey(poolKeys.mintB.programId)
          : new PublicKey(poolKeys.mintA.programId),
        observationState: new PublicKey(clmmPoolInfo.observationId),
        vaultTokenSourceMint: isInputMintA
          ? new PublicKey(poolKeys.mintA.address)
          : new PublicKey(poolKeys.mintB.address),
        vaultTokenDestinationMint: isInputMintA
          ? new PublicKey(poolKeys.mintB.address)
          : new PublicKey(poolKeys.mintA.address),
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(
            new PublicKey(poolInfo.programId),
            new PublicKey(poolInfo.id)
          ).publicKey
        )
      )
      .transaction();
    tx.add(executeRabalancingClmmTx);
    return tx;
  }
}
