import { BN, EventParser, Idl, IdlAccounts, IdlEvents, IdlTypes, Program } from "@coral-xyz/anchor";
import { AddressLookupTableAccount, Cluster, Commitment, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Pie } from "../target/types/pie";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { Jito } from "../sdk/jito";
import { BuySwapData, RebalanceInfo, TokenInfo } from "./types";
export type ProgramState = IdlAccounts<Pie>["programState"];
export type BasketConfig = IdlAccounts<Pie>["basketConfig"];
export type UserFund = IdlAccounts<Pie>["userFund"];
export type BasketComponent = IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = IdlTypes<Pie>["createBasketArgs"];
export type CreateBasketEvent = IdlEvents<Pie>["createBasketEvent"];
export type UpdateRebalancerEvent = IdlEvents<Pie>["updateRebalancerEvent"];
export type TransferAdminEvent = IdlEvents<Pie>["transferAdminEvent"];
export type TransferBasketEvent = IdlEvents<Pie>["transferBasketEvent"];
export type ExecuteRebalancingEvent = IdlEvents<Pie>["executeRebalancingEvent"];
export type StartRebalancingEvent = IdlEvents<Pie>["startRebalancingEvent"];
export type StopRebalancingEvent = IdlEvents<Pie>["stopRebalancingEvent"];
export type BuyComponentEvent = IdlEvents<Pie>["buyComponentEvent"];
export type SellComponentEvent = IdlEvents<Pie>["sellComponentEvent"];
export type MintBasketTokenEvent = IdlEvents<Pie>["mintBasketTokenEvent"];
export type RedeemBasketTokenEvent = IdlEvents<Pie>["redeemBasketTokenEvent"];
export declare class PieProgram {
    readonly connection: Connection;
    readonly cluster: Cluster;
    readonly jitoRpcUrl: string;
    sharedLookupTable: string;
    private idl;
    raydium: Raydium;
    eventParser: EventParser;
    jito: Jito;
    constructor(connection: Connection, cluster: Cluster, jitoRpcUrl: string, programId?: string, sharedLookupTable?: string);
    init(): Promise<void>;
    get program(): Program<Idl>;
    get accounts(): any;
    get programStatePDA(): PublicKey;
    basketConfigPDA({ basketId }: {
        basketId: BN;
    }): PublicKey;
    basketMintPDA({ basketId }: {
        basketId: BN;
    }): PublicKey;
    userFundPDA({ user, basketId, }: {
        user: PublicKey;
        basketId: BN;
    }): PublicKey;
    metadataPDA({ mint }: {
        mint: PublicKey;
    }): PublicKey;
    getProgramState(): Promise<ProgramState | null>;
    getPlatformFeeTokenAccount(): Promise<PublicKey>;
    getCreatorFeeTokenAccount({ basketId, }: {
        basketId: BN;
    }): Promise<PublicKey>;
    getBasketConfig({ basketId, }: {
        basketId: BN;
    }): Promise<BasketConfig | null>;
    getUserFund({ user, basketId, }: {
        user: PublicKey;
        basketId: BN;
    }): Promise<UserFund | null>;
    getTokenBalance({ mint, owner, commitment, }: {
        mint: PublicKey;
        owner: PublicKey;
        commitment?: Commitment;
    }): Promise<number>;
    getAllTokenAccountWithBalance({ owner }: {
        owner: PublicKey;
    }): Promise<{
        mint: PublicKey;
        owner: PublicKey;
        pubkey: PublicKey;
        tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
        };
    }[]>;
    getBasketVaults({ basketId }: {
        basketId: BN;
    }): Promise<{
        mint: PublicKey;
        balance: number;
    }[]>;
    /**
     * Initializes the program.
     * @param admin - The admin account.
     * @returns A promise that resolves to a transaction.
     */
    initialize({ initializer, admin, creator, platformFeeWallet, platformFeePercentage, }: {
        initializer: PublicKey;
        admin: PublicKey;
        creator: PublicKey;
        platformFeeWallet: PublicKey;
        platformFeePercentage: BN;
    }): Promise<Transaction>;
    initializeSharedLookupTable({ admin, }: {
        admin: Keypair;
    }): Promise<PublicKey>;
    addBaksetToSharedLookupTable({ basketId, admin, }: {
        basketId: BN;
        admin: Keypair;
    }): Promise<void>;
    /**
     * Transfers the admin role to a new account.
     * @param admin - The current admin account.
     * @param newAdmin - The new admin account.
     * @returns A promise that resolves to a transaction.
     */
    transferAdmin({ admin, newAdmin, }: {
        admin: PublicKey;
        newAdmin: PublicKey;
    }): Promise<Transaction>;
    /**
     * Updates the rebalance margin.
     * @param admin - The admin account.
     * @param newMargin - The new margin.
     * @returns A promise that resolves to a transaction.
     */
    updateRebalanceMargin({ admin, newMargin, }: {
        admin: PublicKey;
        newMargin: number;
    }): Promise<Transaction>;
    /**
     * Updates the fee. 10000 = 100% => 1000 = 1%
     * @param admin - The admin account.
     * @param newCreatorFeePercentage - The new creator fee percentage.
     * @param newPlatformFeePercentage - The new platform fee percentage.
     * @returns A promise that resolves to a transaction.
     */
    updateFee({ admin, newCreatorFeePercentage, newPlatformFeePercentage, }: {
        admin: PublicKey;
        newCreatorFeePercentage: number;
        newPlatformFeePercentage: number;
    }): Promise<Transaction>;
    /**
     * Updates the platform fee wallet.
     * @param admin - The admin account.
     * @param newPlatformFeeWallet - The new platform fee wallet.
     * @returns A promise that resolves to a transaction.
     */
    updatePlatformFeeWallet({ admin, newPlatformFeeWallet, }: {
        admin: PublicKey;
        newPlatformFeeWallet: PublicKey;
    }): Promise<Transaction>;
    updateWhitelistedCreators({ admin, newWhitelistedCreators, }: {
        admin: PublicKey;
        newWhitelistedCreators: PublicKey[];
    }): Promise<Transaction>;
    /**
     * Creates vaults account for all basket.
     * @param creator - The creator account.
     * @param args - The basket arguments.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    createBasketVaultAccounts({ creator, args, basketId, }: {
        creator: PublicKey;
        args: CreateBasketArgs;
        basketId: BN;
    }): Promise<{
        vaults: PublicKey[];
        tx: Transaction;
    }>;
    /**
     * Creates a basket.
     * @param creator - The creator account.
     * @param args - The basket arguments.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    createBasket({ creator, args, basketId, }: {
        creator: PublicKey;
        args: CreateBasketArgs;
        basketId: BN;
    }): Promise<Transaction>;
    /**
     * Creates a basket.
     * @param creator - The creator account.
     * @param basketId - The basket ID.
     * @param newRebalancer - New rebalancer in the basket
     * @returns A promise that resolves to a transaction.
     */
    updateRebalancer({ creator, basketId, newRebalancer, }: {
        creator: PublicKey;
        basketId: BN;
        newRebalancer: PublicKey;
    }): Promise<Transaction>;
    /**
     * Deposits WSOL into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of WSOL to deposit.
     * @returns A promise that resolves to a transaction.
     */
    depositWsol({ user, basketId, amount, userWsolAccount, }: {
        user: PublicKey;
        basketId: BN;
        amount: string;
        userWsolAccount: PublicKey;
    }): Promise<Transaction>;
    /**
     * Buys a component.
     * @param userSourceOwner - The user source owner account.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    buyComponent({ userSourceOwner, basketId, maxAmountIn, amountOut, ammId, unwrapSol, }: {
        userSourceOwner: PublicKey;
        basketId: BN;
        maxAmountIn: number;
        amountOut: number;
        ammId: string;
        unwrapSol?: boolean;
    }): Promise<Transaction>;
    /**
     * Buys a component CPMM.
     * @param user - The user source owner account.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    buyComponentCpmm({ user, basketId, amountOut, poolId, }: {
        user: PublicKey;
        basketId: BN;
        amountOut: number;
        poolId: string;
    }): Promise<Transaction>;
    /**
     * Buys a component using CLMM from Raydium.
     * @param user - The user source owner account.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param poolId - The CLMM pool ID.
     * @returns A promise that resolves to a transaction.
     */
    buyComponentClmm({ user, basketId, amountOut, outputMint, poolId, slippage, }: {
        user: PublicKey;
        basketId: BN;
        amountOut: BN;
        outputMint: PublicKey;
        poolId: string;
        slippage: number;
    }): Promise<Transaction>;
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
    sellComponent({ user, inputMint, basketId, amountIn, minimumAmountOut, ammId, createNativeMintATA, unwrapSol, }: {
        user: PublicKey;
        inputMint: PublicKey;
        basketId: BN;
        amountIn: number;
        minimumAmountOut: number;
        ammId: string;
        createNativeMintATA?: boolean;
        unwrapSol?: boolean;
    }): Promise<Transaction>;
    /**
     * Sell a component CPMM.
     * @param user - The user also payer.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    sellComponentCpmm({ user, basketId, inputMint, amountIn, minimumAmountOut, poolId, createNativeMintATA, unwrapSol, }: {
        user: PublicKey;
        basketId: BN;
        inputMint: PublicKey;
        amountIn: number;
        minimumAmountOut: number;
        poolId: string;
        createNativeMintATA?: boolean;
        unwrapSol?: boolean;
    }): Promise<Transaction>;
    /**
     * Sell a component CLMM.
     * @param user - The user also payer.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    sellComponentClmm({ user, basketId, amountIn, inputMint, poolId, slippage, createNativeMintATA, unwrapSol, }: {
        user: PublicKey;
        basketId: BN;
        amountIn: BN;
        inputMint: PublicKey;
        poolId: string;
        slippage: number;
        createNativeMintATA?: boolean;
        unwrapSol?: boolean;
    }): Promise<Transaction>;
    /**
     * Deposits WSOL into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of WSOL to deposit.
     * @returns A promise that resolves to a transaction.
     */
    withdrawWsol({ user, basketId, amount, userWsolAccount, }: {
        user: PublicKey;
        basketId: BN;
        amount: string;
        userWsolAccount: PublicKey;
    }): Promise<Transaction>;
    /**
     * Mints a basket token.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount.
     * @returns A promise that resolves to a transaction.
     */
    mintBasketToken({ user, basketId, amount, }: {
        user: PublicKey;
        basketId: BN;
        amount: string;
    }): Promise<Transaction>;
    /**
     * Redeems a basket token.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount.
     * @returns A promise that resolves to a transaction.
     */
    redeemBasketToken({ user, basketId, amount, }: {
        user: PublicKey;
        basketId: BN;
        amount: number;
    }): Promise<Transaction>;
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
    executeRebalancing({ rebalancer, isSwapBaseOut, amount, otherAmountThreshold, ammId, basketId, inputMint, outputMint, createTokenAccount, }: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        amount: string;
        otherAmountThreshold: string;
        ammId: string;
        basketId: BN;
        inputMint: PublicKey;
        outputMint: PublicKey;
        createTokenAccount?: boolean;
    }): Promise<Transaction | null>;
    executeRebalancingCpmm({ rebalancer, isSwapBaseOut, amount, otherAmountThreshold, poolId, basketId, inputMint, outputMint, createTokenAccount, }: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        amount: string;
        otherAmountThreshold: string;
        poolId: string;
        basketId: BN;
        inputMint: PublicKey;
        outputMint: PublicKey;
        createTokenAccount?: boolean;
    }): Promise<Transaction | null>;
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
    executeRebalancingClmm({ rebalancer, isSwapBaseOut, basketId, amount, otherAmountThreshold, slippage, poolId, inputMint, outputMint, createTokenAccount, }: {
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
    }): Promise<Transaction>;
    addRaydiumAmmToAddressLookupTable({ connection, signer, ammId, lookupTable, }: {
        connection: Connection;
        signer: Keypair;
        ammId: string;
        lookupTable?: PublicKey;
    }): Promise<PublicKey>;
    addRaydiumCpmmToAddressLookupTable({ connection, signer, poolId, lookupTable, }: {
        connection: Connection;
        signer: Keypair;
        poolId: string;
        lookupTable?: PublicKey;
    }): Promise<PublicKey>;
    addRaydiumClmmToAddressLookupTable({ connection, signer, poolId, lookupTable, }: {
        connection: Connection;
        signer: Keypair;
        poolId: string;
        lookupTable?: PublicKey;
    }): Promise<PublicKey>;
    generateLookupTableAccount(): Promise<AddressLookupTableAccount[]>;
    /**
     * Creates a bundle of transactions for buying components and minting basket tokens
     * @param params Bundle creation parameters
     * @returns Array of serialized transactions
     */
    createBuyAndMintBundle({ user, basketId, slippage, inputAmount, mintAmount, buySwapData, swapsPerBundle, tokenInfo, }: {
        user: PublicKey;
        basketId: BN;
        slippage: number;
        inputAmount: string;
        mintAmount: string;
        buySwapData: BuySwapData[];
        swapsPerBundle: number;
        tokenInfo: TokenInfo[];
    }): Promise<string[]>;
    /**
     * Creates a bundle of transactions for redeeming basket tokens and selling components
     * @param params Bundle creation parameters
     * @returns Array of serialized transactions
     */
    createRedeemAndSellBundle({ user, basketId, slippage, redeemAmount, swapsPerBundle, tokenInfo, }: {
        user: PublicKey;
        basketId: BN;
        slippage: number;
        redeemAmount: number;
        swapsPerBundle: number;
        tokenInfo: TokenInfo[];
    }): Promise<string[]>;
    createRebalanceBundle({ basketId, rebalancer, slippage, swapsPerBundle, rebalanceInfo, withStartRebalance, withStopRebalance, }: {
        rebalancer: PublicKey;
        basketId: BN;
        slippage: number;
        swapsPerBundle: number;
        rebalanceInfo: RebalanceInfo[];
        withStartRebalance?: boolean;
        withStopRebalance?: boolean;
    }): Promise<string[]>;
    calculateOptimalInputAmounts({ basketId, userInputInLamports, basketPriceInLamports, slippagePct, feePct, bufferPct, }: {
        basketId: string;
        userInputInLamports: string;
        basketPriceInLamports: string;
        slippagePct: number;
        feePct: number;
        bufferPct: number;
    }): Promise<{
        finalInputSolRequiredInLamports: string;
        revisedSwapData: BuySwapData[];
        highestPriceImpactPct: number;
        finalBasketAmountInRawDecimal: string;
    }>;
    /**
     * Adds an event listener for the 'CreateBasket' event.
     * @param handler - The function to handle the event.
     */
    onCreateBasket(handler: (event: CreateBasketEvent) => void): void;
    /**
     * Adds an event listener for the 'DeleteRebalancer' event.
     * @param handler - The function to handle the event.
     */
    onDeleteRebalancer(handler: (event: UpdateRebalancerEvent) => void): void;
    /**
     * Adds an event listener for the 'TransferAdmin' event.
     * @param handler - The function to handle the event.
     */
    onTransferAdmin(handler: (event: TransferAdminEvent) => void): void;
    /**
     * Adds an event listener for the 'TransferBasket' event.
     * @param handler - The function to handle the event.
     */
    onTransferBasket(handler: (event: TransferBasketEvent) => void): void;
    /**
     * Adds an event listener for the 'ExecuteRebalancing' event.
     * @param handler - The function to handle the event.
     */
    onExecuteRebalancing(handler: (event: ExecuteRebalancingEvent) => void): void;
    /**
     * Adds an event listener for the 'StartRebalancing' event.
     * @param handler - The function to handle the event.
     */
    onStartRebalancing(handler: (event: StartRebalancingEvent) => void): void;
    /**
     * Adds an event listener for the 'StopRebalancing' event.
     * @param handler - The function to handle the event.
     */
    onStopRebalancing(handler: (event: StopRebalancingEvent) => void): void;
    /**
     * Adds an event listener for the 'BuyComponent' event.
     * @param handler - The function to handle the event.
     */
    onBuyComponent(handler: (event: BuyComponentEvent) => void): void;
    /**
     * Adds an event listener for the 'SellComponent' event.
     * @param handler - The function to handle the event.
     */
    onSellComponent(handler: (event: SellComponentEvent) => void): void;
    /**
     * Adds an event listener for the 'MintBasketToken' event.
     * @param handler - The function to handle the event.
     */
    onMintBasketToken(handler: (event: MintBasketTokenEvent) => void): void;
    /**
     * Adds an event listener for the 'RedeemBasketToken' event.
     * @param handler - The function to handle the event.
     */
    onRedeemBasketToken(handler: (event: RedeemBasketTokenEvent) => void): void;
}
//# sourceMappingURL=pie-program.d.ts.map