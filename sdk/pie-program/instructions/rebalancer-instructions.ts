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
import { getBasketIdFromBasketMint, getTokenAccountWithTokenProgram } from "../../utils/helper";
import { createJupiterSwapIx, getPrice } from "../../utils/jupiter";
import { JUPITER_PROGRAM_ID, SYS_DECIMALS } from "../../constants";
import { SwapInstructionsResponse } from "@jup-ag/api";
import { PieProgram } from "../program";
import { BasketConfig, BasketState } from "../types";
import { NATIVE_MINT } from "@solana/spl-token";

/**
 * Class for handling rebalancer-related instructions
 */
export class RebalancerInstructions extends ProgramStateManager {
  constructor(readonly connection: Connection, readonly programId: PublicKey) {
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
   * Executes rebalancing instructions using Jupiter.
   * @dev This function returns executeRebalancingJupiterIx along with swapInstructions and
   *      addressLookupTableAccounts which can be used to build a custom transaction.
   *      For example, to add additional instructions such as startRebalancing or stopRebalancing.
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
    slippageBps,
    dynamicSlippage,
  }: {
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    swapMode: "ExactIn" | "ExactOut";
    rebalancer: PublicKey;
    maxAccounts?: number;
    slippageBps?: number;
    dynamicSlippage?: boolean;
  }): Promise<{
    executeRebalancingJupiterIx: TransactionInstruction;
    swapInstructions: SwapInstructionsResponse;
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
        slippageBps,
        dynamicSlippage,
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

    const executeRebalancingJupiterIx = await this.program.methods
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

    return {
      executeRebalancingJupiterIx,
      swapInstructions,
      addressLookupTableAccounts,
    };
  }

  /**
   * Executes rebalancing using Jupiter.
   * @dev This function returns a versioned transaction that can be signed and sent to the network.
   *      If you want to customize the transaction, you can use the executeRebalancingJupiterIx function.
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
    slippageBps,
    dynamicSlippage,
  }: {
    connection: Connection;
    rebalancer: PublicKey;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    swapMode: "ExactIn" | "ExactOut";
    maxAccounts?: number;
    slippageBps?: number;
    dynamicSlippage?: boolean;
  }): Promise<VersionedTransaction> {
    const { executeRebalancingJupiterIx, addressLookupTableAccounts } =
      await this.executeRebalancingJupiterIx({
        basketId,
        inputMint,
        outputMint,
        amount,
        swapMode,
        maxAccounts,
        rebalancer,
        slippageBps,
        dynamicSlippage,
      });

    const recentBlockhash = (await connection.getLatestBlockhash("confirmed"))
      .blockhash;

    const simulateMessage = new TransactionMessage({
      recentBlockhash,
      payerKey: rebalancer,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_000_000,
        }),
        executeRebalancingJupiterIx,
      ],
    }).compileToV0Message(addressLookupTableAccounts);

    const simulateTx = new VersionedTransaction(simulateMessage);

    const simulation = await connection.simulateTransaction(simulateTx, {
      commitment: "confirmed",
      replaceRecentBlockhash: true,
      sigVerify: false,
    });

    console.log(simulation.value.logs, "simulation.value.logs");

    if (simulation.value.err) {
      console.log(simulation.value.err, "simulation.value.err");
      throw new Error("simulation failed");
    }

    // Build final transaction
    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: simulation.value.unitsConsumed + 100_000,
    });

    const message = new TransactionMessage({
      payerKey: rebalancer,
      recentBlockhash,
      instructions: [cuIx, executeRebalancingJupiterIx],
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(message);

    return tx;
  }

  /**
   * Builds the next rebalance step transaction.
   * @param basketId - The basket ID in BN format
   * @param rebalancer - The rebalancer public key
   * @param command - Rebalancing command with optional wantComponents
   * @param option - Additional options like maxSlippageBps
   * @param executionContext - Context from previous step execution
   * @param serializedTxs - Previously generated transactions
   * @param txHistories - Transaction history
   * @returns Next step transactions and execution context
   */
  async buildNextRebalanceStepTx({
    basketMint,
    rebalancer,
    command,
    option,
    executionContext,
    signedTxs,
  }: {
    basketMint: PublicKey;
    rebalancer: PublicKey;
    command: {
      wantComponents?: {
        fungibleToken: PublicKey;
        quantityInSysDecimal: BN;
      }[];
    };
    option?: {
      maxSlippageBps?: number;
    };
    executionContext?: string;
    signedTxs?: VersionedTransaction[];
    txHistories?: string[];
  }): Promise<{
    sessionContext: string;
    result: RebalanceResult;
    toSignTxs: VersionedTransaction[];
  }> {
    // Get basket configuration
    const pieProgram = new PieProgram(
      {
        connection: this.connection,
        cluster: "mainnet-beta",
        jitoRpcUrl: "" // does not use in this function.
      }
    )

    const basketId = await getBasketIdFromBasketMint(basketMint, pieProgram);
    if (!basketId) {
      throw new Error("Basket not found");
    }

    const context = RebalanceContext.deserialize(executionContext);
    
    const executor = new RebalanceExecutor(
      this,
      rebalancer,
      basketMint,
      context,
      signedTxs,
      command.wantComponents,
      option,
    );
    const {ctx, result, toSignTxs} = await executor.buildNextTx();
    return {
      sessionContext: ctx.serialize(),
      result,
      toSignTxs,
    }
  }
}

