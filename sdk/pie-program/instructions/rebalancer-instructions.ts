import { BN } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import {
  getTokenAccountWithTokenProgram,
  sendAndConfirmVersionedTransaction,
} from "../../utils/helper";
import { createJupiterSwapIx, getPrice } from "../../utils/jupiter";
import { JUPITER_PROGRAM_ID, SYS_DECIMALS } from "../../constants";
import { SwapInstructionsResponse } from "@jup-ag/api";
import { BasketConfig } from "../types";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  deserializeErrorFromString,
  RebalanceExecutionError,
  RebalanceSendTransactionError,
  RebalanceControlTxBuildError,
  RebalanceSwapTxBuildError,
  BatchTransactionProcessingError,
} from "./rebalance-execution-error";

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
      // TODO: throw simulation error with logs
      console.log(simulation.value.err, "simulation.value.err");
      throw simulation.value.err;
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

    return new VersionedTransaction(message);
  }

  /**
   * Builds the next rebalance step transaction.
   * @param basketId - The basket ID in BN format
   * @param rebalancer - The rebalancer public key
   * @param command - Rebalancing command with wantComponents
   * @param option - Additional options like maxSlippageBps
    * @param sessionContext - Serialized context for the rebalance session
   * @param signedTxs - Previously generated transactions to be processed
   * @returns Next step transactions and execution context
   */
  async buildNextRebalanceStepTx({
    basketId,
    rebalancer,
    command,
    option,
    sessionContext,
    signedTxs,
  }: {
    basketId: BN;
    rebalancer: PublicKey;
    command: RebalanceCommand;
    option?: RebalanceOption;
    sessionContext: RebalanceContext;
    signedTxs: VersionedTransaction[];
  }): Promise<{
    sessionContext: RebalanceContext;
    result: RebalanceResult;
    toSignTxs: VersionedTransaction[];
  }> {
    const basketMint = this.basketMintPDA({ basketId });

    const executor = new RebalanceExecutor(
      this,
      rebalancer,
      basketId,
      basketMint,
      sessionContext,
      signedTxs,
      command.wantComponents,
      option
    );
    const { ctx, result, toSignTxs } = await executor.buildNextTx();
    return {
      sessionContext: ctx,
      result,
      toSignTxs,
    };
  }
}

export interface RebalanceCommand {
  wantComponents: Component[];
}

export interface RebalanceOption {
  maxSlippageBps?: number;
}

export class Component {
  mint: PublicKey;
  quantityInSystem: BN;

  constructor(mint: PublicKey, quantity: BN) {
    this.mint = mint;
    this.quantityInSystem = quantity;
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
  SEND_STOP = "SEND_STOP",
  DONE = "DONE",
}

export class SwapSigStatus {
  mint: PublicKey;
  signature: string;
  status: TxStatus;
  errorReason: RebalanceErrorReason;
}

export class SwapPlan {
  mint: PublicKey;
  beforeAmount: BN;
  targetAmount: BN;

  constructor(mint: PublicKey, currentAmount: BN, targetAmount: BN) {
    this.mint = mint;
    this.beforeAmount = currentAmount;
    this.targetAmount = targetAmount;
  }

  isSell(): boolean {
    return this.targetAmount.lt(this.beforeAmount);
  }

  swapAmount(): BN {
    if (this.isSell()) {
      return this.beforeAmount.sub(this.targetAmount);
    } else {
      return this.targetAmount.sub(this.beforeAmount);
    }
  }
}

export class RebalanceContext {
  stage: RebalanceStage;
  step: number;

  successTxs: VersionedTransaction[];
  failedTxs: VersionedTransaction[];
  errors: Error[];

  componentsToSell: SwapPlan[];
  componentsToBuy: SwapPlan[];

  startSig?: string;
  sellSigs: SwapSigStatus[];
  buySigs: SwapSigStatus[];
  cleanupBuySig?: string;
  stopSig?: string;
  needCleanUp: boolean;

  constructor() {
    this.stage = RebalanceStage.START;
    this.step = 0;

    this.successTxs = [];
    this.failedTxs = [];
    this.errors = [];

    this.componentsToSell = [];
    this.componentsToBuy = [];
    this.startSig = undefined;
    this.sellSigs = [];
    this.buySigs = [];
    this.cleanupBuySig = undefined;
    this.stopSig = undefined;
    this.needCleanUp = false;
  }

