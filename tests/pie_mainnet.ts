import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
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
  BasketState,
  RebalanceType,
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
  const basketCreationFee = 0.01 * LAMPORTS_PER_SOL;

  const sampleTokenMints = [
    {
      name: "AI16Z",
      mint: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
    },
    {
      name: "PENGU",
      mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    },
  ];

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

  // Program is already initialized
  it("Setup and Initialized if needed", async () => {
    let programState = await pieProgram.state.getProgramState();

    console.log(JSON.stringify(programState, null, 2));

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
        platformFeeWallet,
        platformFeePercentage: new BN(50),
        basketCreationFee: new BN(basketCreationFee),
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

    if (programState.basketCreationFee.lt(new BN(basketCreationFee))) {
      console.log("Start migration...");

      console.log("updating basket creation fee...");
      const updateFeeTx = await pieProgram.admin.updateFee({
        admin: admin.publicKey,
        newBasketCreationFee: basketCreationFee,
        newPlatformFeeBp: 50,
      });

      const updateFeeTxResult = await sendAndConfirmTransaction(
        connection,
        updateFeeTx,
        [admin]
      );

      console.log(
        `Basket creation fee updated at tx: ${getExplorerUrl(
          updateFeeTxResult,
          "mainnet"
        )}`
      );

      console.log("Migrating Baskets to V2...");
      for (let i = 0; i < programState.basketCounter.toNumber(); i++) {
        const basketId = new BN(i);

        const basketConfigBefore = await pieProgram.state.getBasketConfig({
          basketId,
        });

        if (!basketConfigBefore || basketConfigBefore.version != 2) {
          console.log(`Migrating basket ${basketId.toString()}...`);

          console.log(
            `Basket ${basketId.toString()} before migration: ${JSON.stringify(
              basketConfigBefore,
              null,
              2
            )}`
          );

          const migrateTx = await pieProgram.admin.migrateBasket({
            admin: admin.publicKey,
            basketId,
          });

          const migrateTxResult = await sendAndConfirmTransaction(
            connection,
            migrateTx,
            [admin]
          );

          console.log(
            `Basket ${basketId.toString()} migrated at tx: ${getExplorerUrl(
              migrateTxResult,
              "mainnet"
            )}`
          );

          const basketConfigAfter = await pieProgram.state.getBasketConfig({
            basketId,
          });

          console.log(
            `Basket ${basketId.toString()} after migration: ${JSON.stringify(
              basketConfigAfter,
              null,
              2
            )}`
          );
        } else {
          console.log(`Basket ${basketId.toString()} already migrated`);
        }
      }

      console.log("Migrating basket config completed");
    }
  });

  it("Create Basket", async () => {
    const components: BasketComponent[] = sampleTokenMints.map((token) => ({
      mint: new PublicKey(token.mint),
      quantityInSysDecimal: new BN(1 * 10 ** 6),
    }));

    const createBasketArgs: CreateBasketArgs = {
      name: "Test Basket",
      symbol: "TEST",
      uri: "https://cdn.internal-pie.fun/basket/4zoamul/metadata",
      components: components,
      rebalancer: rebalancer.publicKey,
      rebalanceType: { dynamic: {} },
      creatorFeeBp: new BN(100),
    };

    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter;

    console.log("creating basket...");

    const createBasketTx = await pieProgram.creator.createBasket({
      creator: admin.publicKey,
      args: createBasketArgs,
      basketId,
    });

    const createBasketTxResult = await sendAndConfirmTransaction(
      connection,
      createBasketTx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Basket created at tx: ${getExplorerUrl(createBasketTxResult, "mainnet")}`
    );

    const basket = await pieProgram.state.getBasketConfig({ basketId });
    assert.equal(basket.components.length, createBasketArgs.components.length);
    assert.equal(basket.creator.toBase58(), admin.publicKey.toBase58());
    assert.equal(basket.id.toString(), basketId.toString());
    assert.equal(basket.rebalancer.toString(), rebalancer.publicKey.toString());

    const table = new Table({
      columns: [
        { name: "mint", alignment: "left", color: "cyan" },
        { name: "quantity", alignment: "right", color: "green" },
      ],
    });

    for (let i = 0; i < basket.components.length; i++) {
      let component = basket.components[i];
      table.addRow({
        mint: component.mint.toBase58(),
        quantity: component.quantityInSysDecimal.toString(),
      });
    }
    table.printTable();
  });

  it("Buy components and mint basket token", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfig = await pieProgram.state.getBasketConfig({
      basketId,
    });

    const depositAmount = 0.001 * LAMPORTS_PER_SOL;

    console.log("depositing wsol : ", depositAmount);

    const depositWsolTx = await pieProgram.user.depositWsol({
      user: admin.publicKey,
      basketId,
      amount: depositAmount,
    });

    const depositWsolTxResult = await sendAndConfirmTransaction(
      connection,
      depositWsolTx,
      [admin]
    );

    console.log(
      `Wsol deposited at tx: ${getExplorerUrl(depositWsolTxResult, "mainnet")}`
    );

    const buyComponentJupiterTxs: Transaction[] = [];
    const combinedAddressLookupTableAccounts: AddressLookupTableAccount[] = [];

    for (const component of basketConfig.components) {
      console.log("fetching quote for ", component.mint.toBase58());
      const { buyComponentJupiterTx, addressLookupTableAccounts } =
        await pieProgram.user.buyComponentJupiter({
          user: admin.publicKey,
          basketId,
          outputMint: component.mint,
          amount: depositAmount / basketConfig.components.length,
          swapMode: "ExactIn",
          maxAccounts: 20,
        });

      buyComponentJupiterTxs.push(buyComponentJupiterTx);
      combinedAddressLookupTableAccounts.push(...addressLookupTableAccounts);
    }

    const mintBasketTx = await pieProgram.user.mintBasketToken({
      user: admin.publicKey,
      basketId,
    });

    console.log("simulating...");
    const recentBlockhash = (await connection.getLatestBlockhash("confirmed"))
      .blockhash;

    const simulateMessage = new TransactionMessage({
      recentBlockhash,
      payerKey: admin.publicKey,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 100_0000,
        }),
        ...buyComponentJupiterTxs.flatMap((tx) => tx.instructions),
        ...mintBasketTx.instructions,
      ],
    }).compileToV0Message(combinedAddressLookupTableAccounts);

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

    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: simulation.value.unitsConsumed + 100_000,
    });

    const message = new TransactionMessage({
      payerKey: admin.publicKey,
      recentBlockhash,
      instructions: [
        cuIx,
        ...buyComponentJupiterTxs.flatMap((tx) => tx.instructions),
        ...mintBasketTx.instructions,
      ],
    }).compileToV0Message(combinedAddressLookupTableAccounts);

    const tx = new VersionedTransaction(message);
    tx.sign([admin]);

    const signature = await connection.sendTransaction(tx, {
      skipPreflight: true,
    });

    // Wait for transaction confirmation before proceeding to the next component
    await connection.confirmTransaction(signature, "confirmed");

    console.log(
      `Bought components and minted basket token at tx: ${getExplorerUrl(
        signature,
        "mainnet"
      )}`
    );

    const userBalance = await pieProgram.state.getUserBalance({
      user: admin.publicKey,
    });

    const userFund = await pieProgram.state.getUserFund({
      user: admin.publicKey,
      basketId,
    });

    console.log(JSON.stringify({ userBalance, userFund }));
  });

  it("Rebalance basket using executeRebalancingJupiterIx", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));

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
      inputMint: new PublicKey("2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv"),
      outputMint: new PublicKey("HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"),
      amount: 1000000,
      swapMode: "ExactIn",
      rebalancer: rebalancer.publicKey,
      maxAccounts: 45, // have to limit the number of accounts
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

    if (simulation.value.err) {
      console.log(simulation.value.err, "simulation.value.err");
      throw new Error("simulation failed");
    }

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

  it("Rebalance basket using executeRebalancingJupiterTx", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfig = await pieProgram.state.getBasketConfig({
      basketId,
    });

    console.log(`basket ${basketId.toString()} data before:`);
    let basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();

    if (!("rebalancing" in basketConfig.state)) {
      console.log("starting rebalancing...");
      const startRebalanceTx = await pieProgram.rebalancer.startRebalancing({
        rebalancer: rebalancer.publicKey,
        basketId,
      });

      const startRebalanceTxResult = await sendAndConfirmTransaction(
        connection,
        startRebalanceTx,
        [rebalancer]
      );

      console.log(
        `Start rebalancing at tx: ${getExplorerUrl(
          startRebalanceTxResult,
          "mainnet"
        )}`
      );
    }

    const executeRebalancingJupiterTx =
      await pieProgram.rebalancer.executeRebalancingJupiterTx({
        connection,
        basketId,
        inputMint: new PublicKey(
          "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv"
        ),
        outputMint: new PublicKey(
          "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
        ),
        amount: 1000000,
        swapMode: "ExactIn",
        rebalancer: rebalancer.publicKey,
        maxAccounts: 45, // have to limit the number of accounts
        slippageBps: 50,
      });

    executeRebalancingJupiterTx.sign([rebalancer]);

    const executeRebalancingJupiterTxResult = await connection.sendTransaction(
      executeRebalancingJupiterTx,
      { skipPreflight: true }
    );

    await connection.confirmTransaction(
      executeRebalancingJupiterTxResult,
      "confirmed"
    );

    console.log(
      `Execute rebalancing at tx: ${getExplorerUrl(
        executeRebalancingJupiterTxResult,
        "mainnet"
      )}`
    );

    const stopRebalanceTx = await pieProgram.rebalancer.stopRebalancing({
      rebalancer: rebalancer.publicKey,
      basketId,
    });

    const stopRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      stopRebalanceTx,
      [rebalancer]
    );

    console.log(
      `Stop rebalancing at tx: ${getExplorerUrl(
        stopRebalanceTxResult,
        "mainnet"
      )}`
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
  //       `warning: highest price impact (${highestPriceImpactPct}) is greater than slippage (${slippage})`  //     );
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