/**
 * Rebalance stage enum representing the state of the rebalancing process
 */
export enum RebalanceStage {
  START = "START",
  SELL = "SELL",
  BUY = "BUY",
  CLEANUP_BUY = "CLEANUP_BUY",
  STOP = "STOP",
  SEND_STOP_TX = "SEND_STOP_TX",
  END = "END"
}

function nextStage(stage: RebalanceStage): RebalanceStage {
  switch (stage) {
    // case RebalanceStage.INIT:
    //   return RebalanceStage.START;
    case RebalanceStage.START:
      return RebalanceStage.SELL;
    case RebalanceStage.SELL:
      return RebalanceStage.BUY;
    case RebalanceStage.BUY:
      return RebalanceStage.CLEANUP_BUY;
    case RebalanceStage.CLEANUP_BUY:
      return RebalanceStage.STOP;
    case RebalanceStage.STOP:
      return RebalanceStage.SEND_STOP_TX;
    case RebalanceStage.SEND_STOP_TX:
      return RebalanceStage.END;
    default:
      throw new Error("Invalid stage"); // TODO: detailed Exception.
  }
}

export class SwapSigStatus {
  mint: PublicKey;
  signature: string;
  status: TxStatus;
  errorReason: RebalanceErrorReason;
}

export class RebalanceContext {
  stage: RebalanceStage;
  step: number;

  successTxs: VersionedTransaction[];
  failedTxs: VersionedTransaction[];
  errors: Error[];

  componentsToSell: { mint: PublicKey; currentAmount: BN; targetAmount: BN }[];
  componentsToBuy: { mint: PublicKey; currentAmount: BN; targetAmount: BN }[];

  startSig?: string;
  sellSigs: SwapSigStatus[];
  buySigs: SwapSigStatus[];
  cleanupBuySig?: string;
  stopSig?: string;
  needCleanUp: boolean;
  
  constructor() {
    // this.stage = RebalanceStage.INIT;
    this.stage = RebalanceStage.START;
    this.step = 0;

    this.componentsToSell = [];
    this.componentsToBuy = [];
    this.successTxs = [];
    this.failedTxs = [];
    this.errors = [];
    this.needCleanUp = false;
  }
  
  serialize(): string {
    const serialized = {
      stage: this.stage,
      step: this.step,
      componentsToSell: this.componentsToSell.map(item => ({
        mint: item.mint.toBase58(),
        currentAmount: item.currentAmount.toString(),
        targetAmount: item.targetAmount.toString()
      })),
      componentsToBuy: this.componentsToBuy.map(item => ({
        mint: item.mint.toBase58(),
        currentAmount: item.currentAmount.toString(),
        targetAmount: item.targetAmount.toString()
      })),
      successTxs: this.successTxs.map(tx => Buffer.from(tx.serialize()).toString("base64")),
      failedTxs: this.failedTxs.map(tx => Buffer.from(tx.serialize()).toString("base64")),
      errors: this.errors.map(err => err.message),

      startSig: this.startSig,
      sellSigs: this.sellSigs.map(sig => ({
        mint: sig.mint.toBase58(),
        signature: sig.signature,
        status: sig.status,
        errorReason: sig.errorReason
      })),
      buySigs: this.buySigs.map(sig => ({
        mint: sig.mint.toBase58(),
        signature: sig.signature,
        status: sig.status,
        errorReason: sig.errorReason
      })),
      cleanupBuySig: this.cleanupBuySig,
      stopSig: this.stopSig,
      needCleanUp: this.needCleanUp
    };
    return JSON.stringify(serialized);
  }
  