  public serialize(): string {
    const serialized = {
      stage: this.stage,
      step: this.step,
      componentsToSell: this.componentsToSell.map((item) => ({
        mint: item.mint.toBase58(),
        currentAmount: item.beforeAmount.toString(),
        targetAmount: item.targetAmount.toString(),
      })),
      componentsToBuy: this.componentsToBuy.map((item) => ({
        mint: item.mint.toBase58(),
        currentAmount: item.beforeAmount.toString(),
        targetAmount: item.targetAmount.toString(),
      })),
      successTxs: this.successTxs.map((tx) =>
        Buffer.from(tx.serialize()).toString("base64")
      ),
      failedTxs: this.failedTxs.map((tx) =>
        Buffer.from(tx.serialize()).toString("base64")
      ),
      errors: this.errors.map((err) => {
        if (err instanceof RebalanceExecutionError) {
          return err.serialize();
        }
        return JSON.stringify({
          errorType: "GenericError",
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
      }),

      startSig: this.startSig,
      sellSigs: this.sellSigs.map((sig) => ({
        mint: sig.mint.toBase58(),
        signature: sig.signature,
        status: sig.status,
        errorReason: sig.errorReason,
      })),
      buySigs: this.buySigs.map((sig) => ({
        mint: sig.mint.toBase58(),
        signature: sig.signature,
        status: sig.status,
        errorReason: sig.errorReason,
      })),
      cleanupBuySig: this.cleanupBuySig,
      stopSig: this.stopSig,
      needCleanUp: this.needCleanUp,
    };
    return JSON.stringify(serialized);
  }

  public static deserialize(v: string): RebalanceContext {
    if (!v || v.trim() === "") {
      return new RebalanceContext();
    }
    const deserialized = JSON.parse(v);

    const ctx = new RebalanceContext();

    ctx.stage = deserialized.stage || RebalanceStage.START;
    ctx.step = deserialized.step || 0;
    ctx.componentsToSell = (deserialized.componentsToSell || []).map(
      (item) =>
        new SwapPlan(
          new PublicKey(item.mint),
          new BN(item.currentAmount),
          new BN(item.targetAmount)
        )
    );
    ctx.componentsToBuy = (deserialized.componentsToBuy || []).map(
      (item) =>
        new SwapPlan(
          new PublicKey(item.mint),
          new BN(item.currentAmount),
          new BN(item.targetAmount)
        )
    );
    ctx.successTxs = (deserialized.successTxs || []).map((tx) =>
      VersionedTransaction.deserialize(Buffer.from(tx, "base64"))
    );
    ctx.failedTxs = (deserialized.failedTxs || []).map((tx) =>
      VersionedTransaction.deserialize(Buffer.from(tx, "base64"))
    );
    ctx.errors = (deserialized.errors || []).map(
      (serializedErrorString: string) => {
        return deserializeErrorFromString(serializedErrorString);
      }
    );
    ctx.startSig = deserialized.startSig;
    ctx.sellSigs = (deserialized.sellSigs || []).map((sig) => ({
      mint: new PublicKey(sig.mint),
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason,
    }));
    ctx.buySigs = (deserialized.buySigs || []).map((sig) => ({
      mint: new PublicKey(sig.mint),
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason,
    }));
    ctx.cleanupBuySig = deserialized.cleanupBuySig;
    ctx.stopSig = deserialized.stopSig;
    ctx.needCleanUp = deserialized.needCleanUp;

    return ctx;
  }

  public clone(): RebalanceContext {
    const ctx = new RebalanceContext();
    ctx.stage = this.stage;
    ctx.step = this.step;
    ctx.successTxs = this.successTxs.map((tx) => tx);
    ctx.failedTxs = this.failedTxs.map((tx) => tx);
    ctx.errors = this.errors.map((err) => new Error(err.message));
    ctx.startSig = this.startSig;
    ctx.sellSigs = this.sellSigs.map((sig) => ({
      mint: sig.mint,
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason,
    }));
    ctx.buySigs = this.buySigs.map((sig) => ({
      mint: sig.mint,
      signature: sig.signature,
      status: sig.status,
      errorReason: sig.errorReason,
    }));
    ctx.cleanupBuySig = this.cleanupBuySig;
    ctx.stopSig = this.stopSig;
    ctx.needCleanUp = this.needCleanUp;
    ctx.componentsToSell = this.componentsToSell.map((item) => item);
    ctx.componentsToBuy = this.componentsToBuy.map((item) => item);
    return ctx;
  }

  componentsToSellWithoutNative(): SwapPlan[] {
    return this.componentsToSell.filter(
      (item) => !item.mint.equals(new PublicKey(NATIVE_MINT))
    );
  }

  componentsToBuyWithoutNative(): SwapPlan[] {
    return this.componentsToBuy.filter(
      (item) => !item.mint.equals(new PublicKey(NATIVE_MINT))
    );
  }
}

/**
 * Status enum for rebalance execution result
 */
export enum RebalanceStatus {
  STATUS_UNSPECIFIED = "STATUS_UNSPECIFIED",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

/**
 * Error reason enum for rebalance execution result
 */
export enum RebalanceErrorReason {
  ERROR_REASON_UNSPECIFIED = "ERROR_REASON_UNSPECIFIED",
  TX_FAILED_UNKNOWN = "TX_FAILED_UNKNOWN",
  INSUFFICIENT_FEE = "INSUFFICIENT_FEE",
}

/**
 * Swap status enum
 */
export enum TxStatus {
  STATUS_UNSPECIFIED = 0,
  SUCCESS = 1,
  FAILED = 2,
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
  private prevCtx: RebalanceContext;
  private curCtx: RebalanceContext;
  private instructor: RebalancerInstructions;

  private nextTxs: VersionedTransaction[] = [];

  private wantComponents: Component[];
  // option
  private maxSlippageBps: number;

  private signedTxs: VersionedTransaction[];

  private readonly SWAP_MAX_ACCOUNTS = 50; // default value is 64

  constructor(
    instructor: RebalancerInstructions,
    rebalancer: PublicKey,
    basketId: BN,
    basketMint: PublicKey,
    prevContext: RebalanceContext,
    signedTxs: VersionedTransaction[],
    wantComponents: Component[],
    option?: {
      maxSlippageBps?: number;
    }
  ) {
    this.instructor = instructor;
    this.connection = this.instructor.connection;
    this.basketId = basketId;
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
    return new RebalanceResult(this.curCtx);
  }

  async buildNextTx(): Promise<{
    ctx: RebalanceContext;
    result: RebalanceResult;
    toSignTxs: VersionedTransaction[];
  }> {
    try {
      await this.fetchBasketConfig();

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

          case RebalanceStage.SEND_STOP:
            await this.handleSendStopStage();
            break;

          case RebalanceStage.DONE:
            break;

          default:
            throw new Error(`Invalid stage: ${this.curCtx.stage}`);
        }

        if (this.curCtx.stage === RebalanceStage.DONE) {
          break;
        }
        if (this.curCtx.errors.length > 0) {
          if (
            this.curCtx.stage !== RebalanceStage.SEND_STOP &&
            this.curCtx.stage !== RebalanceStage.STOP
          ) {
            await this.abnormalStop();
            this.curCtx.stage = RebalanceStage.SEND_STOP;
          }

          break;
        }

        this.curCtx.stage = nextStage(this.curCtx.stage);
      }
    } catch (error) {
      console.error("error in buildNextTx", error);
      let errors = [];
      if (error instanceof BatchTransactionProcessingError) {
        errors = error.innerErrors;
      } else {
        errors = [error];
      }

      for (const err of errors) {
        this.curCtx.errors.push(err);
        if (err instanceof RebalanceSendTransactionError && err.tx) {
          this.curCtx.failedTxs.push(err.tx);
        }
      }
    }

    return {
      ctx: this.curCtx,
      result: this.result(),
      toSignTxs: this.nextTxs,
    };
  }

  private wantComponentQtyInSysMap(): Map<string, BN> {
    const out = new Map<string, BN>();
    for (const wc of this.wantComponents) {
      out.set(wc.mint.toString(), wc.quantityInSystem);
    }
    return out;
  }

  private async currentComponentQtyInSysMap(): Promise<Map<string, BN>> {
    const out = new Map<string, BN>();

    const basketCfg = await this.fetchBasketConfig();
    for (const component of basketCfg.components) {
      out.set(component.mint.toString(), component.quantityInSysDecimal);
    }
    return out;
  }

  private async basketTotalSupply(): Promise<BN> {
    const totalSupplyResp = await this.connection.getTokenSupply(
      this.basketMint
    );
    return new BN(totalSupplyResp.value.amount);
  }

  private async componentsToSell(): Promise<SwapPlan[]> {
    const out = [];
    const totalSupply = await this.basketTotalSupply();
    const wantComponentMap = this.wantComponentQtyInSysMap();
    const curComponentQtyInSysMap = await this.currentComponentQtyInSysMap();

    for (const [mintString, curSysQty] of curComponentQtyInSysMap) {
      const wantQtyInSys = wantComponentMap.get(mintString) || new BN(0);

      let sellQtyInSys = curSysQty;
      if (wantQtyInSys) {
        if (curSysQty.lte(wantQtyInSys)) {
          continue;
        }
        sellQtyInSys = curSysQty.sub(wantQtyInSys);
      }

      const sellAmount = sellQtyInSys.mul(totalSupply).divn(SYS_DECIMALS);

      const currentAmount = new BN(curSysQty)
        .mul(totalSupply)
        .divn(SYS_DECIMALS);

      out.push(
        new SwapPlan(
          new PublicKey(mintString),
          currentAmount,
          currentAmount.sub(sellAmount)
        )
      );
    }
    out.sort((a, b) => a.mint.toBase58().localeCompare(b.mint.toBase58()));
    return out;
  }

  private async componentsToBuy(): Promise<SwapPlan[]> {
    const out: SwapPlan[] = [];
    const totalSupply = await this.basketTotalSupply();
    const wantComponentMap = this.wantComponentQtyInSysMap();

    const sellComponentSet = new Set<string>();
    for (const sellComponent of await this.componentsToSell()) {
      sellComponentSet.add(sellComponent.mint.toString());
    }

    const currentComponentQtyInSysMap =
      await this.currentComponentQtyInSysMap();

    for (const [mintString, curSysQty] of currentComponentQtyInSysMap) {
      if (sellComponentSet.has(mintString)) {
        continue;
      }

      let buyQtyInSys = new BN(0);

      const wantQtyInSys = wantComponentMap.get(mintString.toString());
      if (!wantQtyInSys) {
        continue;
      }

      if (curSysQty.gte(wantQtyInSys)) {
        continue;
      }

      buyQtyInSys = wantQtyInSys.sub(curSysQty);
      const buyAmount = buyQtyInSys.mul(totalSupply).divn(SYS_DECIMALS);

      const currentAmount = new BN(curSysQty)
        .mul(totalSupply)
        .divn(SYS_DECIMALS);

      out.push(
        new SwapPlan(
          new PublicKey(mintString),
          currentAmount,
          currentAmount.add(buyAmount)
        )
      );
    }

    for (const [mintString, wantQtyInSys] of this.wantComponentQtyInSysMap()) {
      const curSysQty = currentComponentQtyInSysMap.get(mintString);
      if (curSysQty) {
        continue;
      }

      const buyAmount = wantQtyInSys.mul(totalSupply).divn(SYS_DECIMALS);
      out.push(new SwapPlan(new PublicKey(mintString), new BN(0), buyAmount));
    }
    out.sort((a, b) => a.mint.toBase58().localeCompare(b.mint.toBase58()));
    return out;
  }

  private async handleStartStage(): Promise<void> {
    const basketCfg = await this.fetchBasketConfig();
    if (basketCfg.state.rebalancing) {
      return;
    }

    try {
      const startTx = await this.instructor.startRebalancing({
        rebalancer: this.rebalancer,
        basketId: this.basketId,
      });

      const recentBlockhash = (
        await this.connection.getLatestBlockhash("confirmed")
      ).blockhash;
      const vtxMessage = new TransactionMessage({
        payerKey: this.rebalancer,
        recentBlockhash,
        instructions: startTx.instructions,
      });
      const tx = new VersionedTransaction(vtxMessage.compileToV0Message());
      this.nextTxs.push(tx);
    } catch (error) {
      throw new RebalanceControlTxBuildError(
        "Failed to build startRebalancing transaction",
        error instanceof Error ? error : new Error(String(error))
      );
    }
    return;
  }

  private async handleSellStage(): Promise<void> {
    if (this.signedTxs.length > 0) {
      // Send StartTx
      if (this.signedTxs.length > 1) {
        throw new Error("Sell stage can only have one start tx signed");
      }

      const tx = this.signedTxs[0];

      try {
        const sig = await sendAndConfirmVersionedTransaction(
          this.connection,
          tx
        );
        this.curCtx.successTxs.push(tx);
        this.curCtx.startSig = sig;
      } catch (err) {
        throw new RebalanceSendTransactionError(
          err instanceof Error ? err.message : String(err),
          err instanceof Error ? err : undefined, // cause
          tx
        );
      }
      this.signedTxs = [];
    }

    // Update Components
    const [componentsToSell, componentsToBuy] = await Promise.all([
      this.componentsToSell(),
      this.componentsToBuy(),
    ]);
    this.curCtx.componentsToSell = componentsToSell;
    this.curCtx.componentsToBuy = componentsToBuy;

    try {
      // Build Sell Txs
      const swapPlans = this.curCtx.componentsToSellWithoutNative();
      const txPromises = swapPlans.map(async (swapPlan) => {
        return await this.instructor.executeRebalancingJupiterTx({
          connection: this.connection,
          rebalancer: this.rebalancer,
          basketId: this.basketId,
          inputMint: swapPlan.mint,
          outputMint: NATIVE_MINT,
          amount: swapPlan.swapAmount().toNumber(),
          swapMode: "ExactIn",
          maxAccounts: this.SWAP_MAX_ACCOUNTS,
          slippageBps: this.maxSlippageBps,
        });
      });

      const results = await Promise.all(txPromises);
      this.nextTxs.push(...results);
    } catch (error) {
      throw new RebalanceSwapTxBuildError(
        "Failed to create sell transactions for sell stage",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async handleBuyStage(): Promise<void> {
    if (this.signedTxs.length > 0) {
      const sellPromises = this.signedTxs.map(async (tx, i) => {
        const componentsToSell = this.curCtx.componentsToSellWithoutNative();
        if (componentsToSell.length <= i) {
          throw new Error(`Unknown mint. ${i} ${componentsToSell.length}`);
        }
        const mint = componentsToSell[i].mint;

        try {
          const sig = await sendAndConfirmVersionedTransaction(
            this.connection,
            tx
          );
          return { mint, signature: sig, tx, error: null };
        } catch (err) {
          return { mint, signature: null, tx, error: err };
        }
      });

      const results = await Promise.allSettled(sellPromises);
      const collectedErrors: RebalanceSendTransactionError[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { mint, signature, tx, error } = result.value;
          if (error === null) {
            this.curCtx.sellSigs.push({
              mint,
              signature,
              status: TxStatus.SUCCESS,
              errorReason: RebalanceErrorReason.ERROR_REASON_UNSPECIFIED,
            });
            this.curCtx.successTxs.push(tx);
          } else {
            // TODO: ParseError
            this.curCtx.sellSigs.push({
              mint,
              signature: null,
              status: TxStatus.FAILED,
              errorReason: RebalanceErrorReason.TX_FAILED_UNKNOWN,
            });
            collectedErrors.push(
              new RebalanceSendTransactionError(error.message, error, tx)
            );
          }
        } else {
          // result.status === 'rejected'
          const error = result.reason;
          collectedErrors.push(
            new RebalanceExecutionError(
              "unknown error in handleBuyStage",
              error
            )
          );
        }
      });
      if (collectedErrors.length > 0) {
        throw new BatchTransactionProcessingError(
          "Errors occurred during sell transaction settlement in handleBuyStage",
          collectedErrors
        );
      }
      this.signedTxs = [];
    }

    const { currentNativeTokenAmount, wantNativeTokenAmount } =
      await this.nativeTokenAmounts();

    this.curCtx.needCleanUp =
      wantNativeTokenAmount.eq(new BN(0)) &&
      this.curCtx.componentsToBuyWithoutNative().length > 0;

    const availableNativeTokenAmount = currentNativeTokenAmount.sub(
      wantNativeTokenAmount
    );
    console.log(
      `Available native token amount: ${availableNativeTokenAmount.toString()}`
    );

    if (availableNativeTokenAmount.lte(new BN(0))) {
      return;
    }
    if (this.curCtx.componentsToBuyWithoutNative().length === 0) {
      return;
    }

    const tmpBuyPlanPromises = this.curCtx
      .componentsToBuyWithoutNative()
      .filter((swapPlan) => swapPlan.swapAmount().gt(new BN(0)))
      .map(async (swapPlan) => {
        const estimatedNativeNeeded = await getPrice(
          swapPlan.mint,
          swapPlan.swapAmount().toNumber(),
          this.maxSlippageBps
        );
        return {
          mint: swapPlan.mint,
          estimatedNativeNeeded,
        };
      });
    const tmpBuyPlans = await Promise.all(tmpBuyPlanPromises);

    let totalNativeNeeded = new BN(0);
    for (const plan of tmpBuyPlans) {
      totalNativeNeeded = totalNativeNeeded.add(plan.estimatedNativeNeeded);
    }
    if (tmpBuyPlans.length > 0 && totalNativeNeeded.lte(new BN(0))) {
      throw new Error("No native token needed for buy");
    }

    // Distribute available native tokens proportionally to each component
    const buyPlans = tmpBuyPlans
      .filter((plan) => plan.estimatedNativeNeeded.gt(new BN(0)))
      .map((plan) => {
        const ratio =
          plan.estimatedNativeNeeded.toNumber() / totalNativeNeeded.toNumber();
        const allocatedNative = new BN(
          availableNativeTokenAmount.toNumber() * ratio
        );

        return {
          mint: plan.mint,
          swapAmount: allocatedNative,
        };
      });

    console.log(`Generated ${buyPlans.length} buy plans`);

    if (this.curCtx.needCleanUp) {
      buyPlans.pop(); // buy in CLEANUP_BUY stage
      console.log("Need to clean up, so one buy plan is removed");
    }
    try {
      const txPromises = buyPlans
        .filter((plan): Boolean => {
          if (plan.swapAmount.toNumber() < 100 && this.curCtx.needCleanUp) {
            return false;
          }
          return true;
        })
        .map(async (plan) => {
          return this.instructor.executeRebalancingJupiterTx({
            connection: this.connection,
            rebalancer: this.rebalancer,
            basketId: this.basketId,
            inputMint: new PublicKey(NATIVE_MINT),
            outputMint: plan.mint,
            amount: plan.swapAmount.toNumber(),
            swapMode: "ExactIn",
            maxAccounts: this.SWAP_MAX_ACCOUNTS,
            slippageBps: this.maxSlippageBps,
          });
        });

      const txs = await Promise.all(txPromises);
      this.nextTxs.push(...txs.filter((tx) => tx !== null));
    } catch (error) {
      throw new RebalanceSwapTxBuildError(
        `Failed to create buy transaction`,
        error instanceof Error ? error : new Error(String(error)) // cause
      );
    }
  }

  private async handleCleanUpBuyStage(): Promise<void> {
    if (this.signedTxs.length > 0) {
      const collectedErrors: RebalanceExecutionError[] = [];

      const buyPromises = this.signedTxs.map(async (tx, i) => {
        const componentsToBuy = this.curCtx.componentsToBuyWithoutNative();
        if (componentsToBuy.length <= i) {
          throw new Error(
            `Index out of bounds for componentsToBuy in handleCleanUpBuyStage. Index: ${i}, Length: ${componentsToBuy.length}`
          );
        }
        const mint = componentsToBuy[i].mint;

        try {
          const sig = await sendAndConfirmVersionedTransaction(
            this.connection,
            tx
          );
          return { mint, signature: sig, tx, error: null };
        } catch (err) {
          return { mint, signature: null, tx, error: err };
        }
      });

      const results = await Promise.allSettled(buyPromises);

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { mint, signature, tx, error } = result.value;
          if (error === null) {
            // Successful transaction
            this.curCtx.buySigs.push({
              mint,
              signature,
              status: TxStatus.SUCCESS,
              errorReason: RebalanceErrorReason.ERROR_REASON_UNSPECIFIED,
            });
            this.curCtx.successTxs.push(tx);
          } else {
            // TODO: ParseError
            this.curCtx.buySigs.push({
              mint,
              signature: null,
              status: TxStatus.FAILED,
              errorReason: RebalanceErrorReason.TX_FAILED_UNKNOWN,
            });
            collectedErrors.push(
              new RebalanceSendTransactionError(error.message, error, tx)
            );
          }
        } else {
          const reason = result.reason;
          collectedErrors.push(
            new RebalanceExecutionError(
              "unknown error in handleCleanUpBuyStage",
              reason
            )
          );
        }
      });

      if (collectedErrors.length > 0) {
        throw new BatchTransactionProcessingError(
          "Errors occurred during buy transaction settlement in handleCleanUpBuyStage",
          collectedErrors
        );
      }
      this.signedTxs = [];
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

    const { currentNativeTokenAmount, wantNativeTokenAmount } =
      await this.nativeTokenAmounts();

    if (currentNativeTokenAmount.lte(wantNativeTokenAmount)) {
      console.log(
        `No remaining native token amount for cleanup . current: ${currentNativeTokenAmount.toString()}, want: ${wantNativeTokenAmount.toString()}`
      );
      return;
    }

    // Get remaining native tokens after previous BUY transactions
    const remainingNativeTokenAmount = currentNativeTokenAmount.sub(
      wantNativeTokenAmount
    );
    console.log(
      `Remaining native token amount for cleanup: ${remainingNativeTokenAmount.toString()}`
    );

    try {
      const cleanupTx = await this.instructor.executeRebalancingJupiterTx({
        connection: this.connection,
        rebalancer: this.rebalancer,
        basketId: this.basketId,
        inputMint: new PublicKey(NATIVE_MINT),
        outputMint: componentToBuy.mint,
        amount: remainingNativeTokenAmount.toNumber(),
        swapMode: "ExactIn",
        maxAccounts: this.SWAP_MAX_ACCOUNTS,
        slippageBps: this.maxSlippageBps,
      });

      this.nextTxs.push(cleanupTx);
      console.log(
        `Created cleanup swap transaction for ${componentToBuy.mint.toBase58()}`
      );
    } catch (error) {
      console.log("error in handleCleanUpBuyStage");
      throw new RebalanceSwapTxBuildError(
        `Failed to create cleanup buy transaction for ${componentToBuy.mint.toBase58()}`,
        error instanceof Error ? error : new Error(String(error)) // cause
      );
    }
  }

