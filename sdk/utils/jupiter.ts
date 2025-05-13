import {
  Connection,
  PublicKey,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import {
  createJupiterApiClient,
  QuoteResponse,
  SwapInstructionsResponse,
} from "@jup-ag/api";
import { getAddressLookupTableAccounts } from "./lookupTable";
import { BN } from "@coral-xyz/anchor";

export async function createJupiterSwapIx({
  connection,
  inputMint,
  outputMint,
  amount,
  fromAccount,
  swapMode,
  maxAccounts,
  dynamicSlippage,
  slippageBps,
}: {
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
}> {
  const jupiterQuoteApi = createJupiterApiClient();

  let quote: QuoteResponse;

  try {
    // Get quote from Jupiter
    quote = await getQuote(
      inputMint, 
      outputMint, 
      amount, 
      swapMode, 
      maxAccounts, 
      dynamicSlippage, 
      slippageBps,
    );
  } catch (error) {
    console.error("Jupiter Quote API Error:", error);
    throw error;
  }

  // Get swap instructions
  let swapInstructions: SwapInstructionsResponse;
  try {
    swapInstructions = await jupiterQuoteApi.swapInstructionsPost({
      swapRequest: {
        userPublicKey: fromAccount.toBase58(),
        quoteResponse: quote,
      },
    });
  } catch (error) {
    console.error("Jupiter Swap Instructions API Error:", error);
    throw error;
  }

  const addressLookupTableAccounts = await getAddressLookupTableAccounts(
    connection,
    swapInstructions.addressLookupTableAddresses.map(
      (address: string) => new PublicKey(address)
    )
  );

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
export async function getPrice(inputMint: PublicKey, outputMint: PublicKey): Promise<BN> {
  const quote = await getQuote(inputMint, outputMint, 1, "ExactIn");
  const price = new BN(quote.outAmount);
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
async function getQuote(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number,
  swapMode: "ExactIn" | "ExactOut",
  maxAccounts?: number,
  dynamicSlippage?: boolean,
  slippageBps?: number): Promise<QuoteResponse> {
    const jupiterQuoteApi = createJupiterApiClient();
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