  static deserialize(v: string): RebalanceContext {
    const deserialized = JSON.parse(v);

    const ctx = new RebalanceContext();
    
    ctx.stage = deserialized.stage || RebalanceStage.START;
    ctx.step = deserialized.step || 0;
    ctx.componentsToSell = (deserialized.componentsToSell || []).map(item => ({
      mint: new PublicKey(item.mint),
      currentAmount: new BN(item.currentAmount),
      targetAmount: new BN(item.targetAmount)
    }));
    ctx.componentsToBuy = (deserialized.componentsToBuy || []).map(item => ({
      mint: new PublicKey(item.mint),
      currentAmount: new BN(item.currentAmount),
      targetAmount: new BN(item.targetAmount)
    }));
    ctx.successTxs = (deserialized.successTxs || []).map(tx =>  VersionedTransaction.deserialize(Buffer.from(tx, "base64")));
    ctx.failedTxs = (deserialized.failedTxs || []).map(tx => VersionedTransaction.deserialize(Buffer.from(tx, "base64")));
    ctx.errors = (deserialized.errors || []).map(err => new Error(err));
    ctx.startSig = deserialized.startSig;
    ctx.sellSigs = (deserialized.sellSigs || []).map(sig => ({
      mint: new PublicKey(sig.mint),
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason
    }));
    ctx.buySigs = (deserialized.buySigs || []).map(sig => ({
      mint: new PublicKey(sig.mint),
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason
    }));
    ctx.cleanupBuySig = deserialized.cleanupBuySig;
    ctx.stopSig = deserialized.stopSig;
    ctx.needCleanUp = deserialized.needCleanUp;

    return ctx;
  }
  clone(): RebalanceContext {
    const ctx = new RebalanceContext();
    ctx.stage = this.stage;
    ctx.step = this.step;
    ctx.successTxs = this.successTxs.map(tx => tx);
    ctx.failedTxs = this.failedTxs.map(tx => tx);
    ctx.errors = this.errors.map(err => new Error(err.message));
    ctx.startSig = this.startSig;
    ctx.sellSigs = this.sellSigs.map(sig => ({
      mint: sig.mint,
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason
    }));
    ctx.buySigs = this.buySigs.map(sig => ({
      mint: sig.mint,
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason
    }));
    ctx.cleanupBuySig = this.cleanupBuySig;
    ctx.stopSig = this.stopSig;
    ctx.needCleanUp = this.needCleanUp;
    ctx.componentsToSell = this.componentsToSell.map(item => ({
      mint: item.mint,
      currentAmount: item.currentAmount,
      targetAmount: item.targetAmount
    }));
    ctx.componentsToBuy = this.componentsToBuy.map(item => ({
      mint: item.mint,
      currentAmount: item.currentAmount,
      targetAmount: item.targetAmount
    }));
    return ctx;
  }

  componentsToSellWithoutNative(): {
    mint: PublicKey;
    currentAmount: BN;
    targetAmount: BN;
  }[] {
    return this.componentsToSell.filter(item => !item.mint.equals(new PublicKey(NATIVE_MINT)));
  }

  componentsToBuyWithoutNative(): {
    mint: PublicKey;
    currentAmount: BN;
    targetAmount: BN;
  }[] {
    return this.componentsToBuy.filter(item => !item.mint.equals(new PublicKey(NATIVE_MINT)));
  }
}

/**
 * Status enum for rebalance execution result
 */
export enum RebalanceStatus {
  STATUS_UNSPECIFIED = 0,
  IN_PROGRESS = 1,
  SUCCESS = 2,
  FAILED = 3
}

/**
 * Error reason enum for rebalance execution result
 */
export enum RebalanceErrorReason {
  ERROR_REASON_UNSPECIFIED = 0,
  TX_FAILED_UNKNOWN = 1,
  INSUFFICIENT_FEE = 2
}

/**
 * Swap status enum
 */
export enum TxStatus {
  STATUS_UNSPECIFIED = 0,
  SUCCESS = 1,
  FAILED = 2
}

/**
 * Swap information interface
 */
export interface Swap {
  fungibleTokenAddress: string;
  isBuy: boolean;
  inAmount: BN;
  outAmount: BN;
  txSignature: string;
  status: TxStatus;
  errorReason: RebalanceErrorReason;
}

/**
 * Class for handling rebalance execution logic
 */
export class RebalanceExecutor {
  private connection: Connection;
  private rebalancer: PublicKey;
  private basketId: BN;
  private basketMint: PublicKey;
  private basketConfig: BasketConfig;
  private prevCtx: RebalanceContext;
  private curCtx: RebalanceContext;
  private instructor: RebalancerInstructions;

  private nextTxs: VersionedTransaction[] = [];


  private wantComponents: {
    fungibleToken: PublicKey;
    quantityInSysDecimal: BN;
  }[];
  // option
  private maxSlippageBps: number;

  private signedTxs: VersionedTransaction[];

