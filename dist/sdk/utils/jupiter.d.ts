import { Connection, PublicKey, AddressLookupTableAccount } from "@solana/web3.js";
import { SwapInstructionsResponse } from "@jup-ag/api";
import { BN } from "@coral-xyz/anchor";
export declare function createJupiterSwapIx({ connection, inputMint, outputMint, amount, fromAccount, swapMode, maxAccounts, dynamicSlippage, slippageBps, }: {
    connection: Connection;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    fromAccount: PublicKey;
    swapMode: "ExactIn" | "ExactOut";
    maxAccounts?: number;
    dynamicSlippage?: boolean;
    slippageBps?: number;
}): Promise<{
    swapInstructions: SwapInstructionsResponse;
    addressLookupTableAccounts: AddressLookupTableAccount[];
}>;
/**
 * Fetches the price of a token pair by simulating a swap of 1 unit of the input token.
 *
 * @param {PublicKey} inputMint - The public key of the input token mint.
 * @param {PublicKey} outputMint - The public key of the output token mint.
 * @returns {Promise<BN>} - The price of the input token in terms of the output token, as a BigNumber.
 */
export declare function getPrice(inputMint: PublicKey, outputMint: PublicKey): Promise<BN>;
//# sourceMappingURL=jupiter.d.ts.map