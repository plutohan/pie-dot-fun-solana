import { BN } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import mainnetAdmin from "../.config/solana/id.json";
import { assert } from "chai";
import {
  BasketComponent,
  CreateBasketArgs,
  PieProgram,
} from "../sdk/pie-program";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { lookupTable, tokens } from "./fixtures/mainnet/token_test";
import { Table } from "console-table-printer";
import { initSdk } from "./utils/config";
import {
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  getExplorerUrl,
  getOrCreateNativeMintATA,
  getOrCreateTokenAccountTx,
  getSwapData,
  showBasketConfigTable,
  showBasketVaultsTable,
  showUserFundTable,
  unwrapSolIx,
  wrappedSOLInstruction,
} from "./utils/helper";
import { finalizeTransaction } from "./utils/lookupTable";
import {
  getInflightBundleStatuses,
  getTipAccounts,
  serializeJitoTransaction,
  getTipInformation,
  sendBundle,
  simulateBundle,
} from "../sdk/jito";
import { QUICKNODE_RPC_URL } from "../sdk/constants";

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(mainnetAdmin));
  const addressLookupTableMap = new Map<string, PublicKey>();
  const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");
  const pieProgram = new PieProgram(connection);
  const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 100000,
  });
  const swapsPerBundle = 3;
  const SLIPPAGE = 100;

  let raydium: Raydium;

  beforeEach(async () => {
    //init raydium
    raydium = await initSdk(connection, "mainnet");
  });

  it("Setup and Initialized if needed ", async () => {
    let programState = await pieProgram.getProgramState();

    if (!programState) {
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

    const rebalanceMarginLamports = programState
      ? programState.rebalanceMarginLamports.toNumber()
      : 0;
    if (rebalanceMarginLamports == 0) {
      const updateRebalanceMarginTx = await pieProgram.updateRebalanceMargin(
        admin.publicKey,
        0.5 * LAMPORTS_PER_SOL
      );
      const updateRebalanceMarginTxResult = await sendAndConfirmTransaction(
        connection,
        updateRebalanceMarginTx,
        [admin],
        {
          skipPreflight: true,
          commitment: "confirmed",
        }
      );
      console.log(
        `Rebalance margin updated at tx: https://solscan.io/tx/${updateRebalanceMarginTxResult}`
      );
    }

    if (programState.platformFeePercentage.toNumber() == 0) {
      // mint redeem fee 1% and platform fee 0.5%
      const updateFeeTx = await pieProgram.updateFee(
        admin.publicKey,
        1000,
        500
      );
      const updateFeeTxResult = await sendAndConfirmTransaction(
        connection,
        updateFeeTx,
        [admin],
        { skipPreflight: true, commitment: "confirmed" }
      );
      console.log(
        `Fee updated at tx: https://solscan.io/tx/${updateFeeTxResult}`
      );
    }
    //create platform fee token account if needed
    const { tx: outputTx, tokenAccount } = await getOrCreateTokenAccountTx(
      connection,
      new PublicKey(NATIVE_MINT),
      admin.publicKey,
      programState.platformFeeWallet
    );

    console.log({ outputTx, tokenAccount });

    if (outputTx.instructions.length !== 0) {
      outputTx.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 100000,
        })
      );

      const createPlatformFeeTokenAccountTxResult =
        await sendAndConfirmTransaction(connection, outputTx, [admin], {
          skipPreflight: false,
          commitment: "confirmed",
        });
      console.log(
        `Platform fee token account created at tx: ${getExplorerUrl(
          createPlatformFeeTokenAccountTxResult,
          connection.rpcEndpoint
        )}`
      );
    }

    if (
      programState.platformFeeWallet.toBase58() ==
      new PublicKey("11111111111111111111111111111111").toBase58()
    ) {
      const updatePlatformFeeWalletTx =
        await pieProgram.updatePlatformFeeWallet(
          admin.publicKey,
          admin.publicKey
        );
      const updatePlatformFeeWalletTxResult = await sendAndConfirmTransaction(
        connection,
        updatePlatformFeeWalletTx,
        [admin],
        { skipPreflight: true, commitment: "confirmed" }
      );
      console.log(
        `Platform fee wallet updated at tx: ${getExplorerUrl(
          updatePlatformFeeWalletTxResult,
          connection.rpcEndpoint
        )}`
      );
    }
  });

  it("Create Basket", async () => {
    const components: BasketComponent[] = tokens.map((token) => ({
      mint: new PublicKey(token.mint),
      quantityInSysDecimal: new BN(1 * 10 ** 6),
    }));

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket Name TEST",
      symbol: "BST",
      uri: "https://pie.xyz/pie",
      components: components,
      decimals: 6,
      rebalancer: admin.publicKey,
    };

    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter;
    const createBasketTx = await pieProgram.createBasket(
      admin.publicKey,
      createBasketArgs,
      basketId
    );

    console.log("adding basket info to lookup table");

    // for (let i = 0; i < createBasketArgs.components.length; i++) {
    //   await pieProgram.addBasketInfoToAddressLookupTable(
    //     raydium,
    //     connection,
    //     admin,
    //     tokens[i].ammId,
    //     basketId,
    //     lookupTable
    //   );
    // }

    console.log("sending basket create tx");

    const createBasketTxResult = await sendAndConfirmTransaction(
      connection,
      createBasketTx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Basket created at tx: https://solscan.io/tx/${createBasketTxResult}`
    );

    const { tx } = await pieProgram.createBasketVaultAccounts(
      admin.publicKey,
      createBasketArgs,
      basketId
    );
    tx.add(priorityFeeInstruction);

    //create creator fee token account if needed
    const { tx: outputTx } = await getOrCreateTokenAccountTx(
      connection,
      new PublicKey(NATIVE_MINT),
      admin.publicKey,
      admin.publicKey
    );

    if (outputTx.instructions.length !== 0) {
      tx.add(outputTx);
    }

    const createCreatorFeeTokenAccountTxResult =
      await sendAndConfirmTransaction(connection, outputTx, [admin], {
        skipPreflight: true,
        commitment: "confirmed",
      });
    console.log(
      `Creator fee token account created at tx: https://solscan.io/tx/${createCreatorFeeTokenAccountTxResult}`
    );

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
    const serializedTxs: string[] = [];
    const addressLookupTablesAccount: AddressLookupTableAccount[] = [];
    const tipAccounts = await getTipAccounts();
    const tipInformation = await getTipInformation();
    const recentBlockhash = await connection.getLatestBlockhash("finalized");
    const mintAmount = 200000;

    let wsolAccount: PublicKey;
    let tx = new Transaction();
    tx.add(priorityFeeInstruction);

    const swapDatas = [];
    basketConfigData.components.forEach((component) => {
      const swapData = getSwapData({
        isBuy: true,
        inputMint: NATIVE_MINT.toBase58(),
        outputMint: component.mint.toBase58(),
        amount: mintAmount,
        slippage: SLIPPAGE,
      });
      swapDatas.push(swapData);
    });

    const swapDatasResult = await Promise.all(swapDatas);

    const totalAmountIn = swapDatasResult.reduce(
      (acc, curr) => acc + Number(curr.data.inputAmount),
      0
    );

    for (let i = 0; i < basketConfigData.components.length; i++) {
      console.log(`processing ${i} of ${basketConfigData.components.length}`);
      if (i === 0) {
        const wrappedSolIx = await wrappedSOLInstruction(
          admin.publicKey,
          totalAmountIn * 10 // @TODO don't need * 10, but it deosn't work
        );

        const { tokenAccount, tx: createWsolAtaTx } =
          await getOrCreateTokenAccountTx(
            connection,
            new PublicKey(NATIVE_MINT),
            admin.publicKey,
            admin.publicKey
          );

        wsolAccount = tokenAccount;
        if (createWsolAtaTx.instructions.length > 0) {
          tx.add(createWsolAtaTx);
        }
        tx.add(...wrappedSolIx);
      } else if (i % swapsPerBundle === 0) {
        const lut = (await connection.getAddressLookupTable(lookupTable)).value;
        addressLookupTablesAccount.push(lut);

        const serializedTx = await serializeJitoTransaction(
          recentBlockhash.blockhash,
          admin,
          tx,
          addressLookupTablesAccount
        );
        serializedTxs.push(serializedTx);

        tx = new Transaction();
        tx.add(priorityFeeInstruction);
      }

      if (swapDatasResult[i].data.outputMint !== tokens[i].mint) {
        throw new Error("output mint is not correct");
      }

      const buyComponentTx = await pieProgram.buyComponent({
        userSourceOwner: admin.publicKey,
        basketId,
        maxAmountIn: totalAmountIn, // @TODO should be swapDatasResult[i].data.inputAmount, but sometimes it fails due to slippage
        amountOut: Number(swapDatasResult[i].data.outputAmount),
        raydium,
        ammId: tokens[i].ammId,
        unwrapSol: false,
      });
      tx.add(buyComponentTx);

      if (i === basketConfigData.components.length - 1) {
        const mintBasketTokenTx = await pieProgram.mintBasketToken(
          admin.publicKey,
          basketId,
          mintAmount
        );
        tx.add(mintBasketTokenTx);

        tx.add(
          createCloseAccountInstruction(
            wsolAccount,
            admin.publicKey,
            admin.publicKey
          )
        );

        const serializedTx = await serializeJitoTransaction(
          recentBlockhash.blockhash,
          admin,
          tx,
          addressLookupTablesAccount,
          new PublicKey(
            tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
          ),
          Math.floor(
            tipInformation?.landed_tips_50th_percentile * LAMPORTS_PER_SOL
          )
        );
        serializedTxs.push(serializedTx);
      }
    }

    console.log("start simulating bundle...");
    const bundleSimluationResult = await simulateBundle({
      encodedTransactions: serializedTxs,
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
    const bundleId = await sendBundle(serializedTxs);
    if (bundleId) {
      await new Promise<void>((resolve) => {
        let interval = setInterval(async () => {
          const statuses = await getInflightBundleStatuses([bundleId]);
          console.log(JSON.stringify({ statuses }));
          if (statuses?.value[0]?.status === "Landed") {
            console.log("bundle confirmed");
            clearInterval(interval);

            const userFund = await pieProgram.getUserFund(
              admin.publicKey,
              basketId
            );

            const table = new Table({
              columns: [
                { name: "mint", alignment: "left", color: "cyan" },
                { name: "amount", alignment: "right", color: "green" },
              ],
            });

            for (let i = 0; i < userFund.components.length; i++) {
              let component = userFund.components[i];
              table.addRow({
                mint: component.mint.toBase58(),
                amount: component.amount.toString(),
              });
            }
            table.printTable();

            const userBaksetTokenBalance = await pieProgram.getTokenBalance(
              basketConfigData.mint,
              admin.publicKey
            );
            console.log({ userBaksetTokenBalance });

            resolve();
          }
        }, 1000);
      });
    }
  });

  it("Redeem basket token and sell components using Jito bundle", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig(basketId);
    const addressLookupTablesAccount: AddressLookupTableAccount[] = [];
    const tipAccounts = await getTipAccounts();
    const tipInformation = await getTipInformation();
    const recentBlockhash = await connection.getLatestBlockhash("finalized");
    const serializedTxs: string[] = [];

    const userSolBalanceBefore = await connection.getBalance(admin.publicKey);
    const userBaksetTokenBalanceBefore = await pieProgram.getTokenBalance(
      basketConfigData.mint,
      admin.publicKey
    );

    console.log({ userSolBalanceBefore, userBaksetTokenBalanceBefore });

    const redeemAmount = userBaksetTokenBalanceBefore;

    let tx = new Transaction();
    const { tokenAccount: nativeMintAta, tx: createNativeMintATATx } =
      await getOrCreateNativeMintATA(
        connection,
        admin.publicKey,
        admin.publicKey
      );

    const swapDatas = [];

    basketConfigData.components.forEach((component) => {
      console.log(
        component.quantityInSysDecimal
          .div(new BN(10 ** 6))
          .mul(new BN(redeemAmount))
          .toNumber()
      );
      const swapData = getSwapData({
        isBuy: false,
        inputMint: component.mint.toBase58(),
        outputMint: NATIVE_MINT.toBase58(),
        amount: component.quantityInSysDecimal
          .div(new BN(10 ** 6))
          .mul(new BN(redeemAmount))
          .toNumber(),
        slippage: SLIPPAGE,
      });
      swapDatas.push(swapData);
    });

    const swapDatasResult = await Promise.all(swapDatas);

    for (let i = 0; i < basketConfigData.components.length; i++) {
      console.log(`processing ${i} of ${basketConfigData.components.length}`);
      if (i === 0) {
        tx.add(priorityFeeInstruction);
        if (createNativeMintATATx.instructions.length > 0) {
          tx.add(createNativeMintATATx);
        }
        tx.add(
          await pieProgram.redeemBasketToken(
            admin.publicKey,
            basketId,
            redeemAmount
          )
        );
      } else if (i % swapsPerBundle === 0) {
        const lut = (await connection.getAddressLookupTable(lookupTable)).value;
        addressLookupTablesAccount.push(lut);

        const serializedTx = await serializeJitoTransaction(
          recentBlockhash.blockhash,
          admin,
          tx,
          addressLookupTablesAccount
        );
        serializedTxs.push(serializedTx);

        tx = new Transaction();
        tx.add(priorityFeeInstruction);
      }

      const sellComponentTx = await pieProgram.sellComponent({
        user: admin.publicKey,
        inputMint: basketConfigData.components[i].mint,
        basketId,
        amountIn: Number(swapDatasResult[i].data.inputAmount),
        minimumAmountOut: 0, //@TODO should be Number(swapDatasResult[i].data.outputAmount),
        raydium,
        ammId: tokens[i].ammId,
      });
      tx.add(sellComponentTx);

      if (i === basketConfigData.components.length - 1) {
        tx.add(unwrapSolIx(nativeMintAta, admin.publicKey));

        const serializedTx = await serializeJitoTransaction(
          recentBlockhash.blockhash,
          admin,
          tx,
          addressLookupTablesAccount,
          new PublicKey(
            tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
          ),
          Math.floor(
            tipInformation?.landed_tips_50th_percentile * LAMPORTS_PER_SOL
          )
        );
        serializedTxs.push(serializedTx);
      }
    }

    console.log("start simulating bundle...");
    const bundleSimluationResult = await simulateBundle({
      encodedTransactions: serializedTxs,
    });
    console.log(
      `bundle simulation result: ${JSON.stringify(
        bundleSimluationResult.value
      )}`
    );

    console.log("start sending bundles..!!");
    const bundleId = await sendBundle(serializedTxs);

    if (bundleSimluationResult.value.summary !== "succeeded") {
      throw new Error("bundle simulation failed");
    }

    if (bundleId) {
      let interval = setInterval(async () => {
        const statuses = await getInflightBundleStatuses([bundleId]);
        console.log(JSON.stringify({ statuses }));
        if (statuses?.value[0]?.status === "Landed") {
          console.log("bundle confirmed");
          clearInterval(interval);

          const userFund = await pieProgram.getUserFund(
            admin.publicKey,
            basketId
          );

          const table = new Table({
            columns: [
              { name: "mint", alignment: "left", color: "cyan" },
              { name: "amount", alignment: "right", color: "green" },
            ],
          });

          for (let i = 0; i < userFund.components.length; i++) {
            let component = userFund.components[i];
            table.addRow({
              mint: component.mint.toBase58(),
              amount: component.amount.toString(),
            });
          }
          table.printTable();

          const userSolBalanceAfter = await connection.getBalance(
            admin.publicKey
          );
          const userBaksetTokenBalanceAfter = await pieProgram.getTokenBalance(
            basketConfigData.mint,
            admin.publicKey
          );
          console.log({ userSolBalanceAfter, userBaksetTokenBalanceAfter });
        }
      }, 1000);
    }
  });

  // @TODO: have to fix this test
  it.skip("Start rebalance basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const startRebalanceTx = await pieProgram.startRebalancing(
      admin.publicKey,
      basketId
    );
    const startRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      startRebalanceTx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    console.log(
      `Start rebalance at tx: https://solscan.io/tx/${startRebalanceTxResult}`
    );

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

      await pieProgram.addBasketInfoToAddressLookupTable(
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
