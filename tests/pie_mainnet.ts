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
import { Table } from "console-table-printer";
import { initSdk } from "./utils/config";
import { getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import {
  getExplorerUrl,
  getOrCreateTokenAccountTx,
  showBasketConfigTable,
  showBasketVaultsTable,
  startPollingJitoBundle,
} from "./utils/helper";
import {
  getInflightBundleStatuses,
  sendBundle,
  simulateBundle,
  signSerializedTransaction,
} from "../sdk/jito";
import { QUICKNODE_RPC_URL } from "../sdk/constants";

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(mainnetAdmin));
  const addressLookupTableMap = new Map<string, PublicKey>();
  const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");
  const pieProgram = new PieProgram(connection);
  const priorityFee = 100000;
  const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee,
  });
  const swapsPerBundle = 3;
  const slippage = 10;

  let raydium: Raydium;

  beforeEach(async () => {
    //init raydium
    raydium = await initSdk(connection, "mainnet");
  });

  it("Setup and Initialized if needed ", async () => {
    let programState = await pieProgram.getProgramState();

    if (!programState) {
      console.log("initializing program...");
      const initializeTx = await pieProgram.initialize(admin.publicKey);
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

    const rebalanceMarginLamports = programState
      ? programState.rebalanceMarginLamports.toNumber()
      : 0;

    if (rebalanceMarginLamports == 0) {
      console.log("adding updating rebalance margin tx...");
      const updateRebalanceMarginTx = await pieProgram.updateRebalanceMargin(
        admin.publicKey,
        0.5 * LAMPORTS_PER_SOL
      );
      setUpTx.add(updateRebalanceMarginTx);
    }

    if (programState.platformFeePercentage.toNumber() == 0) {
      console.log("adding updating fee tx...");
      // mint redeem fee 1% and platform fee 0.5%
      const updateFeeTx = await pieProgram.updateFee(
        admin.publicKey,
        1000,
        500
      );
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
        await pieProgram.updatePlatformFeeWallet(
          admin.publicKey,
          admin.publicKey
        );
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
  });

  it("Create Basket", async () => {
    const components: BasketComponent[] = tokens.map((token) => ({
      mint: new PublicKey(token.mint),
      quantityInSysDecimal: new BN(1 * 10 ** 6),
    }));

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket 1",
      symbol: "B-1",
      uri: "https://pie.xyz/pie",
      components: components,
      decimals: 6,
      rebalancer: admin.publicKey,
    };

    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter;

    console.log("creating basket...");
    const createBasketTx = await pieProgram.createBasket(
      admin.publicKey,
      createBasketArgs,
      basketId
    );

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

    console.log("creating lookup tables for each component...");

    const lookupTables = [];
    for (let i = 0; i < createBasketArgs.components.length; i++) {
      console.log(
        `creating lookup table for ${i + 1} of ${
          createBasketArgs.components.length
        }`
      );
      const lut = await pieProgram.addRaydiumAmmToAddressLookupTable(
        raydium,
        connection,
        admin,
        tokens[i].ammId,
        basketId
      );
      lookupTables.push(lut.toBase58());
    }

    console.log("lookup tables created:", lookupTables);

    const { tx } = await pieProgram.createBasketVaultAccounts(
      admin.publicKey,
      createBasketArgs,
      basketId
    );

    if (tx.instructions.length > 0) {
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

    const basket = await pieProgram.getBasketConfig(basketId);
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
    const basketConfigData = await pieProgram.getBasketConfig(basketId);

    const userBaksetTokenBalanceBefore = await pieProgram.getTokenBalance(
      basketConfigData.mint,
      admin.publicKey
    );
    console.log({ userBaksetTokenBalanceBefore });

    const serializedSignedTxs: string[] = [];
    const mintAmount = 400000;

    console.log("creating bundle...");
    const serializedTxs = await pieProgram.createBuyAndMintBundle({
      user: admin.publicKey,
      basketId,
      slippage,
      mintAmount,
      raydium,
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

    const userBaksetTokenBalanceAfter = await pieProgram.getTokenBalance(
      basketConfigData.mint,
      admin.publicKey
    );
    console.log({ userBaksetTokenBalanceAfter });
  });

  it("Redeem basket token and sell components using Jito bundle", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig(basketId);
    const serializedSignedTxs: string[] = [];

    const userSolBalanceBefore = await connection.getBalance(admin.publicKey);
    const userBaksetTokenBalanceBefore = await pieProgram.getTokenBalance(
      basketConfigData.mint,
      admin.publicKey
    );

    console.log({ userSolBalanceBefore, userBaksetTokenBalanceBefore });

    const redeemAmount = userBaksetTokenBalanceBefore / 2;

    console.log("creating bundle...");
    const serializedTxs = await pieProgram.createRedeemAndSellBundle({
      user: admin.publicKey,
      basketId,
      slippage,
      redeemAmount,
      raydium,
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
  });

  it.skip("Executing rebalance basket by selling the first component", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigPDA = pieProgram.basketConfigPDA(basketId);
    const basketConfigData = await pieProgram.getBasketConfig(basketId);

    const component = basketConfigData.components[1];
    console.log("basket vault balance before:");
    (
      await showBasketVaultsTable(await pieProgram.getBasketVaults(basketId))
    ).printTable();

    const vaultComponentAccount = await getAssociatedTokenAddress(
      component.mint,
      basketConfigPDA,
      true
    );
    const vaultComponentsBalance = await connection.getTokenAccountBalance(
      vaultComponentAccount,
      "confirmed"
    );

    console.log(vaultComponentsBalance.value.amount.toString());

    const executeRebalanceTx = await pieProgram.executeRebalancing(
      admin.publicKey,
      false,
      vaultComponentsBalance.value.amount.toString(),
      "0",
      tokens[1].ammId,
      basketId,
      new PublicKey(tokens[1].mint),
      raydium
    );

    executeRebalanceTx.add(priorityFeeInstruction);

    const executeRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      executeRebalanceTx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    console.log(
      `Executing rebalance at tx: ${getExplorerUrl(
        executeRebalanceTxResult,
        connection.rpcEndpoint
      )}`
    );

    console.log("basket vault balance before:");
    (
      await showBasketVaultsTable(await pieProgram.getBasketVaults(basketId))
    ).printTable();
  });

  it.skip("Executing rebalance basket by buying component 5", async () => {
    const isBuy = true;
    const newBasketBuy = tokens[5];
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigPDA = pieProgram.basketConfigPDA(basketId);
    const vaultWrappedSolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      basketConfigPDA,
      true
    );
    let vaultWrappedSolBalance = await connection.getTokenAccountBalance(
      vaultWrappedSolAccount
    );

    console.log(vaultWrappedSolAccount);
    console.log({ vaultWrappedSolBalance });

    const executeRebalanceTx = await pieProgram.executeRebalancing(
      admin.publicKey,
      isBuy,
      vaultWrappedSolBalance.value.amount.toString(),
      "1",
      newBasketBuy.ammId,
      basketId,
      new PublicKey(newBasketBuy.mint),
      raydium
    );

    executeRebalanceTx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000_000,
      })
    );

    const executeRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      executeRebalanceTx,
      [admin],
      {
        skipPreflight: false,
        commitment: "confirmed",
      }
    );

    //add basket info to lookup table when buy new basket token to config
    if (isBuy) {
      const lookupTable = addressLookupTableMap.get(basketId.toString());

      await pieProgram.addRaydiumAmmToAddressLookupTable(
        raydium,
        connection,
        admin,
        newBasketBuy.ammId,
        basketId,
        lookupTable
      );
    }

    console.log(
      `Executing rebalance at tx: https://solscan.io/tx/${executeRebalanceTxResult}`
    );
    console.log(`Basket config ${basketId.toString()} data: `);

    vaultWrappedSolBalance = await connection.getTokenAccountBalance(
      vaultWrappedSolAccount
    );
    console.log({ vaultWrappedSolBalance });

    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it.skip("Stop rebalance basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const stopRebalanceTx = await pieProgram.stopRebalancing(
      admin.publicKey,
      basketId
    );
    const stopRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      stopRebalanceTx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    console.log(
      `Stop rebalance at tx: https://solscan.io/tx/${stopRebalanceTxResult}`
    );

    const basketConfig = await pieProgram.getBasketConfig(basketId);
    assert.equal(basketConfig.isRebalancing, false);
  });
});