  private async handleStopStage(): Promise<void> {
    if (this.signedTxs.length > 0) {
      // Send Clean Up Buy Tx
      if (this.signedTxs.length > 1) {
        throw new RebalanceExecutionError(
          "Stop stage can receive maximum 1 signed tx (for cleanup buy)"
        );
      }

      const tx = this.signedTxs[0];

      try {
        const sig = await sendAndConfirmVersionedTransaction(
          this.connection,
          tx
        );
        this.curCtx.successTxs.push(tx);
        this.curCtx.cleanupBuySig = sig;
      } catch (err) {
        throw new RebalanceSendTransactionError(
          `Failed to send cleanup buy transaction in StopStage: ${
            err instanceof Error ? err.message : String(err)
          }`,
          err instanceof Error ? err : undefined,
          tx
        );
      }
      this.signedTxs = [];
    }

    const basketCfg = await this.fetchBasketConfig();
    if (!basketCfg.state.rebalancing) {
      return;
    }

    try {
      const stopTx = await this.instructor.stopRebalancing({
        rebalancer: this.rebalancer,
        basketId: this.basketId,
      });

      const recentBlockhash = (
        await this.connection.getLatestBlockhash("confirmed")
      ).blockhash;
      const vtxMessage = new TransactionMessage({
        payerKey: this.rebalancer,
        recentBlockhash,
        instructions: stopTx.instructions,
      });

      const vtx = new VersionedTransaction(vtxMessage.compileToV0Message());
      this.nextTxs.push(vtx);
    } catch (error) {
      throw new RebalanceControlTxBuildError(
        "Failed to build stopRebalancing transaction",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async abnormalStop() {
    try {
      const stopTx = await this.instructor.stopRebalancing({
        rebalancer: this.rebalancer,
        basketId: this.basketId,
      });

      const recentBlockhash = (
        await this.connection.getLatestBlockhash("confirmed")
      ).blockhash;
      const vtxMessage = new TransactionMessage({
        payerKey: this.rebalancer,
        recentBlockhash,
        instructions: stopTx.instructions,
      });

      const vtx = new VersionedTransaction(vtxMessage.compileToV0Message());
      this.nextTxs = [vtx];
    } catch (error) {
      throw new RebalanceControlTxBuildError(
        "Failed to build stopRebalancing transaction in abnormalStop",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async handleSendStopStage(): Promise<void> {
    if (this.signedTxs.length === 0) {
      // send stop tx
      return;
    }
    if (this.signedTxs.length > 1) {
      throw new Error("End stage can maximum 1 tx");
    }

    const tx = this.signedTxs[0];
    try {
      const sig = await sendAndConfirmVersionedTransaction(this.connection, tx);
      this.curCtx.successTxs.push(tx);
      this.curCtx.stopSig = sig;
    } catch (err) {
      this.curCtx.failedTxs.push(tx);
      this.curCtx.errors.push(err);
    }
    return;
  }

  private async nativeTokenAmounts(): Promise<{
    currentNativeTokenAmount: BN;
    wantNativeTokenAmount: BN;
  }> {
    const [basketCfg, totalSupply] = await Promise.all([
      this.fetchBasketConfig(),
      this.basketTotalSupply(),
    ]);

    let currentNativeTokenAmount = new BN(0);
    for (const component of basketCfg.components) {
      if (component.mint.equals(new PublicKey(NATIVE_MINT))) {
        currentNativeTokenAmount = component.quantityInSysDecimal
          .mul(totalSupply)
          .divn(SYS_DECIMALS);
        break;
      }
    }

    let wantNativeTokenAmount = new BN(0);
    for (const [
      mintString,
      qtyInSys,
    ] of this.wantComponentQtyInSysMap().entries()) {
      if (mintString === NATIVE_MINT.toString()) {
        wantNativeTokenAmount = qtyInSys.mul(totalSupply).divn(SYS_DECIMALS);
        break;
      }
    }
    return {
      currentNativeTokenAmount,
      wantNativeTokenAmount,
    };
  }

  private async fetchBasketConfig(): Promise<BasketConfig> {
    const basketCfg = await this.instructor.getBasketConfig({
      basketId: this.basketId,
    });
    if (!basketCfg) {
      throw new Error("Basket config not found");
    }
    return basketCfg;
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
    if (this.ctx.stage === RebalanceStage.DONE) {
      return RebalanceStatus.SUCCESS;
    }
    return RebalanceStatus.IN_PROGRESS;
  }

  errorReason(): RebalanceErrorReason {
    if (this.ctx.errors.length === 0) {
      return RebalanceErrorReason.ERROR_REASON_UNSPECIFIED;
    }
    // const err = this.ctx.errors[0];
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
      let sig = "";
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
        inAmount: sell.beforeAmount,
        outAmount: sell.targetAmount,
        txSignature: sig,
        status: status,
        errorReason: errorReason,
      });
    });
    buys.forEach((buy, index) => {
      let sig = "";
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
        inAmount: buy.beforeAmount,
        outAmount: buy.targetAmount,
        txSignature: sig,
        status: status,
        errorReason: errorReason,
      });
    });
    return out;
  }
}

function nextStage(stage: RebalanceStage): RebalanceStage {
  switch (stage) {
    case RebalanceStage.START:
      return RebalanceStage.SELL;
    case RebalanceStage.SELL:
      return RebalanceStage.BUY;
    case RebalanceStage.BUY:
      return RebalanceStage.CLEANUP_BUY;
    case RebalanceStage.CLEANUP_BUY:
      return RebalanceStage.STOP;
    case RebalanceStage.STOP:
      return RebalanceStage.SEND_STOP;
    case RebalanceStage.SEND_STOP:
      return RebalanceStage.DONE;
    default:
      throw new Error(`Invalid rebalance stage: ${stage}.`);
  }
}
