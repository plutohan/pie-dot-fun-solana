import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection, AddressLookupTableAccount } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import { Jito } from "../../jito";
/**
 * Class for handling buy-related instructions
 */
export declare class UserInstructions extends ProgramStateManager {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly pieDotFunApiUrl: string;
    readonly jito: Jito;
    constructor(connection: Connection, programId: PublicKey, pieDotFunApiUrl: string, jito: Jito);
    /**
     * Initializes the user balance.
     * @param user - The user account.
     * @returns A promise that resolves to a transaction.
     */
    initializeUserBalance({ user, }: {
        user: PublicKey;
    }): Promise<Transaction>;
    /**
     * Deposits WSOL into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of WSOL to deposit.
     * @returns A promise that resolves to a transaction.
     */
    depositWsol({ user, basketId, amount, }: {
        user: PublicKey;
        basketId: BN;
        amount: number;
    }): Promise<Transaction>;
    /**
     * Buys a component using Jupiter.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of component to buy.
     * @returns A promise that resolves to a transaction.
     */
    buyComponentJupiter({ user, basketId, outputMint, amount, swapMode, maxAccounts, slippageBps, dynamicSlippage, }: {
        user: PublicKey;
        basketId: BN;
        outputMint: PublicKey;
        amount: number;
        swapMode: "ExactIn" | "ExactOut";
        maxAccounts?: number;
        slippageBps?: number;
        dynamicSlippage?: boolean;
    }): Promise<{
        buyComponentJupiterTx: Transaction;
        addressLookupTableAccounts: AddressLookupTableAccount[];
        txLength: number;
    }>;
    /**
     * Mints a basket token.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    mintBasketToken({ user, basketId, }: {
        user: PublicKey;
        basketId: BN;
    }): Promise<Transaction>;
    /**
     * Buys a basket
     *
     *
     */
    buyBasketJitoTxs({ user, basketId, amountInLamports, jitoTipAmountInLamports, slippageBps, dynamicSlippage, maxAccounts, }: {
        user: PublicKey;
        basketId: BN;
        amountInLamports: number;
        jitoTipAmountInLamports?: BN;
        slippageBps?: number;
        dynamicSlippage?: boolean;
        maxAccounts?: number;
    }): Promise<string[]>;
    /**
     * Withdraws a WSOL from the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    withdrawWsol({ user, basketId, }: {
        user: PublicKey;
        basketId: BN;
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
     * Deposits a component into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of component to deposit.
     * @param mint - The mint of the component.
     * @returns A promise that resolves to a transaction.
     */
    depositComponent({ user, basketId, amount, mint, }: {
        user: PublicKey;
        basketId: BN;
        amount: string;
        mint: PublicKey;
    }): Promise<Transaction>;
    /**
     * Withdraws a component from the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of component to withdraw.
     * @param mint - The mint of the component.
     * @returns A promise that resolves to a transaction.
     */
    withdrawComponent({ user, basketId, amount, mint, }: {
        user: PublicKey;
        basketId: BN;
        amount: string;
        mint: PublicKey;
    }): Promise<Transaction>;
}
//# sourceMappingURL=user-instructions.d.ts.map