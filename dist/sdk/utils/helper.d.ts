import { Connection, Commitment, PublicKey, Signer, Transaction, TransactionInstruction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BasketComponent, PieProgram } from "../pie-program";
import { Table } from "console-table-printer";
import { BuySwapData, TokenInfo, TokenBalance } from "../pie-program/types";
export declare function createUserWithLamports(connection: Connection, lamports: number): Promise<Signer>;
export declare function createNewMint(connection: Connection, creator: Signer, decimals: number): Promise<PublicKey>;
export declare function mintTokenTo(connection: Connection, tokenMint: PublicKey, mintAuthority: Signer, payer: Signer, to: PublicKey, amount: number): Promise<PublicKey>;
export declare function sendTokenTo(connection: Connection, tokenMint: PublicKey, owner: Signer, from: PublicKey, to: PublicKey, amount: number): Promise<String>;
export declare function sleep(ms: any): Promise<void>;
export declare function createBasketComponents(connection: Connection, creator: Signer, ratios: Array<number>): Promise<BasketComponent[]>;
export declare function getOrCreateTokenAccountIx(connection: Connection, mint: PublicKey, payer: PublicKey, owner: PublicKey): Promise<{
    tokenAccount: PublicKey;
    ixs: TransactionInstruction[];
}>;
export declare function wrapSOLIx(recipient: PublicKey, amount: number): TransactionInstruction[];
export declare function showBasketConfigTable(connection: Connection, pieProgram: PieProgram, basketId: BN): Promise<Table>;
export declare function showUserFundTable(pieProgram: PieProgram, userPubkey: PublicKey, basketId: BN): Promise<Table>;
export declare function showBasketVaultsTable(basketVaults: {
    mint: PublicKey;
    balance: number;
}[]): Promise<Table>;
export declare function getOrCreateTokenAccountTx(connection: Connection, mint: PublicKey, payer: PublicKey, owner: PublicKey): Promise<{
    tokenAccount: PublicKey;
    tx: Transaction | null;
    tokenProgram: PublicKey;
}>;
export declare function getTokenAccount(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<PublicKey>;
export declare function getTokenAccountWithTokenProgram(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<{
    tokenAccount: PublicKey;
    tokenProgram: PublicKey;
}>;
export declare function isToken2022Mint(connection: Connection, mint: PublicKey): Promise<boolean>;
export declare function unwrapSolIx(acc: PublicKey, destination: PublicKey, authority: PublicKey): TransactionInstruction;
export declare function getOrCreateNativeMintATA(connection: Connection, payer: PublicKey, owner: PublicKey): Promise<{
    tokenAccount: PublicKey;
    tx: Transaction;
}>;
export declare function getExplorerUrl(txid: string, endpoint: string): string;
export interface GetSwapDataInput {
    isSwapBaseOut: boolean;
    inputMint: string;
    outputMint: string;
    amount: string;
    slippagePct: number;
}
export interface SwapCompute {
    id: string;
    success: boolean;
    version: "V0" | "V1";
    openTime?: undefined;
    msg?: undefined;
    data?: {
        swapType: "BaseIn" | "BaseOut";
        inputMint: string;
        inputAmount: string;
        outputMint: string;
        outputAmount: string;
        otherAmountThreshold: string;
        slippageBps: number;
        priceImpactPct: number;
        routePlan: {
            poolId: string;
            inputMint: string;
            outputMint: string;
            feeMint: string;
            feeRate: number;
            feeAmount: string;
        }[];
    };
}
export declare function getSwapData({ isSwapBaseOut, inputMint, outputMint, amount, slippagePct, }: GetSwapDataInput): Promise<SwapCompute>;
export declare function checkSwapDataError(swapData: SwapCompute[]): void;
export declare function checkAndReplaceSwapDataError(swapData: SwapCompute[], swapBackupData: GetSwapDataInput[]): void;
export declare function isValidTransaction(tx: Transaction): boolean;
export declare function caculateTotalAmountWithFee(amount: number, feePercentageInBasisPoints: number): number;
export declare function getTokenFromTokenInfo(tokenInfo: TokenInfo[], mint: string): TokenInfo;
export declare function simulateTransaction(connection: Connection, txInBase64: string): Promise<import("@solana/web3.js").RpcResponseAndContext<import("@solana/web3.js").SimulatedTransactionResponse>>;
export declare const restoreRawDecimal: (val: BN) => BN;
export declare const restoreRawDecimalRoundUp: (val: BN) => BN;
export declare const getTokenListFromSolanaClient: () => Promise<TokenInfo[]>;
export declare const processBuySwapData: (preVaultBalance: number, swapData: BuySwapData, feePct: number) => {
    isEnough: boolean;
    postVaultBalance?: number;
    insufficientAmount?: number;
};
export declare function findDepositAndRemoveInPlace(arr: BuySwapData[]): BuySwapData | null;
export declare function getTokenBalance({ connection, mint, owner, commitment, }: {
    connection: Connection;
    mint: PublicKey;
    owner: PublicKey;
    commitment?: Commitment;
}): Promise<number>;
/**
 * Fetches all token accounts with balances for a given owner
 */
export declare function getAllTokenAccountWithBalance({ connection, owner, }: {
    connection: Connection;
    owner: PublicKey;
}): Promise<TokenBalance[]>;
export declare function getBasketIdFromBasketMint(mint: PublicKey, pieProgram: PieProgram): Promise<BN>;
export declare function getTokenPriceAndDecimals({ mint, connection, currency, pieDotFunApiUrl, }: {
    mint: PublicKey;
    connection: Connection;
    currency?: "CURRENCY_SOL" | "CURRENCY_USDC";
    pieDotFunApiUrl: string;
}): Promise<{
    price: {
        currency: string;
        formattedAmount: string;
        rawAmount: string;
    };
    decimals: number;
}>;
//# sourceMappingURL=helper.d.ts.map