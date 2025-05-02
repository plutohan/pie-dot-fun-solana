import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import qaAdmin from "../.config/solana/qa-admin.json";
import qaRebalancer from "../.config/solana/qa-rebalancer.json";
import { assert } from "chai";
import {
  BasketComponent,
  CreateBasketArgs,
  PieProgram,
} from "../sdk/pie-program";
import { tokens } from "./fixtures/mainnet/token_test";
import { rebalanceInfo } from "./fixtures/mainnet/token_rebalance_test";
import { Table } from "console-table-printer";
import { getMint, NATIVE_MINT } from "@solana/spl-token";
import {
  getBaksetIdFromBasketMint,
  getExplorerUrl,
  getOrCreateNativeMintATA,
  getTokenBalance,
  getTokenListFromSolanaClient,
  isValidTransaction,
  showBasketConfigTable,
  simulateTransaction,
} from "../sdk/utils/helper";
import { QUICKNODE_RPC_URL } from "./constants";

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(qaAdmin));
  const rebalancer = Keypair.fromSecretKey(new Uint8Array(qaRebalancer));
  const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");

  const pieProgram = new PieProgram({
    connection,
    cluster: "mainnet-beta",
    jitoRpcUrl: QUICKNODE_RPC_URL,
  });

  const priorityFee = 100000;
  const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee,
  });
  const swapsPerBundle = 2;
  const slippage = 50;

  const startPollingJitoBundle = async (bundleId: string) => {
    await new Promise<void>((resolve) => {
      let interval = setInterval(async () => {
        const statuses = await pieProgram.jito.getInflightBundleStatuses([
          bundleId,
        ]);
        console.log(JSON.stringify({ statuses }));
        if (statuses?.value[0]?.status === "Landed") {
          console.log("bundle confirmed");
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  };

  beforeEach(async () => {
    await pieProgram.init();
  });

  it("Setup and Initialized if needed", async () => {
    let programState = await pieProgram.state.getProgramState();

    const platformFeeWallet = new PublicKey(
      "DU2tpPP3yHY811yLrDATdyCjMu51bp3jz1fpEbpf5Crq"
    );
    const newAdmin = new PublicKey(
      "6tfUrp38Q5jRysrgLhNadxmrmXVKt7Rz5dC593x1wu1Q"
    );
    const newCreator = new PublicKey(
      "Gh7DKrjeUcU4Nq2doKcLZKSkiPEKgF4gx3PivqF6ufNH"
    );

    if (!programState) {
      console.log("initializing program...");
      //create platform fee token account if needed
      const initializeTx = await pieProgram.admin.initialize({
        initializer: admin.publicKey,
        admin: newAdmin,
        creator: newCreator,
        platformFeeWallet,
        platformFeePercentage: new BN(100),
      });

      initializeTx.add(priorityFeeInstruction);

      const { tx: platformFeeTokenAccountTx } = await getOrCreateNativeMintATA(
        connection,
        admin.publicKey,
        programState.platformFeeWallet
      );

      const { tx: creatorFeeTokenAccountTx } = await getOrCreateNativeMintATA(
        connection,
        admin.publicKey,
        newCreator
      );

      if (isValidTransaction(platformFeeTokenAccountTx)) {
        initializeTx.add(platformFeeTokenAccountTx);
      }

      if (isValidTransaction(creatorFeeTokenAccountTx)) {
        initializeTx.add(creatorFeeTokenAccountTx);
      }

      const initializeTxResult = await sendAndConfirmTransaction(
        connection,
        initializeTx,
        [admin],
        {
          skipPreflight: false,
          commitment: "confirmed",
        }
      );
      console.log(
        `Program initialized at tx: https://solscan.io/tx/${initializeTxResult}`
      );
    }
  });

  // it("Create Basket", async () => {
  //   const components: BasketComponent[] = tokens.map((token) => ({
  //     mint: new PublicKey(token.mint),
  //     quantityInSysDecimal: new BN(1 * 10 ** 6),
  //   }));

  //   // ADD WSOL
  //   components.push({
  //     mint: NATIVE_MINT,
  //     quantityInSysDecimal: new BN(1 * 10 ** 6),
  //   });

  //   const createBasketArgs: CreateBasketArgs = {
  //     name: "Basket 3",
  //     symbol: "B-3",
  //     uri: "https://cdn.internal-pie.fun/basket/4zoamul/metadata",
  //     components: components,
  //     rebalancer: admin.publicKey,
  //   };

  //   const programState = await pieProgram.state.getProgramState();
  //   const basketId = programState.basketCounter;

  //   console.log("creating basket...");
  //   const createBasketTx = await pieProgram.creator.createBasket({
  //     creator: admin.publicKey,
  //     args: createBasketArgs,
  //     basketId,
  //   });

  //   createBasketTx.add(priorityFeeInstruction);

  //   const createBasketTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     createBasketTx,
  //     [admin],
  //     { skipPreflight: true, commitment: "confirmed" }
  //   );

  //   console.log(
  //     `Basket created at tx: ${getExplorerUrl(createBasketTxResult, "mainnet")}`
  //   );

  //   console.log("adding basket to shared lookup table...");
  //   await pieProgram.addBaksetToSharedLookupTable({
  //     basketId,
  //     admin,
  //   });

  //   const { tx } = await pieProgram.createBasketVaultAccounts({
  //     creator: admin.publicKey,
  //     args: createBasketArgs,
  //     basketId,
  //   });

  //   if (isValidTransaction(tx)) {
  //     console.log("creating vault accounts..");
  //     tx.add(priorityFeeInstruction);
  //     const creatingVaultsTxResult = await sendAndConfirmTransaction(
  //       connection,
  //       tx,
  //       [admin],
  //       {
  //         skipPreflight: true,
  //         commitment: "confirmed",
  //       }
  //     );

  //     console.log(
  //       `Vaults created at tx: ${getExplorerUrl(
  //         creatingVaultsTxResult,
  //         "mainnet"
  //       )}`
  //     );
  //   }

  //   const basket = await pieProgram.state.getBasketConfig({ basketId });
  //   assert.equal(basket.components.length, createBasketArgs.components.length);
  //   assert.equal(basket.creator.toBase58(), admin.publicKey.toBase58());
  //   assert.equal(basket.id.toString(), basketId.toString());
  //   assert.equal(basket.rebalancer.toString(), admin.publicKey.toString());

  //   const table = new Table({
  //     columns: [
  //       { name: "mint", alignment: "left", color: "cyan" },
  //       { name: "quantity", alignment: "right", color: "green" },
  //     ],
  //   });

  //   for (let i = 0; i < basket.components.length; i++) {
  //     let component = basket.components[i];
  //     table.addRow({
  //       mint: component.mint.toBase58(),
  //       quantity: component.quantityInSysDecimal.toString(),
  //     });
  //   }
  //   table.printTable();
  // });

  it("Rebalance basket using Jupiter", async () => {
    const basketId = await getBaksetIdFromBasketMint(
      new PublicKey("Awx3hshHvVDDrrcvxfyWEHZq7kC6SEXUrLqNdEGWDoiC"),
      pieProgram
    );

    console.log(`basket ${basketId.toString()} data before:`);
    let basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();

    const startRebalanceTx = await pieProgram.rebalancer.startRebalancing({
      rebalancer: rebalancer.publicKey,
      basketId,
    });

    const {
      executeRebalancingJupiterIx,
      swapInstructions,
      addressLookupTableAccounts,
    } = await pieProgram.rebalancer.executeRebalancingJupiterIx({
      basketId,
      inputMint: new PublicKey("9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump"),
      outputMint: new PublicKey("HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"),
      amount: 100000,
      swapMode: "ExactIn",
      rebalancer: rebalancer.publicKey,
    });

    const stopRebalanceTx = await pieProgram.rebalancer.stopRebalancing({
      rebalancer: rebalancer.publicKey,
      basketId,
    });

    const recentBlockhash = (await connection.getLatestBlockhash("confirmed"))
      .blockhash;

    const simulateMessage = new TransactionMessage({
      recentBlockhash,
      payerKey: rebalancer.publicKey,
      instructions: [
        ...startRebalanceTx.instructions,
        executeRebalancingJupiterIx,
        ...stopRebalanceTx.instructions,
      ],
    }).compileToV0Message(addressLookupTableAccounts);

    const simulateTx = new VersionedTransaction(simulateMessage);

    const simulation = await connection.simulateTransaction(simulateTx, {
      commitment: "confirmed",
      replaceRecentBlockhash: true,
      sigVerify: false,
    });

    console.log(simulation.value.logs, "simulation.value.logs");

    // Build final transaction
    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: simulation.value.unitsConsumed + 100_000,
    });

    const message = new TransactionMessage({
      payerKey: rebalancer.publicKey,
      recentBlockhash,
      instructions: [
        cuIx,
        ...startRebalanceTx.instructions,
        executeRebalancingJupiterIx,
        ...stopRebalanceTx.instructions,
      ],
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(message);
    tx.sign([rebalancer]);

    // Send and confirm transaction
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: true,
    });

    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed"
    );

    console.log(
      `Rebalance basket at tx: ${getExplorerUrl(signature, "mainnet")}`
    );

    console.log(`basket ${basketId.toString()} data after:`);
    basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  // it("Buy components and mint basket token using Jito bundle", async () => {
  //   const basketId = new BN(3);
  //   const basketConfigData = await pieProgram.state.getBasketConfig({
  //     basketId,
  //   });

  //   const userBaksetTokenBalanceBefore = await getTokenBalance(
  //     {
  //       connection,
  //       mint: basketConfigData.mint,
  //       owner: admin.publicKey,
  //     }
  //   );
  //   console.log({ userBaksetTokenBalanceBefore });

  //   const serializedSignedTxs: string[] = [];

  //   const {
  //     finalInputSolRequiredInLamports,
  //     revisedSwapData,
  //     highestPriceImpactPct,
  //     finalBasketAmountInRawDecimal,
  //   } = await pieProgram.calculateOptimalInputAmounts({
  //     basketId: basketId.toString(),
  //     userInputInLamports: "100000000",
  //     basketPriceInLamports: "569408",
  //     slippagePct: slippage,
  //     feePct: 1,
  //     bufferPct: 2,
  //   });

  //   if (highestPriceImpactPct > slippage) {
  //     console.log(
  //       `warning: highest price impact (${highestPriceImpactPct}) is greater than slippage (${slippage})`
  //     );
  //   }

  //   console.log("creating bundle...");
  //   const serializedTxs = await pieProgram.createBuyAndMintBundle({
  //     user: admin.publicKey,
  //     basketId,
  //     slippage,
  //     mintAmount: finalBasketAmountInRawDecimal,
  //     buySwapData: revisedSwapData,
  //     swapsPerBundle,
  //     tokenInfo: await getTokenListFromSolanaClient(),
  //     inputAmount: finalInputSolRequiredInLamports,
  //   });

  //   console.log("signing bundle...");
  //   for (const serializedTx of serializedTxs) {
  //     const tx = pieProgram.eventHandler.signSerializedTransaction(
  //       serializedTx,
  //       admin
  //     );
  //     serializedSignedTxs.push(tx);
  //   }

  //   console.log("start simulating bundle...");
  //   const bundleSimluationResult = await pieProgram.eventHandler.simulateBundle(
  //     {
  //       encodedTransactions: serializedSignedTxs,
  //     }
  //   );

  //   console.log(
  //     `bundle simulation result: ${JSON.stringify(
  //       bundleSimluationResult.value
  //     )}`
  //   );

  //   if (bundleSimluationResult.value.summary !== "succeeded") {
  //     for (const serializedSignedTx of serializedSignedTxs) {
  //       await simulateTransaction(connection, serializedSignedTx);
  //     }
  //     throw new Error("bundle simulation failed");
  //   }

  //   console.log("start sending bundles..!!");
  //   const bundleId = await pieProgram.eventHandler.sendBundle(
  //     serializedSignedTxs
  //   );
  //   await startPollingJitoBundle(bundleId);
  //   console.log(`basket ${basketId.toString()} data:`);
  //   const basketMintTable = await showBasketConfigTable(
  //     connection,
  //     pieProgram,
  //     basketId
  //   );
  //   basketMintTable.printTable();

  //   const userBaksetTokenBalanceAfter = await pieProgram.state.getTokenBalance({
  //     mint: basketConfigData.mint,
  //     owner: admin.publicKey,
  //   });
  //   console.log({ userBaksetTokenBalanceAfter });
  // });

  // it("Redeem basket token and sell components using Jito bundle", async () => {
  //   const basketId = new BN(3);
  //   const basketConfigData = await pieProgram.state.getBasketConfig({
  //     basketId,
  //   });
  //   const serializedSignedTxs: string[] = [];

  //   const userSolBalanceBefore = await connection.getBalance(admin.publicKey);
  //   const userBaksetTokenBalanceBefore = await pieProgram.state.getTokenBalance(
  //     {
  //       mint: basketConfigData.mint,
  //       owner: admin.publicKey,
  //     }
  //   );

  //   console.log({ userSolBalanceBefore, userBaksetTokenBalanceBefore });

  //   const redeemAmount = userBaksetTokenBalanceBefore / 2;

  //   console.log("creating bundle...");
  //   const serializedTxs = await pieProgram.createRedeemAndSellBundle({
  //     user: admin.publicKey,
  //     basketId,
  //     slippage,
  //     redeemAmount,
  //     swapsPerBundle,
  //     tokenInfo: await getTokenListFromSolanaClient(),
  //   });

  //   console.log("signing bundle...");
  //   for (const serializedTx of serializedTxs) {
  //     const tx = pieProgram.eventHandler.signSerializedTransaction(
  //       serializedTx,
  //       admin
  //     );
  //     serializedSignedTxs.push(tx);
  //   }

  //   console.log("start simulating bundle...");
  //   const bundleSimluationResult = await pieProgram.eventHandler.simulateBundle(
  //     {
  //       encodedTransactions: serializedSignedTxs,
  //     }
  //   );
  //   console.log(
  //     `bundle simulation result: ${JSON.stringify(
  //       bundleSimluationResult.value
  //     )}`
  //   );

  //   console.log("start sending bundles..!!");
  //   const bundleId = await pieProgram.eventHandler.sendBundle(
  //     serializedSignedTxs
  //   );

  //   if (bundleSimluationResult.value.summary !== "succeeded") {
  //     for (const serializedSignedTx of serializedSignedTxs) {
  //       await simulateTransaction(connection, serializedSignedTx);
  //     }
  //     throw new Error("bundle simulation failed");
  //   }

  //   await startPollingJitoBundle(bundleId);

  //   console.log(`basket ${basketId.toString()} data:`);
  //   const basketMintTable = await showBasketConfigTable(
  //     connection,
  //     pieProgram,
  //     basketId
  //   );
  //   basketMintTable.printTable();

  //   const userBaksetTokenBalanceAfter = await pieProgram.state.getTokenBalance({
  //     mint: basketConfigData.mint,
  //     owner: admin.publicKey,
  //   });
  //   console.log({ userBaksetTokenBalanceAfter });
  // });
});
