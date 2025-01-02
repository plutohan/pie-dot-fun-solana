import { BN } from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import { PieProgram } from "../sdk/pie-program";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { initSdk } from "./utils/config";
import { showBasketVaultsTable } from "./utils/helper";

describe("pie example code for server", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pieProgram = new PieProgram(connection);
  let raydium: Raydium;

  beforeEach(async () => {
    //init raydium
    raydium = await initSdk(connection, "devnet");
  });

  it("Query Current Basket Vaults", async () => {
    const programState = await pieProgram.getProgramState();

    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfig = await pieProgram.getBasketConfig(basketId);
    console.log({ basketConfig });

    const basketVaults = await pieProgram.getBasketVaults(basketId);

    const basketVaultsTable = await showBasketVaultsTable(basketVaults);
    basketVaultsTable.printTable();
  });

  it("Rebalance using builder", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfig = await pieProgram.getBasketConfig(basketId);
    const basketVaults = await pieProgram.getBasketVaults(basketId);

    const serializedTxs = await pieProgram.buildRebalanceTx({
      basketId,
      rebalancer: admin, // keypair
      swaps: [
        {
          mint: basketVaults[2].mint,
          isSwapBaseOut: false,
          amountIn: basketVaults[2].balance / 2, // amount to sell
          amountOut: 0, // min output
        },
        {
          mint: basketVaults[3].mint,
          isSwapBaseOut: true,
          amountIn: basketVaults[0].balance, // Max Input : vault's SOL balance
          amountOut: 100, // amount to buy
        },
      ],
      withStartRebalance: !basketConfig.isRebalancing,
      withStopRebalance: true,
      raydium,
    });

    // sending the serialized txs
    for (const tx of serializedTxs) {
      const res = await sendAndConfirmRawTransaction(
        connection,
        Buffer.from(tx),
        {
          skipPreflight: false,
          commitment: "confirmed",
        }
      );

      console.log(
        `Start rebalance at tx: https://solscan.io/tx/${res}?cluster=devnet`
      );

      console.log(`===========  after rebalance =============`);
      let basketVaultsAfter = await pieProgram.getBasketVaults(basketId);
      const basketVaultsTableAfter = await showBasketVaultsTable(
        basketVaultsAfter
      );
      basketVaultsTableAfter.printTable();
    }
  });
});
