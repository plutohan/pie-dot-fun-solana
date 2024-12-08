import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Pie } from "../target/types/pie";
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
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

function sleep(s: number) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

describe("pie", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pieProgram = new PieProgram(connection);
  let raydium: Raydium;

  it("Setup and Initialized if needed ", async () => {
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
    raydium = await initSdk(connection, "devnet");
  });

  it("Create Rebalancer if needed", async () => {
    const rebalancer = await pieProgram.getRebalancerState(admin.publicKey);
    if (!rebalancer) {
      const createRebalancerTx = await pieProgram.addRebalancer(
        admin.publicKey,
        admin.publicKey
      );
      const createRebalancerTxResult = await sendAndConfirmTransaction(
        connection,
        createRebalancerTx,
        [admin],
        { skipPreflight: true, commitment: "confirmed" }
      );
      console.log(
        `Rebalancer created at tx: https://explorer.solana.com/tx/${createRebalancerTxResult}?cluster=devnet`
      );
    }
  });

  it("Create Basket", async () => {
    const components: BasketComponent[] = [
      {
        mint: new PublicKey(tokens[0].mint),
        ratio: new BN(1),
      },
      {
        mint: new PublicKey(tokens[1].mint),
        ratio: new BN(2),
      },
      {
        mint: new PublicKey(tokens[2].mint),
        ratio: new BN(3),
      },
    ];

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket Name Test",
      symbol: "BNS",
      uri: "test",
      components: components,
      decimals: 6,
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
        0.1 * LAMPORTS_PER_SOL,
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
      1000
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

    const totalSupply = await connection.getTokenSupply(
      pieProgram.basketMintPDA(basketId)
    );
    console.log("totalSupply: ", totalSupply.value.amount);
  });

  it("Redeem Basket Token", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const redeemBasketTokenTx = await pieProgram.redeemBasketToken(
      admin.publicKey,
      basketId,
      100
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

    const basketConfig = await pieProgram.getBasketConfig(basketId);
    assert.equal(basketConfig.isRebalancing, true);
    const table = new Table({
      columns: [
        { name: "mint", alignment: "left", color: "cyan" },
        { name: "balance", alignment: "right", color: "green" },
        { name: "ratio", alignment: "right", color: "yellow" },
      ],
    });

    for (let i = 0; i < basketConfig.components.length; i++) {
      const vaultTokenPDA = getAssociatedTokenAddressSync(
        basketConfig.components[i].mint,
        pieProgram.basketConfigPDA(basketId),
        true
      );
      const balance = await connection.getTokenAccountBalance(vaultTokenPDA);

      let component = basketConfig.components[i];
      table.addRow({
        mint: component.mint.toBase58(),
        balance: balance.value.amount,
        ratio: component.ratio.toString(),
      });
    }
    table.printTable();
  });

  it("Executing rebalance basket", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const totalSupply = await connection.getTokenSupply(
      pieProgram.basketMintPDA(basketId)
    );
    console.log("totalSupply: ", totalSupply.value.amount);
    const executeRebalanceTx = await pieProgram.executeRebalancing(
      admin.publicKey,
      false,
      0.1 * 1000000,
      0,
      tokens[1].ammId,
      basketId,
      new PublicKey(tokens[1].mint),
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

    const basketConfig = await pieProgram.getBasketConfig(basketId);
    const table = new Table({
      columns: [
        { name: "mint", alignment: "left", color: "cyan" },
        { name: "balance", alignment: "right", color: "green" },
        { name: "ratio", alignment: "right", color: "yellow" },
      ],
    });

    for (let i = 0; i < basketConfig.components.length; i++) {
      const vaultTokenPDA = getAssociatedTokenAddressSync(
        basketConfig.components[i].mint,
        pieProgram.basketConfigPDA(basketId),
        true
      );
      const balance = await connection.getTokenAccountBalance(vaultTokenPDA);

      let component = basketConfig.components[i];
      table.addRow({
        mint: component.mint.toBase58(),
        balance: balance.value.amount,
        ratio: component.ratio.toString(),
      });
    }
    table.printTable();
  });

  
});
