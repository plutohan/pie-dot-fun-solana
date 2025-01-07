import { BN } from "@coral-xyz/anchor";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
  Transaction,
  VersionedMessage,
} from "@solana/web3.js";
import mainnetAdmin from "../.config/solana/id.json";
import { assert } from "chai";
import {
  BasketComponent,
  CreateBasketArgs,
  PieProgram,
} from "../sdk/pie-program";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { tokens } from "./fixtures/mainnet/token_test";
import { rebalanceInfo } from "./fixtures/mainnet/token_rebalance_test";
import { Table } from "console-table-printer";
import { initSdk } from "../sdk/utils/config";
import {
  getAssociatedTokenAddress,
  getMint,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  getExplorerUrl,
  getOrCreateTokenAccountTx,
  isValidTransaction,
  showBasketConfigTable,
  showBasketVaultsTable,
  startPollingJitoBundle,
} from "../sdk/utils/helper";
import {
  getInflightBundleStatuses,
  sendBundle,
  simulateBundle,
  signSerializedTransaction,
} from "../sdk/jito";
import { QUICKNODE_RPC_URL } from "../sdk/constants";
import {
  addAddressesToTable,
  createLookupTable,
} from "../sdk/utils/lookupTable";

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(mainnetAdmin));
  const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");
  const pieProgram = new PieProgram(connection, "mainnet-beta");
  const priorityFee = 100000;
  const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee,
  });
  const swapsPerBundle = 3;
  const slippage = 50;

  beforeEach(async () => {
    await pieProgram.init();
  });

  it("Setup and Initialized if needed ", async () => {
    let programState = await pieProgram.getProgramState();

    if (!programState) {
      console.log("initializing program...");
      const initializeTx = await pieProgram.initialize({
        initializer: admin.publicKey,
        admin: admin.publicKey,
        creator: admin.publicKey,
      });
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

    //fetch again
    programState = await pieProgram.getProgramState();

    const setUpTx = new Transaction();

    if (programState.platformFeePercentage.toNumber() == 0) {
      console.log("adding updating fee tx...");
      // mint redeem fee 1% and platform fee 0.5%
      const updateFeeTx = await pieProgram.updateFee({
        admin: admin.publicKey,
        newCreatorFeePercentage: 1000,
        newPlatformFeePercentage: 500,
      });
      setUpTx.add(updateFeeTx);
    }

    //create platform fee token account if needed
    const { tx: createPlatformFeeTokenAccountTx } =
      await getOrCreateTokenAccountTx(
        connection,
        new PublicKey(NATIVE_MINT),
        admin.publicKey,
        programState.platformFeeWallet
      );

    if (createPlatformFeeTokenAccountTx.instructions.length !== 0) {
      console.log("adding create platform fee token account tx...");
      setUpTx.add(createPlatformFeeTokenAccountTx);
    }

    //update platform fee wallet if needed
    if (
      programState.platformFeeWallet.toBase58() ==
      new PublicKey("11111111111111111111111111111111").toBase58()
    ) {
      console.log("adding update platform fee wallet tx...");
      const updatePlatformFeeWalletTx =
        await pieProgram.updatePlatformFeeWallet({
          admin: admin.publicKey,
          newPlatformFeeWallet: admin.publicKey,
        });
      setUpTx.add(updatePlatformFeeWalletTx);
    }

    if (setUpTx.instructions.length > 0) {
      console.log("sending setup tx...");
      setUpTx.add(priorityFeeInstruction);
      const setUpTxResult = await sendAndConfirmTransaction(
        connection,
        setUpTx,
        [admin],
        { skipPreflight: true, commitment: "confirmed" }
      );
      console.log(`Setup tx: https://solscan.io/tx/${setUpTxResult}`);
    }

    if (!pieProgram.sharedLookupTable) {
      const newLookupTable = await createLookupTable(connection, admin);
      await addAddressesToTable(connection, admin, newLookupTable, [
        pieProgram.program.programId,
        pieProgram.programStatePDA,
        programState.platformFeeWallet,
      ]);

      console.log("shared lookup table created:", newLookupTable.toBase58());
      pieProgram.sharedLookupTable = newLookupTable.toBase58();
    }
  });

  it("Create Basket", async () => {
    const components: BasketComponent[] = tokens.map((token) => ({
      mint: new PublicKey(token.mint),
      quantityInSysDecimal: new BN(1 * 10 ** 6),
    }));

    // ADD WSOL
    components.push({
      mint: NATIVE_MINT,
      quantityInSysDecimal: new BN(1 * 10 ** 6),
    });

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket 3",
      symbol: "B-3",
      uri: "https://pie.xyz/pie",
      components: components,
      rebalancer: admin.publicKey,
    };

    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter;

    console.log("creating basket...");
    const createBasketTx = await pieProgram.createBasket({
      creator: admin.publicKey,
      args: createBasketArgs,
      basketId,
    });

    createBasketTx.add(priorityFeeInstruction);

    const createBasketTxResult = await sendAndConfirmTransaction(
      connection,
      createBasketTx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Basket created at tx: ${getExplorerUrl(createBasketTxResult, "mainnet")}`
    );

    // @TODO uncomment this when needed
    // console.log("creating lookup tables for each component...");
    // const lookupTables = [];
    // for (let i = 0; i < createBasketArgs.components.length; i++) {
    //   console.log(
    //     `creating lookup table for ${i + 1} of ${
    //       createBasketArgs.components.length
    //     }`
    //   );
    //   let lut;
    //   switch (tokens[i].type) {
    //     case "amm":
    //       lut = await pieProgram.addRaydiumAmmToAddressLookupTable({
    //         connection,
    //         signer: admin,
    //         ammId: tokens[i].poolId,
    //       });
    //       break;
    //     case "clmm":
    //       lut = await pieProgram.addRaydiumClmmToAddressLookupTable({
    //         connection,
    //         signer: admin,
    //         poolId: tokens[i].poolId,
    //       });
    //       break;
    //     case "cpmm":
    //       lut = await pieProgram.addRaydiumCpmmToAddressLookupTable({
    //         connection,
    //         signer: admin,
    //         poolId: tokens[i].poolId,
    //       });
    //       break;
    //   }
    //   lookupTables.push(lut.toBase58());
    // }
    // console.log("lookup tables created:", lookupTables);

    console.log("adding basket to shared lookup table...");
    await pieProgram.addBaksetToSharedLookupTable({
      basketId,
      admin,
    });

    const { tx } = await pieProgram.createBasketVaultAccounts({
      creator: admin.publicKey,
      args: createBasketArgs,
      basketId,
    });

    if (isValidTransaction(tx)) {
      console.log("creating vault accounts..");
      tx.add(priorityFeeInstruction);
      const creatingVaultsTxResult = await sendAndConfirmTransaction(
        connection,
        tx,
        [admin],
        {
          skipPreflight: true,
          commitment: "confirmed",
        }
      );

      console.log(
        `Vaults created at tx: https://solscan.io/tx/${getExplorerUrl(
          creatingVaultsTxResult,
          "mainnet"
        )}`
      );
    }

    const basket = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basket.components.length, createBasketArgs.components.length);
    assert.equal(basket.creator.toBase58(), admin.publicKey.toBase58());
    assert.equal(basket.id.toString(), basketId.toString());
    assert.equal(basket.rebalancer.toString(), admin.publicKey.toString());
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

  it("Buy components and mint basket token using Jito bundle", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig({ basketId });

    const userBaksetTokenBalanceBefore = await pieProgram.getTokenBalance({
      mint: basketConfigData.mint,
      owner: admin.publicKey,
    });
    console.log({ userBaksetTokenBalanceBefore });

    const serializedSignedTxs: string[] = [];
    const mintAmount = 1000000;

    console.log("creating bundle...");
    const serializedTxs = await pieProgram.createBuyAndMintBundle({
      user: admin.publicKey,
      basketId,
      slippage,
      mintAmount,
      swapsPerBundle,
      tokenInfo: tokens,
      feePercentageInBasisPoints:
        programState.platformFeePercentage.toNumber() +
        programState.creatorFeePercentage.toNumber(),
    });

    console.log("signing bundle...");
    for (const serializedTx of serializedTxs) {
      const tx = await signSerializedTransaction(serializedTx, admin);
      // @debug
      // await sendAndConfirmRawTransaction(
      //   connection,
      //   Buffer.from(tx, "base64"),
      //   {
      //     skipPreflight: true,
      //     commitment: "confirmed",
      //   }
      // );
      serializedSignedTxs.push(tx);
    }

    console.log("start simulating bundle...");
    const bundleSimluationResult = await simulateBundle({
      encodedTransactions: serializedSignedTxs,
    });

    console.log(
      `bundle simulation result: ${JSON.stringify(
        bundleSimluationResult.value
      )}`
    );

    if (bundleSimluationResult.value.summary !== "succeeded") {
      throw new Error("bundle simulation failed");
    }

    console.log("start sending bundles..!!");
    const bundleId = await sendBundle(serializedSignedTxs);
    await startPollingJitoBundle(bundleId);
    console.log(`basket ${basketId.toString()} data:`);
    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();

    const userBaksetTokenBalanceAfter = await pieProgram.getTokenBalance({
      mint: basketConfigData.mint,
      owner: admin.publicKey,
    });
    console.log({ userBaksetTokenBalanceAfter });
  });

  it("Rebalance basket using Jito bundle", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));

    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basketConfig.isRebalancing, false);

    console.log(`basket ${basketId.toString()} data before:`);
    let basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();

    const serializedSignedTxs: string[] = [];
    console.log("creating bundle...");
    const serializedTxs = await pieProgram.createRebalanceBundle({
      rebalancer: admin.publicKey,
      basketId,
      slippage,
      swapsPerBundle,
      rebalanceInfo,
      withStartRebalance: true,
      withStopRebalance: true,
    });

    console.log("signing bundle...");
    for (const serializedTx of serializedTxs) {
      const tx = await signSerializedTransaction(serializedTx, admin);
      serializedSignedTxs.push(tx);
    }

    console.log("start simulating bundle...");
    const bundleSimluationResult = await simulateBundle({
      encodedTransactions: serializedSignedTxs,
    });

    console.log(
      `bundle simulation result: ${JSON.stringify(
        bundleSimluationResult.value
      )}`
    );

    if (bundleSimluationResult.value.summary !== "succeeded") {
      throw new Error("bundle simulation failed");
    }

    console.log("start sending bundles..!!");
    const bundleId = await sendBundle(serializedSignedTxs);
    await startPollingJitoBundle(bundleId);

    console.log(`basket ${basketId.toString()} data after:`);
    basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it("Redeem basket token and sell components using Jito bundle", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig({ basketId });
    const serializedSignedTxs: string[] = [];

    const userSolBalanceBefore = await connection.getBalance(admin.publicKey);
    const userBaksetTokenBalanceBefore = await pieProgram.getTokenBalance({
      mint: basketConfigData.mint,
      owner: admin.publicKey,
    });

    console.log({ userSolBalanceBefore, userBaksetTokenBalanceBefore });

    const redeemAmount = userBaksetTokenBalanceBefore / 2;

    console.log("creating bundle...");
    const serializedTxs = await pieProgram.createRedeemAndSellBundle({
      user: admin.publicKey,
      basketId,
      slippage,
      redeemAmount,
      swapsPerBundle,
      tokenInfo: tokens,
    });

    console.log("signing bundle...");
    for (const serializedTx of serializedTxs) {
      const tx = await signSerializedTransaction(serializedTx, admin);
      serializedSignedTxs.push(tx);
    }

    console.log("start simulating bundle...");
    const bundleSimluationResult = await simulateBundle({
      encodedTransactions: serializedSignedTxs,
    });
    console.log(
      `bundle simulation result: ${JSON.stringify(
        bundleSimluationResult.value
      )}`
    );

    console.log("start sending bundles..!!");
    const bundleId = await sendBundle(serializedSignedTxs);

    if (bundleSimluationResult.value.summary !== "succeeded") {
      throw new Error("bundle simulation failed");
    }

    await startPollingJitoBundle(bundleId);

    console.log(`basket ${basketId.toString()} data:`);
    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();

    const userBaksetTokenBalanceAfter = await pieProgram.getTokenBalance({
      mint: basketConfigData.mint,
      owner: admin.publicKey,
    });
    console.log({ userBaksetTokenBalanceAfter });
  });

  it.skip("Start rebalancing basket without Jito bundle", async () => {
    const basketId = new BN(26);

    const tx = new Transaction();

    //@dev When sending tx without Jito bundle, we need to set the compute unit price manually
    tx.add(priorityFeeInstruction);

    const startRebalanceTx = await pieProgram.startRebalancing({
      rebalancer: admin.publicKey,
      basketId,
    });
    tx.add(startRebalanceTx);
    const startRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      tx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    console.log(
      `Start rebalance at tx: https://solscan.io/tx/${startRebalanceTxResult}`
    );

    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basketConfig.isRebalancing, true);

    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it.skip("Rebalance amm pool without Jito bundle", async () => {
    const basketId = new BN(26);

    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basketConfig.isRebalancing, true);

    const basketMintInfo = await getMint(
      connection,
      pieProgram.basketMintPDA({ basketId })
    );
    const ammPoolToken = tokens.find((token) => token.type === "amm");
    const basketSupply = new BN(basketMintInfo.supply.toString());
    const ammPoolTokenQuantityInSysDecimal = basketConfig.components.find(
      (component) => component.mint.toBase58() === ammPoolToken.mint
    ).quantityInSysDecimal;

    // availableAmount = bakset supply * ammPoolTokenQuantityInSysDecimal  / 10^6(sys decimal)
    const availableAmount = basketSupply
      .mul(ammPoolTokenQuantityInSysDecimal)
      .div(new BN(10 ** 6));
    console.log({ availableAmount });

    const tx = new Transaction();
    tx.add(priorityFeeInstruction);
    const executeRebalanceTx = await pieProgram.executeRebalancing({
      rebalancer: admin.publicKey,
      isSwapBaseOut: false,
      amountIn: availableAmount.div(new BN(2)).toString(),
      amountOut: "0",
      ammId: ammPoolToken.poolId,
      basketId,
      inputMint: new PublicKey(ammPoolToken.mint),
      outputMint: NATIVE_MINT,
    });

    tx.add(executeRebalanceTx);

    console.log("sending execute rebalance AMM tx...");

    const executeRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      tx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Rebalance at tx: https://solscan.io/tx/${executeRebalanceTxResult}`
    );

    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it.skip("Rebalance cpmm pool without Jito bundle", async () => {
    const basketId = new BN(26);

    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basketConfig.isRebalancing, true);

    const basketMintInfo = await getMint(
      connection,
      pieProgram.basketMintPDA({ basketId })
    );
    const AI16Z = tokens.find((token) => token.type === "cpmm");
    const basketSupply = new BN(basketMintInfo.supply.toString());
    const AI16ZQuantityInSysDecimal = basketConfig.components.find(
      (component) => component.mint.toBase58() === AI16Z.mint
    ).quantityInSysDecimal;

    // availableAmount = supply * AI16ZQuantityInSysDecimal / 10^6(sys decimal)
    const availableAmount = basketSupply
      .mul(AI16ZQuantityInSysDecimal)
      .div(new BN(10 ** 6));
    console.log({ availableAmount });

    const tx = new Transaction();

    tx.add(priorityFeeInstruction);

    const executeRebalanceTx = await pieProgram.executeRebalancingCpmm({
      rebalancer: admin.publicKey,
      isSwapBaseOut: false,
      amountIn: availableAmount.div(new BN(2)).toString(),
      amountOut: "0",
      poolId: AI16Z.poolId,
      basketId,
      inputMint: new PublicKey(AI16Z.mint),
      outputMint: NATIVE_MINT,
    });

    tx.add(executeRebalanceTx);

    console.log("sending execute rebalance CPMM tx...");

    const executeRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      tx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Rebalance at tx: https://solscan.io/tx/${executeRebalanceTxResult}`
    );

    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it.skip("Rebalance clmm pool without Jito bundle", async () => {
    const basketId = new BN(26);

    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basketConfig.isRebalancing, true);

    const basketMintInfo = await getMint(
      connection,
      pieProgram.basketMintPDA({ basketId })
    );

    const clmmPoolToken = tokens.find((token) => token.type === "clmm");
    const basketSupply = new BN(basketMintInfo.supply.toString());
    const clmmPoolTokenQuantityInSysDecimal = basketConfig.components.find(
      (component) => component.mint.toBase58() === clmmPoolToken.mint
    ).quantityInSysDecimal;

    const availableAmount = basketSupply
      .mul(clmmPoolTokenQuantityInSysDecimal)
      .div(new BN(10 ** 6));

    console.log({
      clmmPoolToken: clmmPoolToken.mint,
      availableAmount: availableAmount.toString(),
    });

    const tx = new Transaction();

    tx.add(priorityFeeInstruction);

    //base in
    const executeRebalanceTx = await pieProgram.executeRebalancingClmm({
      rebalancer: admin.publicKey,
      isSwapBaseOut: false,
      amount: availableAmount,
      slippage: 100,
      poolId: clmmPoolToken.poolId,
      basketId,
      inputMint: new PublicKey(clmmPoolToken.mint),
      outputMint: NATIVE_MINT,
    });

    //base out
    // const executeRebalanceTx = await pieProgram.executeRebalancingClmm({
    //   rebalancer: admin.publicKey,
    //   isSwapBaseOut: true,
    //   amount: new BN(1000),
    //   slippage,
    //   poolId: clmmPoolToken.ammId,
    //   basketId,
    //   inputMint: new PublicKey(clmmPoolToken.mint),
    //   outputMint: NATIVE_MINT,
    // });

    tx.add(executeRebalanceTx);

    console.log("sending execute rebalance CPMM tx...");

    const executeRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      tx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Rebalance at tx: https://solscan.io/tx/${executeRebalanceTxResult}`
    );

    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it.skip("Stop rebalancing basket without Jito bundle", async () => {
    const basketId = new BN(26);

    const tx = new Transaction();

    //@dev When sending tx without Jito bundle, we need to set the compute unit price manually
    tx.add(priorityFeeInstruction);

    const stopRebalanceTx = await pieProgram.stopRebalancing({
      rebalancer: admin.publicKey,
      basketId,
    });
    tx.add(stopRebalanceTx);
    const stopRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      tx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    console.log(
      `Stop rebalance at tx: https://solscan.io/tx/${stopRebalanceTxResult}`
    );
  });
});