  /**
   * Constructor
   * @param connection - Solana connection
   * @param basketConfig - Basket configuration
   * @param executionContext - Previous execution context
   */
  constructor(
    instructor: RebalancerInstructions,
    rebalancer: PublicKey,
    basketMint: PublicKey,
    prevContext: RebalanceContext,
    signedTxs: VersionedTransaction[],
    wantComponents: {
      fungibleToken: PublicKey;
      quantityInSysDecimal: BN;
    }[],
    option?: {
      maxSlippageBps?: number;
    },
  ) {
    this.instructor = instructor;
    this.connection = this.instructor.connection;
    this.basketMint = basketMint;
    this.rebalancer = rebalancer;

    this.signedTxs = signedTxs || [];
    this.wantComponents = wantComponents || [];

    this.prevCtx = prevContext;
    this.curCtx = prevContext.clone();
    this.curCtx.step += 1;

    this.maxSlippageBps = option?.maxSlippageBps || 1000; // 10%

    this.nextTxs = [];
  }

  private stage(): RebalanceStage {
    return this.curCtx.stage;
  }

  result(): RebalanceResult {
    return new RebalanceResult(this.prevCtx);
  }

  /**
   * Build transactions for the next rebalance step
   * @param rebalancer - The rebalancer public key
   * @param basketId - The basket ID
   * @param command - Rebalancing command
   * @param createStartTx - Function to create start rebalancing tx
   * @param createStopTx - Function to create stop rebalancing tx
   * @param createSwapTx - Function to create swap instruction
   * @returns Promise resolved to transactions and updated context
   */

  async buildNextTx(): Promise<{
    ctx: RebalanceContext;
    result: RebalanceResult;
    toSignTxs: VersionedTransaction[];
  }> {
    if (this.curCtx.componentsToSell.length === 0 || this.curCtx.componentsToBuy.length === 0) {
      const [componentsToSell, componentsToBuy] = await Promise.all([
        this.componentsToSell(),
        this.componentsToBuy()
      ]);
      this.curCtx.componentsToSell = componentsToSell;
      this.curCtx.componentsToBuy = componentsToBuy;
    }
    this.basketConfig = await this.instructor.getBasketConfig({ basketId: this.basketId });
    if (!this.basketConfig) {
      throw new Error("Basket config not found");
    }

    let iterate = 0;
    while (this.nextTxs.length === 0) {
      if (iterate > Object.keys(RebalanceStage).length) {
        throw new Error("Max iterate reached");
      }
      iterate += 1; 
      
      switch (this.stage()) {
        case RebalanceStage.START:
          await this.handleStartStage();
          break;
        
        case RebalanceStage.SELL:
          await this.handleSellStage();
          break;
        
        case RebalanceStage.BUY:
          await this.handleBuyStage();
          break;
        
        case RebalanceStage.CLEANUP_BUY:
          await this.handleCleanUpBuyStage();
          break;
        
        case RebalanceStage.STOP:
          await this.handleStopStage();
          break;
        
        case RebalanceStage.END:
          this.handleEndStage();
          break;
        
        default:
          throw new Error(`Invalid stage: ${this.curCtx.stage}`);
      }
      if (this.curCtx.stage === RebalanceStage.END) {
        break;
      }
      if (this.curCtx.errors.length > 0) {
        break
      }

      this.curCtx.stage = nextStage(this.curCtx.stage);
    }

    return {
      ctx: this.curCtx,
      result: this.result(),
      toSignTxs: this.nextTxs,
    };
  }

  /**
   * Handle START stage
   * @private
   */
  private async handleStartStage(): Promise<void> {
    if (this.basketConfig.state.rebalancing) {
      return;
    }

    const startRebalanceTx = await this.instructor.startRebalancing({
      rebalancer: this.rebalancer,
      basketId: this.basketId,
    });

    const vtxMessage = new TransactionMessage({
      payerKey: startRebalanceTx.feePayer,
      recentBlockhash: startRebalanceTx.recentBlockhash,
      instructions: startRebalanceTx.instructions,
    });
    const tx = new VersionedTransaction(vtxMessage.compileToV0Message());
    this.nextTxs.push(tx);
    return
  }

  private wantComponentQtyMap(): Map<PublicKey, BN> {
    const out = new Map<PublicKey, BN>();
    for (const wc of this.wantComponents) {
      out.set(wc.fungibleToken, wc.quantityInSysDecimal);
    }
    return out;
  }

  private currentComponentQtyMap(): Map<PublicKey, BN> {
    const out = new Map<PublicKey, BN>();
    for (const component of this.basketConfig.components) {
      out.set(component.mint, component.quantityInSysDecimal);
    }
    return out;
  }

  private async basketTotalSupply(): Promise<BN> {
    const totalSupplyResp = await this.connection.getTokenSupply(this.basketMint);
    return new BN(totalSupplyResp.value.amount);
  }

