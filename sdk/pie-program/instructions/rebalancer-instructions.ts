import { BN } from "@coral-xyz/anchor";
import {
  Transaction,
  PublicKey,
  Connection,
  TransactionInstruction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import { getTokenAccountWithTokenProgram } from "../../utils/helper";
import { createJupiterSwapIx } from "../../utils/jupiter";
import { JUPITER_PROGRAM_ID } from "../../constants";
import { SwapInstructionsResponse } from "@jup-ag/api";

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
      console.log(simulation.value.err, "simulation.value.err");
      throw new Error("simulation failed");
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

    const tx = new VersionedTransaction(message);

    return tx;
  }
}
