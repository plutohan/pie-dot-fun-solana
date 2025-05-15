import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection, TransactionInstruction, AddressLookupTableAccount, VersionedTransaction } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import { SwapInstructionsResponse } from "@jup-ag/api";
/**
 * Class for handling rebalancer-related instructions
 */
export declare class RebalancerInstructions extends ProgramStateManager {
    readonly connection: Connection;
    readonly programId: PublicKey;
    constructor(connection: Connection, programId: PublicKey);
    /**
     * Starts rebalancing.
     * @param rebalancer - The rebalancer account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    startRebalancing({ rebalancer, basketId, }: {
        rebalancer: PublicKey;
        basketId: BN;
    }): Promise<Transaction>;
    /**
     * Stops rebalancing.
     * @param rebalancer - The rebalancer account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    stopRebalancing({ rebalancer, basketId, }: {
        rebalancer: PublicKey;
        basketId: BN;
    }): Promise<Transaction>;
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
    executeRebalancingJupiterIx({ basketId, inputMint, outputMint, amount, swapMode, maxAccounts, rebalancer, slippageBps, dynamicSlippage, }: {
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
    }>;
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
    executeRebalancingJupiterTx({ connection, rebalancer, basketId, inputMint, outputMint, amount, swapMode, maxAccounts, slippageBps, dynamicSlippage, }: {
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
    }): Promise<VersionedTransaction>;
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
    buildNextRebalanceStepTx({ basketMint, rebalancer, command, option, executionContext, signedTxs, }: {
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
    }>;
}
/**
 * Rebalance stage enum representing the state of the rebalancing process
 */
export declare enum RebalanceStage {
    START = "START",
    SELL = "SELL",
    BUY = "BUY",
    CLEANUP_BUY = "CLEANUP_BUY",
    STOP = "STOP",
    SEND_STOP_TX = "SEND_STOP_TX",
    END = "END"
}
export declare class SwapSigStatus {
    mint: PublicKey;
    signature: string;
    status: TxStatus;
    errorReason: RebalanceErrorReason;
}
export declare class RebalanceContext {
    stage: RebalanceStage;
    step: number;
    successTxs: VersionedTransaction[];
    failedTxs: VersionedTransaction[];
    errors: Error[];
    componentsToSell: {
        mint: PublicKey;
        currentAmount: BN;
        targetAmount: BN;
    }[];
    componentsToBuy: {
        mint: PublicKey;
        currentAmount: BN;
        targetAmount: BN;
    }[];
    startSig?: string;
    sellSigs: SwapSigStatus[];
    buySigs: SwapSigStatus[];
    cleanupBuySig?: string;
    stopSig?: string;
    needCleanUp: boolean;
    constructor();
    serialize(): string;
    static deserialize(v: string): RebalanceContext;
    clone(): RebalanceContext;
    componentsToSellWithoutNative(): {
        mint: PublicKey;
        currentAmount: BN;
        targetAmount: BN;
    }[];
    componentsToBuyWithoutNative(): {
        mint: PublicKey;
        currentAmount: BN;
        targetAmount: BN;
    }[];
}
/**
 * Status enum for rebalance execution result
 */
export declare enum RebalanceStatus {
    STATUS_UNSPECIFIED = 0,
    IN_PROGRESS = 1,
    SUCCESS = 2,
    FAILED = 3
}
/**
 * Error reason enum for rebalance execution result
 */
export declare enum RebalanceErrorReason {
    ERROR_REASON_UNSPECIFIED = 0,
    TX_FAILED_UNKNOWN = 1,
    INSUFFICIENT_FEE = 2
}
/**
 * Swap status enum
 */
export declare enum TxStatus {
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
export declare class RebalanceExecutor {
    private connection;
    private rebalancer;
    private basketId;
    private basketMint;
    private basketConfig;
    private prevCtx;
    private curCtx;
    private instructor;
    private nextTxs;
    private wantComponents;
    private maxSlippageBps;
    private signedTxs;
    /**
     * Constructor
     * @param connection - Solana connection
     * @param basketConfig - Basket configuration
     * @param executionContext - Previous execution context
     */
    constructor(instructor: RebalancerInstructions, rebalancer: PublicKey, basketMint: PublicKey, prevContext: RebalanceContext, signedTxs: VersionedTransaction[], wantComponents: {
        fungibleToken: PublicKey;
        quantityInSysDecimal: BN;
    }[], option?: {
        maxSlippageBps?: number;
    });
    private stage;
    result(): RebalanceResult;
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
    buildNextTx(): Promise<{
        ctx: RebalanceContext;
        result: RebalanceResult;
        toSignTxs: VersionedTransaction[];
    }>;
    /**
     * Handle START stage
     * @private
     */
    private handleStartStage;
    private wantComponentQtyMap;
    private currentComponentQtyMap;
    private basketTotalSupply;
    private componentsToSell;
    private componentsToBuy;
    private handleSellStage;
    private handleBuyStage;
    private handleCleanUpBuyStage;
    private handleStopStage;
    private handleEndStage;
    private nativeTokenAmounts;
}
export declare class RebalanceResult {
    ctx: RebalanceContext;
    constructor(ctx: RebalanceContext);
    status(): RebalanceStatus;
    errorReason(): RebalanceErrorReason;
    txSignatures(): string[];
    failedTxSignatures(): string[];
    swaps(): Swap[];
}
//# sourceMappingURL=rebalancer-instructions.d.ts.map