  private async componentsToSell(): Promise<{ mint: PublicKey; currentAmount: BN; targetAmount: BN }[]> {
    const out = [];
    const totalSupply = await this.basketTotalSupply();
    const wantComponentMap = this.wantComponentQtyMap();

    for (const [mint, curSysQty] of this.currentComponentQtyMap()) {
      const wantQty = wantComponentMap.get(mint);

      let sellQtyInSysDecimal = curSysQty;
      if (wantQty) {
        if (curSysQty.lte(wantQty)) {
          continue;
        }
        sellQtyInSysDecimal = curSysQty.sub(wantQty);
      }

      const sellAmount = sellQtyInSysDecimal.
        mul(new BN(SYS_DECIMALS)).
        mul(totalSupply)

      const currentAmount = new BN(curSysQty).
        mul(new BN(SYS_DECIMALS)).
        mul(totalSupply);

      out.push({
        mint,
        currentAmount: currentAmount,
        targetAmount: sellAmount.sub(currentAmount),
      });
    }
    out.sort((a, b) => a.mint.toBase58().localeCompare(b.mint.toBase58()));
    return out;
  }

  private async componentsToBuy(): Promise<{ mint: PublicKey; currentAmount: BN; targetAmount: BN }[]> {
    const out = [];
    const totalSupply = await this.basketTotalSupply();
    const wantComponentMap = this.wantComponentQtyMap();

    const sellComponentSet = new Set<PublicKey>();
    for (const sellComponent of await this.componentsToSell()) {
      sellComponentSet.add(sellComponent.mint);
    }

    for (const [mint, curSysQty] of this.currentComponentQtyMap()) {
      if (sellComponentSet.has(mint)) {
        continue;
      }

      let buyQtyInSysDecimal = new BN(0);

      const wantQty = wantComponentMap.get(mint);
      if (!wantQty) {
        continue;
      }

      if (curSysQty.gte(wantQty)) {
        continue;
      }

      buyQtyInSysDecimal = wantQty.sub(curSysQty);

      const buyAmount = buyQtyInSysDecimal.
        mul(new BN(10).pow(new BN(6))).
        mul(totalSupply);

      const currentAmount = new BN(curSysQty).
        mul(new BN(10).pow(new BN(6))).
        mul(totalSupply);

      out.push({
        mint,
        currentAmount: currentAmount,
        targetAmount: currentAmount.add(buyAmount),
      });
    }

    for (const [mint, wantQty] of this.wantComponentQtyMap()) {
      const curSysQty = this.currentComponentQtyMap().get(mint);
      if (curSysQty) {
        continue;
      }

      const buyAmount = wantQty.
        mul(new BN(10).pow(new BN(6))).
        mul(totalSupply);
      
      out.push({
        mint,
        currentAmount: new BN(0),
        targetAmount: buyAmount,
      });
    }
    out.sort((a, b) => a.mint.toBase58().localeCompare(b.mint.toBase58()));
    return out;
  }

  private async handleSellStage(): Promise<void> {
    
    if (this.signedTxs.length > 0) {
      // Send StartTx
      if (this.signedTxs.length > 1) {
        throw new Error("Sell stage can only have one tx");
      }

      const tx = this.signedTxs[0];

      try {
        const sig = await sendAndConfirmTransaction(this.connection, tx);
        this.curCtx.successTxs.push(tx);
        this.curCtx.startSig = sig;
      } catch (err) {
        this.curCtx.failedTxs.push(tx);
        this.curCtx.errors.push(err);
      }
    }

    if (this.curCtx.failedTxs.length > 0) {
      return;
    }

    // Create sell txs
    try{
      const componentsToSell = await this.componentsToSell();
      const txPromises = componentsToSell.
        filter(c => !c.mint.equals(new PublicKey(NATIVE_MINT))).
        map(async ({ mint, currentAmount, targetAmount }) => {
          return await this.instructor.executeRebalancingJupiterTx({
            connection: this.connection,
            rebalancer: this.rebalancer,
            basketId: this.basketId,
            inputMint: mint,
            outputMint: NATIVE_MINT,
            amount: targetAmount.sub(currentAmount).toNumber(),
            swapMode: "ExactIn",
            slippageBps: this.maxSlippageBps,
          });
        });
    
      const results = await Promise.all(txPromises);
      this.nextTxs.push(...results);
    } catch (error) {
      // TODO: Parse error
      this.curCtx.errors.push(error);
    }
  }

