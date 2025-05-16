import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import {
  createJupiterApiClient,
  QuoteResponse,
  SwapInstructionsResponse,
} from "@jup-ag/api";
import { getAddressLookupTableAccounts } from "./lookupTable";
import { BN } from "@coral-xyz/anchor";
import { NATIVE_MINT } from "@solana/spl-token";

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
    quote = await jupiterQuoteApi.quoteGet({
      amount,
      inputMint: inputMint.toBase58(),
      outputMint: outputMint.toBase58(),
      swapMode,
      maxAccounts,
      dynamicSlippage,
      slippageBps,
    });
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

export async function getPrice(
  mint: PublicKey,
  amount: number,
  slippageBps: number
): Promise<BN> {
  const jup = createJupiterApiClient();

  const resp = await jup.quoteGet({
    inputMint: mint.toBase58(),
    outputMint: NATIVE_MINT.toBase58(),
    amount: amount,
    swapMode: "ExactIn",
    slippageBps: slippageBps,
  });
  return new BN(resp.outAmount);
}
