"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJupiterSwapIx = createJupiterSwapIx;
exports.getPrice = getPrice;
const web3_js_1 = require("@solana/web3.js");
const api_1 = require("@jup-ag/api");
const lookupTable_1 = require("./lookupTable");
const anchor_1 = require("@coral-xyz/anchor");
async function createJupiterSwapIx({ connection, inputMint, outputMint, amount, fromAccount, swapMode, maxAccounts, dynamicSlippage, slippageBps, }) {
    const jupiterQuoteApi = (0, api_1.createJupiterApiClient)();
    let quote;
    try {
        // Get quote from Jupiter
        quote = await getQuote(inputMint, outputMint, amount, swapMode, maxAccounts, dynamicSlippage, slippageBps);
    }
    catch (error) {
        console.error("Jupiter Quote API Error:", error);
        throw error;
    }
    // Get swap instructions
    let swapInstructions;
    try {
        swapInstructions = await jupiterQuoteApi.swapInstructionsPost({
            swapRequest: {
                userPublicKey: fromAccount.toBase58(),
                quoteResponse: quote,
            },
        });
    }
    catch (error) {
        console.error("Jupiter Swap Instructions API Error:", error);
        throw error;
    }
    const addressLookupTableAccounts = await (0, lookupTable_1.getAddressLookupTableAccounts)(connection, swapInstructions.addressLookupTableAddresses.map((address) => new web3_js_1.PublicKey(address)));
    return {
        swapInstructions,
        addressLookupTableAccounts,
    };
}
/**
 * Fetches the price of a token pair by simulating a swap of 1 unit of the input token.
 *
 * @param {PublicKey} inputMint - The public key of the input token mint.
 * @param {PublicKey} outputMint - The public key of the output token mint.
 * @returns {Promise<BN>} - The price of the input token in terms of the output token, as a BigNumber.
 */
async function getPrice(inputMint, outputMint) {
    const quote = await getQuote(inputMint, outputMint, 1, "ExactIn");
    const price = new anchor_1.BN(quote.outAmount);
    return price;
}
/**
 * Fetches a quote for swapping a specified amount of one token for another.
 *
 * @param {PublicKey} inputMint - The public key of the input token mint.
 * @param {PublicKey} outputMint - The public key of the output token mint.
 * @param {number} amount - The amount of the input token to swap.
 * @param {"ExactIn" | "ExactOut"} swapMode - The swap mode, either "ExactIn" (fixed input) or "ExactOut" (fixed output).
 * @param {number} [maxAccounts] - Optional. The maximum number of accounts to use for the swap.
 * @param {boolean} [dynamicSlippage] - Optional. Whether to use dynamic slippage.
 * @param {number} [slippageBps] - Optional. The slippage tolerance in basis points.
 * @returns {Promise<QuoteResponse>} - A quote response containing details of the swap.
 */
async function getQuote(inputMint, outputMint, amount, swapMode, maxAccounts, dynamicSlippage, slippageBps) {
    const jupiterQuoteApi = (0, api_1.createJupiterApiClient)();
    const quote = await jupiterQuoteApi.quoteGet({
        amount,
        inputMint: inputMint.toBase58(),
        outputMint: outputMint.toBase58(),
        swapMode,
        maxAccounts,
        dynamicSlippage,
        slippageBps,
    });
    return quote;
}
//# sourceMappingURL=jupiter.js.map