  private async handleBuyStage(): Promise<void> {
  
    if (this.signedTxs.length > 0) {
      const results = await Promise.all(
        this.signedTxs.map(async (tx, i) => {
          const mint = this.curCtx.componentsToSellWithoutNative()[i].mint;
      
          let status = TxStatus.STATUS_UNSPECIFIED;
          let errorReason = RebalanceErrorReason.ERROR_REASON_UNSPECIFIED;
          let sig = '';
          try {
            sig = await sendAndConfirmTransaction(this.connection, tx);
            status = TxStatus.SUCCESS;
            this.curCtx.successTxs.push(tx);
          } catch (err) {
            status = TxStatus.FAILED;
            errorReason = RebalanceErrorReason.TX_FAILED_UNKNOWN;
            this.curCtx.failedTxs.push(tx);
            this.curCtx.errors.push(err);
          }
      
          return {
            mint,
            signature: sig,
            status,
            errorReason,
          };
        })
      );
      
      this.curCtx.sellSigs.push(...results);
    }
    if (this.curCtx.failedTxs.length > 0) {
      return;
    }
    
    const { currentNativeTokenAmount, wantNativeTokenAmount } = await this.nativeTokenAmounts();

    const needCleanUp = (
      wantNativeTokenAmount.eq(new BN(0)) 
      && this.curCtx.componentsToBuyWithoutNative().length > 1
    );
    this.curCtx.needCleanUp = needCleanUp;

    const availableNativeTokenAmount = currentNativeTokenAmount.sub(wantNativeTokenAmount);
    console.log(`Available native token amount: ${availableNativeTokenAmount.toString()}`);

    if (availableNativeTokenAmount.lte(new BN(0))) {
      return;
    }
    if (this.curCtx.componentsToBuyWithoutNative().length === 0) {
      return;
    }

    try {  
      let buyPlans: { mint: PublicKey; inputAmount: BN }[];

      if (this.curCtx.componentsToBuyWithoutNative().length === 1) {
        buyPlans = [{
          mint: this.curCtx.componentsToBuyWithoutNative()[0].mint,
          inputAmount: availableNativeTokenAmount,
        }]
      } else {
        
        const tmpBuyPlanPromises = this.curCtx.componentsToBuy.
          map(async (component) => {
              const { mint, currentAmount, targetAmount } = component;
              
              const neededAmount = targetAmount.sub(currentAmount);
              if (neededAmount.lte(new BN(0))) {
                return null; // Already have enough
              }
              
              let price = new BN(1);
              if (!mint.equals(new PublicKey(NATIVE_MINT))) {
                price = await getPrice(mint, NATIVE_MINT);
              }
              const estimatedNativeNeeded = neededAmount.mul(price);
              return {
                mint,
                estimatedNativeNeeded,
              };
          })
        const tmpBuyPlans = (await Promise.all(tmpBuyPlanPromises)).filter(plan => plan !== null);
  
        let totalNativeNeeded = new BN(0);
        for (const plan of tmpBuyPlans) {
          totalNativeNeeded = totalNativeNeeded.add(plan.estimatedNativeNeeded);
        }
  
        // Distribute available native tokens proportionally to each component
        buyPlans = tmpBuyPlans.
          filter(plan => !plan.mint.equals(new PublicKey(NATIVE_MINT))).
          map(plan => {
            const ratio = plan.estimatedNativeNeeded.div(totalNativeNeeded);
            const allocatedNative = availableNativeTokenAmount.mul(ratio);
            
            return {
              mint: plan.mint,
              inputAmount: allocatedNative,
            };
          })
      }

      console.log(`Generated ${buyPlans.length} buy plans`);

      if (this.curCtx.needCleanUp) {
        buyPlans.pop(); // buy in CLEANUP_BUY stage
        console.log("Need to clean up, so one buy plan is removed");
      }
      
      const txPromises = buyPlans.map(async (plan) => {  
        try {
          const tx = await this.instructor.executeRebalancingJupiterTx({
            connection: this.connection,
            rebalancer: this.rebalancer,
            basketId: this.basketId,
            inputMint: new PublicKey(NATIVE_MINT),
            outputMint: plan.mint,
            amount: plan.inputAmount.toNumber(),
            swapMode: "ExactIn",
            slippageBps: this.maxSlippageBps,
          });
          return tx;
        } catch (error) {
          console.error(`Error creating swap tx for ${plan.mint.toBase58()}: ${error}`);
          return null;
        }
      });
      
      const txs = await Promise.all(txPromises);
      this.nextTxs.push(...txs.filter(tx => tx !== null));
      
    } catch (error) {
      // TODO: Parse error
      console.error("Error in handleBuyStage:", error);
      this.curCtx.errors.push(error);
    }
  }

