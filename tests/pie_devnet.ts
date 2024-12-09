import { BN } from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import { assert } from "chai";
import {
  BasketComponent,
  CreateBasketArgs,
  PieProgram,
} from "../sdk/pie-program";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { tokens } from "./utils/token_test";
import { Table } from "console-table-printer";
import { initSdk } from "./utils/config";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, getMint, NATIVE_MINT } from "@solana/spl-token";
import { showBasketConfigTable, sleep } from "./utils/helper";

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pieProgram = new PieProgram(connection);
  let raydium: Raydium;

  it("Setup and Initialized if needed ", async () => {

    //init raydium
    raydium = await initSdk(connection, "devnet");

    let programState = await pieProgram.getProgramState();
    if (!programState) {
      const initializeTx = await pieProgram.initialize(admin.publicKey);
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

    const rebalanceMarginLamports = programState ? programState.rebalanceMarginLamports.toNumber() : 0;
    if(rebalanceMarginLamports == 0) {
      const updateRebalanceMarginTx = await pieProgram.updateRebalanceMargin(admin.publicKey, 0.5 * LAMPORTS_PER_SOL);
      const updateRebalanceMarginTxResult = await sendAndConfirmTransaction(
        connection,
        updateRebalanceMarginTx,
        [admin],
        { 
          skipPreflight: true, 
          commitment: "confirmed" 
        }
      );
      console.log(
        `Rebalance margin updated at tx: https://explorer.solana.com/tx/${updateRebalanceMarginTxResult}?cluster=devnet`
      );
    }

  });


  it("Create Basket", async () => {
    const components: BasketComponent[] = [
      {
        mint: new PublicKey(tokens[0].mint),
        ratio: new BN(1 * 10 **6 ),
      },
      {
        mint: new PublicKey(tokens[1].mint),
        ratio: new BN(2 * 10 **6 ),
      },
      {
        mint: new PublicKey(tokens[2].mint),
        ratio: new BN(3 * 10 **6 ),
      },
    ];

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket Name Test",
      symbol: "BNS",
      uri: "test",
      components: components,
      decimals: 6,
      rebalancer: admin.publicKey
    };

    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter;
    const createBasketTx = await pieProgram.createBasket(
      admin.publicKey,
      createBasketArgs,
      basketId
    );
    const createBasketTxResult = await sendAndConfirmTransaction(
      connection,
      createBasketTx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );
    console.log(
      `Basket created at tx: https://explorer.solana.com/tx/${createBasketTxResult}?cluster=devnet`
    );

    const basket = await pieProgram.getBasketConfig(basketId);
    assert.equal(basket.components.length, createBasketArgs.components.length);
    assert.equal(basket.creator.toBase58(), admin.publicKey.toBase58());
    assert.equal(basket.id.toString(), basketId.toString());
    assert.equal(basket.rebalancer.toString(), admin.publicKey.toString());
    const table = new Table({
      columns: [
        { name: "mint", alignment: "left", color: "cyan" },
        { name: "ratio", alignment: "right", color: "green" },
      ],
    });

    for (let i = 0; i < basket.components.length; i++) {
      let component = basket.components[i];
      table.addRow({
        mint: component.mint.toBase58(),
        ratio: component.ratio.toString(),
      });
    }
    table.printTable();
  });

  it("Buy Component", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig(basketId);
    for (let i = 0; i < basketConfigData.components.length; i++) {
      const buyComponentTx = await pieProgram.buyComponent(
        admin.publicKey,
        basketId,
        1 * LAMPORTS_PER_SOL,
        20000000,
        raydium,
        tokens[i].ammId
      );

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
        `Buy component at tx: https://explorer.solana.com/tx/${buyComponentTxResult}?cluster=devnet`
      );
    }
    const userFund = await pieProgram.getUserFund(admin.publicKey, basketId);

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
  });

  it("Mint Basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));

    const mintBasketTokenTx = await pieProgram.mintBasketToken(
      admin.publicKey,
      basketId,
      4
    );

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
  });

  it("Redeem Basket Token", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const redeemBasketTokenTx = await pieProgram.redeemBasketToken(
      admin.publicKey,
      basketId,
      2
    );

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
  });

  it("Sell Component", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const sellComponentTx = await pieProgram.sellComponent(
      admin.publicKey,
      new PublicKey(tokens[1].mint),
      basketId,
      0.1 * 1000000,
      0,
      raydium,
      tokens[1].ammId
    );

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

    const userFund = await pieProgram.getUserFund(admin.publicKey, basketId);
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
    console.log("User fund after sell component:");
    table.printTable();
  });

  it("Start rebalance basket", async () => {
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
      `Start rebalance at tx: https://explorer.solana.com/tx/${startRebalanceTxResult}?cluster=devnet`
    );

    const basketMintTable = await showBasketConfigTable(connection, pieProgram, basketId);
    basketMintTable.printTable();
  });

  it("Executing rebalance basket by selling component last component", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigPDA = pieProgram.basketConfigPDA(basketId);
    const basketConfigData = await pieProgram.getBasketConfig(basketId);
    const component = basketConfigData.components[2];

    const vaultComponentAccount = await getAssociatedTokenAddress(component.mint, basketConfigPDA, true);
    const vaultComponentsBalance = await connection.getTokenAccountBalance(vaultComponentAccount, 'confirmed');
    const executeRebalanceTx = await pieProgram.executeRebalancing(
      admin.publicKey,
      false,
      Number(vaultComponentsBalance.value.amount),
      0,
      tokens[2].ammId,
      basketId,
      new PublicKey(tokens[2].mint),
      raydium
    );
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
    console.log(`Basket config ${basketId.toString()} data: `)
    const basketMintTable = await showBasketConfigTable(connection, pieProgram, basketId);
    basketMintTable.printTable();
  });

  it("Executing rebalance basket by buying component 4", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigPDA = pieProgram.basketConfigPDA(basketId);
    const vaultWrappedSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, basketConfigPDA, true);
    const vaultWrappedSolBalance = await connection.getTokenAccountBalance(vaultWrappedSolAccount);

    const executeRebalanceTx = await pieProgram.executeRebalancing(
      admin.publicKey,
      true,
      Number(vaultWrappedSolBalance.value.amount) / 2,
      20,
      tokens[3].ammId,
      basketId,
      new PublicKey(tokens[3].mint),
      raydium
    );
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

    console.log(`Basket config ${basketId.toString()} data: `)
    const basketMintTable = await showBasketConfigTable(connection, pieProgram, basketId);
    basketMintTable.printTable();
  });

  it("Stop rebalance basket", async () => {
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
      `Stop rebalance at tx: https://explorer.solana.com/tx/${stopRebalanceTxResult}?cluster=devnet`
    );

    const basketConfig = await pieProgram.getBasketConfig(basketId);
    console.log(basketConfig.components)
    assert.equal(basketConfig.isRebalancing, false);
  });
});
