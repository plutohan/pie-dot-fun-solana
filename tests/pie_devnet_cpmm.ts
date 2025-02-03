import { BN } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import { assert } from "chai";
import {
  BasketComponent,
  CreateBasketArgs,
  PieProgram,
} from "../sdk/pie-program";
import { CurveCalculator, Raydium } from "@raydium-io/raydium-sdk-v2";
import { tokensAmm, tokensCpmm } from "./fixtures/devnet/token_test";
import { Table } from "console-table-printer";
import { initSdk } from "../sdk/utils/config";
import { getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import {
  getOrCreateNativeMintATA,
  getOrCreateTokenAccountTx,
  getTokenAccount,
  showBasketConfigTable,
  showUserFundTable,
  unwrapSolIx,
  wrapSOLInstruction,
} from "../sdk/utils/helper";
import {
  addAddressesToTable,
  finalizeTransaction,
} from "../sdk/utils/lookupTable";

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));

  const addressLookupTableMap = new Map<string, PublicKey>();

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pieProgram = new PieProgram(connection, "devnet");

  beforeEach(async () => {
    await pieProgram.init();
  });

  it("Setup and Initialized if needed ", async () => {
    let programState = await pieProgram.getProgramState();

    if (!programState) {
      const initializeTx = await pieProgram.initialize({
        initializer: admin.publicKey,
        admin: admin.publicKey,
        creator: admin.publicKey,
        platformFeeWallet: admin.publicKey,
        platformFeePercentage: new BN(500),
      });
      const initializeTxResult = await sendAndConfirmTransaction(
        connection,
        initializeTx,
        [admin],
        {
          skipPreflight: true,
          commitment: "confirmed",
        }
      );
      console.log(
        `Program initialized at tx: https://explorer.solana.com/tx/${initializeTxResult}?cluster=devnet`
      );
    }

    //fetch again
    programState = await pieProgram.getProgramState();

    if (programState.platformFeePercentage.toNumber() == 0) {
      // mint redeem fee 1% and platform fee 0.5%
      const updateFeeTx = await pieProgram.updateFee({
        admin: admin.publicKey,
        newCreatorFeePercentage: 1000,
        newPlatformFeePercentage: 500,
      });
      const updateFeeTxResult = await sendAndConfirmTransaction(
        connection,
        updateFeeTx,
        [admin],
        { skipPreflight: true, commitment: "confirmed" }
      );
      console.log(
        `Fee updated at tx: https://explorer.solana.com/tx/${updateFeeTxResult}?cluster=devnet`
      );
    }
    //create platform fee token account if needed
    const { tx: outputTx } = await getOrCreateTokenAccountTx(
      connection,
      new PublicKey(NATIVE_MINT),
      admin.publicKey,
      programState.platformFeeWallet
    );

    if (outputTx.instructions.length !== 0) {
      const createPlatformFeeTokenAccountTxResult =
        await sendAndConfirmTransaction(connection, outputTx, [admin], {
          skipPreflight: true,
          commitment: "confirmed",
        });
      console.log(
        `Platform fee token account created at tx: https://explorer.solana.com/tx/${createPlatformFeeTokenAccountTxResult}?cluster=devnet`
      );
    }
    if (
      programState.platformFeeWallet.toBase58() ==
      new PublicKey("11111111111111111111111111111111").toBase58()
    ) {
      const updatePlatformFeeWalletTx =
        await pieProgram.updatePlatformFeeWallet({
          admin: admin.publicKey,
          newPlatformFeeWallet: admin.publicKey,
        });
      const updatePlatformFeeWalletTxResult = await sendAndConfirmTransaction(
        connection,
        updatePlatformFeeWalletTx,
        [admin],
        { skipPreflight: true, commitment: "confirmed" }
      );
      console.log(
        `Platform fee wallet updated at tx: https://explorer.solana.com/tx/${updatePlatformFeeWalletTxResult}?cluster=devnet`
      );
    }
  });

  it("Create Basket of CPMM token", async () => {
    const components: BasketComponent[] = [
      {
        mint: new PublicKey(tokensCpmm[0].mint),
        quantityInSysDecimal: new BN(1 * 10 ** 6),
      },
    ];

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket CPMM",
      symbol: "BNS",
      uri: "test",
      components: components,
      rebalancer: admin.publicKey,
    };

    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter;
    const createBasketTx = await pieProgram.createBasket({
      creator: admin.publicKey,
      args: createBasketArgs,
      basketId,
    });

    //add address to lookup table
    let newLookupTable: PublicKey;

    for (let i = 0; i < createBasketArgs.components.length; i++) {
      newLookupTable = await pieProgram.addRaydiumCpmmToAddressLookupTable({
        connection,
        signer: admin,
        poolId: tokensCpmm[i].poolId,
        lookupTable: newLookupTable,
      });
    }

    if (!addressLookupTableMap.has(basketId.toString())) {
      addressLookupTableMap.set(basketId.toString(), newLookupTable);
    }

    const createBasketTxResult = await sendAndConfirmTransaction(
      connection,
      createBasketTx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );
    console.log(
      `Basket created at tx: https://explorer.solana.com/tx/${createBasketTxResult}?cluster=devnet`
    );

    //create creator fee token account if needed
    const { tx: outputTx } = await getOrCreateTokenAccountTx(
      connection,
      new PublicKey(NATIVE_MINT),
      admin.publicKey,
      admin.publicKey
    );

    if (outputTx.signatures.length !== 0) {
      const createCreatorFeeTokenAccountTxResult =
        await sendAndConfirmTransaction(connection, outputTx, [admin], {
          skipPreflight: true,
          commitment: "confirmed",
        });
      console.log(
        `Creator fee token account created at tx: https://explorer.solana.com/tx/${createCreatorFeeTokenAccountTxResult}?cluster=devnet`
      );
    }

    let addressLookupTable = addressLookupTableMap.get(basketId.toString());
    const lut = (await connection.getAddressLookupTable(addressLookupTable))
      .value;

    const { vaults, tx: createBasketVaultTx } =
      await pieProgram.createBasketVaultAccounts({
        creator: admin.publicKey,
        args: createBasketArgs,
        basketId,
      });
    await finalizeTransaction(connection, admin, createBasketVaultTx, [lut]);

    if (vaults.length > 0) {
      await addAddressesToTable(connection, admin, addressLookupTable, vaults);
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

  it("Buy Component CPMM", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig({ basketId });
    const amountWantToBuy = 200000;
    const totalSolTobuy = 4 * LAMPORTS_PER_SOL;

    const { tokenAccount: nativeMintAta, tx } = await getOrCreateNativeMintATA(
      connection,
      admin.publicKey,
      admin.publicKey
    );
    const wrappedSolIx = wrapSOLInstruction(admin.publicKey, totalSolTobuy);
    tx.add(...wrappedSolIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      skipPreflight: true,
      commitment: "confirmed",
    });

    for (let i = 0; i < basketConfigData.components.length; i++) {
      const buyComponentTx = await pieProgram.buyComponentCpmm({
        user: admin.publicKey,
        basketId,
        amountOut: amountWantToBuy,
        poolId: tokensCpmm[i].poolId,
      });

      const buyComponentTxResult = await sendAndConfirmTransaction(
        connection,
        buyComponentTx,
        [admin],
        {
          skipPreflight: true,
          commitment: "confirmed",
        }
      );

      console.log(
        `Buy component CPMM at tx: https://explorer.solana.com/tx/${buyComponentTxResult}?cluster=devnet`
      );
    }
    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable.printTable();
  });

  it("Mint Basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));

    const mintBasketTokenTx = await pieProgram.mintBasketToken({
      user: admin.publicKey,
      basketId,
      amount: 4,
    });

    const mintBasketTokenTxResult = await sendAndConfirmTransaction(
      connection,
      mintBasketTokenTx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    console.log(
      `Mint basket token at tx: https://explorer.solana.com/tx/${mintBasketTokenTxResult}?cluster=devnet`
    );

    console.log("User fund after mint basket: ");
    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable.printTable();
  });

  it("Redeem Basket Token", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const redeemBasketTokenTx = await pieProgram.redeemBasketToken({
      user: admin.publicKey,
      basketId,
      amount: 2,
    });

    const redeemBasketTokenTxResult = await sendAndConfirmTransaction(
      connection,
      redeemBasketTokenTx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    console.log(
      `Redeem basket token at tx: https://explorer.solana.com/tx/${redeemBasketTokenTxResult}?cluster=devnet`
    );
    console.log("User fund after redeem basket: ");
    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable.printTable();
  });

  it("Sell Component CPMM", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const userFund = await pieProgram.getUserFund({
      user: admin.publicKey,
      basketId,
    });

    const componentToSell = userFund.components.find(
      (component) => component.mint.toString() == tokensCpmm[0].mint
    );

    const sellComponentTx = await pieProgram.sellComponentCpmm({
      user: admin.publicKey,
      basketId,
      inputMint: componentToSell.mint,
      amountIn: Math.floor(componentToSell.amount.toNumber() / 2),
      minimumAmountOut: 0,
      poolId: tokensCpmm[0].poolId,
      unwrapSol: true,
    });

    const sellComponentTxResult = await sendAndConfirmTransaction(
      connection,
      sellComponentTx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    console.log(
      `Sell component at tx: https://explorer.solana.com/tx/${sellComponentTxResult}?cluster=devnet`
    );

    console.log("User fund after sell component basket: ");
    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable.printTable();
  });

  it("Start rebalance basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const startRebalanceTx = await pieProgram.startRebalancing({
      rebalancer: admin.publicKey,
      basketId,
    });
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
      `Start rebalance at tx: https://explorer.solana.com/tx/${startRebalanceTxResult}?cluster=devnet`
    );

    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it("Executing rebalance basket by selling the first component", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigPDA = pieProgram.basketConfigPDA({ basketId });
    const basketConfigData = await pieProgram.getBasketConfig({ basketId });
    const component = basketConfigData.components[0];

    const vaultComponentAccount = await getAssociatedTokenAddress(
      component.mint,
      basketConfigPDA,
      true
    );

    const vaultComponentsBalance = await connection.getTokenAccountBalance(
      vaultComponentAccount,
      "confirmed"
    );

    const executeRebalanceTx = await pieProgram.executeRebalancingCpmm({
      rebalancer: admin.publicKey,
      isSwapBaseOut: false,
      amountIn: vaultComponentsBalance.value.amount,
      amountOut: "0",
      poolId: tokensCpmm[0].poolId,
      basketId,
      inputMint: new PublicKey(tokensCpmm[0].mint),
      outputMint: NATIVE_MINT,
    });

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
      `Executing rebalance at tx: https://explorer.solana.com/tx/${executeRebalanceTxResult}?cluster=devnet`
    );
    console.log(`Basket config ${basketId.toString()} data: `);
    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it("Executing rebalance basket by buying component 5", async () => {
    const isSwapBaseOut = true;
    const newBasketBuy = tokensAmm[5];
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigPDA = pieProgram.basketConfigPDA({ basketId });
    const vaultWrappedSolAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      basketConfigPDA,
      true
    );
    const vaultWrappedSolBalance = await connection.getTokenAccountBalance(
      vaultWrappedSolAccount
    );

    const executeRebalanceTx = await pieProgram.executeRebalancing({
      rebalancer: admin.publicKey,
      isSwapBaseOut,
      amountIn: new BN(vaultWrappedSolBalance.value.amount)
        .div(new BN(2))
        .toString(),
      amountOut: "20",
      ammId: newBasketBuy.ammId,
      basketId,
      inputMint: NATIVE_MINT,
      outputMint: new PublicKey(newBasketBuy.mint),
    });

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
    if (isSwapBaseOut) {
      const lookupTable = addressLookupTableMap.get(basketId.toString());

      await pieProgram.addRaydiumCpmmToAddressLookupTable({
        connection,
        signer: admin,
        poolId: newBasketBuy.ammId,
        lookupTable,
      });
    }

    console.log(
      `Executing rebalance at tx: https://explorer.solana.com/tx/${executeRebalanceTxResult}?cluster=devnet`
    );
    console.log(`Basket config ${basketId.toString()} data: `);
    const basketMintTable = await showBasketConfigTable(
      connection,
      pieProgram,
      basketId
    );
    basketMintTable.printTable();
  });

  it("Stop rebalance basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketPDA = pieProgram.basketConfigPDA({ basketId });
    const { tokenAccount: nativeAta, tx: txs } = await getOrCreateNativeMintATA(
      connection,
      admin.publicKey,
      basketPDA
    );
    const stopRebalanceTx = await pieProgram.stopRebalancing({
      rebalancer: admin.publicKey,
      basketId,
    });
    txs.add(stopRebalanceTx);
    const stopRebalanceTxResult = await sendAndConfirmTransaction(
      connection,
      txs,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    console.log(
      `Stop rebalance at tx: https://explorer.solana.com/tx/${stopRebalanceTxResult}?cluster=devnet`
    );

    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    assert.equal(basketConfig.isRebalancing, false);
  });
});