  private async handleCleanUpBuyStage(): Promise<void> {
    if (this.signedTxs.length > 0) {
      const results = await Promise.all(
        this.signedTxs.map(async (tx, i) => {
          const mint = this.curCtx.componentsToBuyWithoutNative()[i].mint;
      
          let status = TxStatus.STATUS_UNSPECIFIED;
          let errorReason = RebalanceErrorReason.ERROR_REASON_UNSPECIFIED;
          let sig = '';
          try {
            sig = await sendAndConfirmTransaction(this.connection, tx);
            status = TxStatus.SUCCESS;
            this.curCtx.successTxs.push(tx);
          } catch (err) {
            status = TxStatus.FAILED;
            errorReason = RebalanceErrorReason.TX_FAILED_UNKNOWN;
            this.curCtx.failedTxs.push(tx);
            this.curCtx.errors.push(err);
          }
      
          return {
            mint,
            signature: sig,
            status,
            errorReason,
          };
        })
      );
      
      this.curCtx.buySigs.push(...results);
    }
    if (this.curCtx.failedTxs.length > 0) {
      return;
    }

    // Create Clean Up buy Tx
    if (!this.curCtx.needCleanUp) {
      return;
    }
    if (this.curCtx.componentsToBuyWithoutNative().length < 2) {
      this.curCtx.errors.push(new Error("Already cleaned up"));
      return;
    }
    const componentToBuy = this.curCtx.componentsToBuyWithoutNative().pop();

    const { currentNativeTokenAmount, wantNativeTokenAmount } = await this.nativeTokenAmounts();

    if (currentNativeTokenAmount.lte(wantNativeTokenAmount)) {
      console.log(`No remaining native token amount for cleanup . current: ${currentNativeTokenAmount.toString()}, want: ${wantNativeTokenAmount.toString()}`);
      return;
    }
    
    // Get remaining native tokens after previous BUY transactions
    const remainingNativeTokenAmount = currentNativeTokenAmount.sub(wantNativeTokenAmount);
    console.log(`Remaining native token amount for cleanup: ${remainingNativeTokenAmount.toString()}`);
    
    try {
      const cleanupTx = await this.instructor.executeRebalancingJupiterTx({
        connection: this.connection,
        rebalancer: this.rebalancer,
        basketId: this.basketId,
        inputMint: new PublicKey(NATIVE_MINT),
        outputMint: componentToBuy.mint,
        amount: remainingNativeTokenAmount.toNumber(),
        swapMode: "ExactIn",
        slippageBps: this.maxSlippageBps,
      });
      
      this.nextTxs.push(cleanupTx);
      console.log(`Created cleanup swap transaction for ${componentToBuy.mint.toBase58()}`);
    } catch (error) {
      console.error(`Error creating cleanup swap tx: ${error}`);
      this.curCtx.errors.push(error);
    }
  }

  private async handleStopStage(): Promise<void> {
    if (this.signedTxs.length > 0) { // Send Clean Up Buy Tx
      if (this.signedTxs.length > 1) {
        throw new Error("Stop stage can maximum 1 tx");
      }

      const tx = this.signedTxs[0];

      try {
        const sig = await sendAndConfirmTransaction(this.connection, tx);
        this.curCtx.successTxs.push(tx);
        this.curCtx.cleanupBuySig = sig;
      } catch (err) {
        this.curCtx.failedTxs.push(tx);
        this.curCtx.errors.push(err);
      }
    }
    if (this.curCtx.failedTxs.length > 0) {
      return;
    }

    if (!this.basketConfig.state.rebalancing) {
      return;
    }

    try {
      const stopTx = await this.instructor.stopRebalancing({
        rebalancer: this.rebalancer,
        basketId: this.basketId,
      });
      
      // Convert to versioned transaction
      const recentBlockhash = (await this.connection.getLatestBlockhash("confirmed")).blockhash;
      const vtxMessage = new TransactionMessage({
        payerKey: this.rebalancer,
        recentBlockhash,
        instructions: stopTx.instructions,
      });
      
      const vtx = new VersionedTransaction(vtxMessage.compileToV0Message());
      this.nextTxs.push(vtx);
    } catch (error) {
      console.error("Error creating stop rebalancing tx:", error);
      this.curCtx.errors.push(error);
    }
  }

  private async handleEndStage(): Promise<void> {
    // send stop tx
    if (this.signedTxs.length === 0 ) {
      return;
    }

    if (this.signedTxs.length > 1) {
      throw new Error("End stage can maximum 1 tx");
    }

    const tx = this.signedTxs[0];

    try {
      const sig = await sendAndConfirmTransaction(this.connection, tx);
      this.curCtx.successTxs.push(tx);
      this.curCtx.stopSig = sig;
    } catch (err) {
      this.curCtx.failedTxs.push(tx);
      this.curCtx.errors.push(err);
    }
    return
  }

