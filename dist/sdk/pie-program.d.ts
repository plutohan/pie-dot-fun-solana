import { BN, Idl, IdlAccounts, IdlEvents, IdlTypes, Program } from "@coral-xyz/anchor";
import { AddressLookupTableAccount, Cluster, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Pie } from "../target/types/pie";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { RebalanceInfo, TokenInfo } from "./types";
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
    sharedLookupTable: string;
    private idl;
    raydium: Raydium;
    constructor(connection: Connection, cluster: Cluster, programId?: string, sharedLookupTable?: string);
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
    getTokenBalance({ mint, owner, }: {
        mint: PublicKey;
        owner: PublicKey;
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
    initialize({ admin }: {
        admin: PublicKey;
    }): Promise<Transaction>;
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
     * @param raydium - The Raydium instance.
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
    sellComponentCpmm({ user, basketId, inputMint, amountIn, minimumAmountOut, poolId, unwrappedSol, }: {
        user: PublicKey;
        basketId: BN;
        inputMint: PublicKey;
        amountIn: number;
        minimumAmountOut: number;
        poolId: string;
        unwrappedSol: boolean;
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
    sellComponentClmm({ user, basketId, amountIn, inputMint, poolId, unwrappedSol, }: {
        user: PublicKey;
        basketId: BN;
        amountIn: BN;
        inputMint: PublicKey;
        poolId: string;
        unwrappedSol: boolean;
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
        amount: number;
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
     * @param isSwapBaseOut - Whether to buy or sell.
     * @param amountIn - The amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @param basketId - The basket ID.
     * @param tokenMint - The token mint.
     * @param raydium - The Raydium instance.
     * @returns A promise that resolves to a transaction or null.
     */
    executeRebalancing({ rebalancer, isSwapBaseOut, amountIn, amountOut, ammId, basketId, tokenMint, createTokenAccount, }: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        amountIn: string;
        amountOut: string;
        ammId: string;
        basketId: BN;
        tokenMint: PublicKey;
        createTokenAccount?: boolean;
    }): Promise<Transaction | null>;
    executeRebalancingCpmm({ rebalancer, isSwapBaseOut, amountIn, amountOut, poolId, basketId, tokenMint, }: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        amountIn: string;
        amountOut: string;
        poolId: string;
        basketId: BN;
        tokenMint: PublicKey;
    }): Promise<Transaction | null>;
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
    createBuyAndMintBundle({ user, basketId, slippage, mintAmount, swapsPerBundle, tokenInfo, feePercentageInBasisPoints, }: {
        user: PublicKey;
        basketId: BN;
        slippage: number;
        mintAmount: number;
        swapsPerBundle: number;
        tokenInfo: TokenInfo[];
        feePercentageInBasisPoints: number;
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