  private async nativeTokenAmounts(): Promise<{
    currentNativeTokenAmount: BN;
    wantNativeTokenAmount: BN;
  }> {
    const totalSupply = await this.basketTotalSupply();
    
    // Get current native token amount from basket config
    let currentNativeTokenAmount = new BN(0);
    for (const component of this.basketConfig.components) {
      if (component.mint.equals(new PublicKey(NATIVE_MINT))) {
        currentNativeTokenAmount = component.quantityInSysDecimal.
          mul(new BN(SYS_DECIMALS)).
          mul(totalSupply);
        break;
      }
    }

    let wantNativeTokenAmount = new BN(0);
    for (const [mint, qty] of this.wantComponentQtyMap().entries()) {
      if (mint.equals(new PublicKey(NATIVE_MINT))) {
        wantNativeTokenAmount = qty.
          mul(new BN(SYS_DECIMALS)).
          mul(totalSupply);
        break;
      }
    }
    return {
      currentNativeTokenAmount,
      wantNativeTokenAmount,
    }
  }
} 

export class RebalanceResult {

  ctx: RebalanceContext;

  constructor(ctx: RebalanceContext) {
    this.ctx = ctx;
  }

  status(): RebalanceStatus {
    if (this.ctx.errors.length > 0) {
      return RebalanceStatus.FAILED;
    }
    if (this.ctx.failedTxs.length > 0) {
      return RebalanceStatus.FAILED;
    }
    if (this.ctx.stage === RebalanceStage.END) {
      return RebalanceStatus.SUCCESS;
    }
    return RebalanceStatus.IN_PROGRESS;
  }

  errorReason(): RebalanceErrorReason{
    if (this.ctx.errors.length === 0) {
      return RebalanceErrorReason.ERROR_REASON_UNSPECIFIED;
    }
    const err = this.ctx.errors[0];
    // TODO: parse error
    return RebalanceErrorReason.TX_FAILED_UNKNOWN;
  }

  txSignatures(): string[] {
    const out: string[] = [];
    for (const tx of this.ctx.successTxs) {
      if (tx.signatures.length === 0) {
        continue;
      }
      out.push(tx.signatures[0].toString());
    }
    for (const tx of this.ctx.failedTxs) {
      if (tx.signatures.length === 0) {
        continue;
      }
      out.push(tx.signatures[0].toString());
    }
    return out;
  }

  failedTxSignatures(): string[] {
    const out = [];
    for (const tx of this.ctx.failedTxs) {
      if (tx.signatures.length === 0) {
        continue;
      }
      out.push(tx.signatures[0].toString());
    }
    return out;
  }

  swaps(): Swap[] {
    const out: Swap[] = [];
    const sells = this.ctx.componentsToSell;
    const buys = this.ctx.componentsToBuy;

    sells.forEach((sell, index) => {

      let sig = '';
      let status = TxStatus.STATUS_UNSPECIFIED;
      let errorReason = RebalanceErrorReason.ERROR_REASON_UNSPECIFIED;

      if (index < this.ctx.sellSigs.length) {
        sig = this.ctx.sellSigs[index].signature;
        status = this.ctx.sellSigs[index].status;
        errorReason = this.ctx.sellSigs[index].errorReason;
      }
      out.push({
        fungibleTokenAddress: sell.mint.toBase58(),
        isBuy: false,
        inAmount: sell.currentAmount,
        outAmount: sell.targetAmount,
        txSignature: sig,
        status: status,
        errorReason: errorReason,
      })
    })
    buys.forEach((buy, index) => {
      let sig = '';
      let status = TxStatus.STATUS_UNSPECIFIED;
      let errorReason = RebalanceErrorReason.ERROR_REASON_UNSPECIFIED;

      if (index < this.ctx.buySigs.length) {
        sig = this.ctx.buySigs[index].signature;
        status = this.ctx.buySigs[index].status;
        errorReason = this.ctx.buySigs[index].errorReason;
      }

      out.push({
        fungibleTokenAddress: buy.mint.toBase58(),
        isBuy: true,
        inAmount: buy.currentAmount,
        outAmount: buy.targetAmount,
        txSignature: sig,
        status: status,
        errorReason: errorReason,
      })
    })
    return out;
  }
} 

async function sendAndConfirmTransaction(connection: Connection, tx: VersionedTransaction): Promise<string> {
  const sig = await connection.sendTransaction(tx, {
    skipPreflight: true,
    preflightCommitment: "confirmed",
  });

  const latestBlockhash = await connection.getLatestBlockhash();
  const confirmation = await connection.confirmTransaction({
    signature: sig,
    ...latestBlockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    // TODO: parse error
    throw new Error(confirmation.value.err.toString());
  }
  return sig;
}
