import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import qaAdmin from "../.config/solana/qa-admin.json";
import qaRebalancer from "../.config/solana/qa-rebalancer.json";
import { assert } from "chai";
import { Table } from "console-table-printer";
import { BasketComponent, BasketConfig, PieProgram } from "../sdk/pie-program";
import {
  Component,
  RebalanceStatus,
} from "../sdk/pie-program/instructions/rebalancer-instructions";
import { QUICKNODE_RPC_URL } from "./constants";
import { getExplorerUrl, sleep } from "../sdk/utils/helper";
import { printBasketComponents } from "../sdk/utils/print";

describe("pie rebalancer", () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(qaAdmin));
  const rebalancer = Keypair.fromSecretKey(new Uint8Array(qaRebalancer));

  const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");
  const pieProgram = new PieProgram({
    connection,
    cluster: "mainnet-beta",
    jitoRpcUrl: QUICKNODE_RPC_URL,
  });

  // Fixed test basket: dev Dolphin
  const basketId = new BN(26);

  async function stopRebalancing(basketCfg: BasketConfig) {
    if (!basketCfg.state.rebalancing) return;
    const stopRebalanceTx = await pieProgram.rebalancer.stopRebalancing({
      rebalancer: rebalancer.publicKey,
      basketId,
    });
    const stopRebalanceSig = await sendAndConfirmTransaction(
      connection,
      stopRebalanceTx,
      [rebalancer]
    );
    console.log(
      `Stop rebalancing at tx: ${getExplorerUrl(stopRebalanceSig, "mainnet")}`
    );
  }

  beforeEach(async () => {
    console.log("set up...");
    const basketCfg = await pieProgram.state.getBasketConfig({ basketId });
    assert.equal(basketCfg.creator.toBase58(), admin.publicKey.toBase58());
    assert.equal(basketCfg.rebalancer.toString(), rebalancer.publicKey.toString());

    await stopRebalancing(basketCfg);
    printBasketComponents(basketCfg);
  });

  afterEach(async () => {
    console.log("tear down...");
    await sleep(3000);

    const basket = await pieProgram.state.getBasketConfig({ basketId });

    await stopRebalancing(basket);
    printBasketComponents(basket);
  });

  const sampleTokenMints = [
    {
      name: "AI16Z",
      mint: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
      decimals: 9,
    },
    {
      name: "PENGU",
      mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
      decimals: 6,
    },
    {
      name: "Bonk",
      mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      decimals: 5,
    },
    {
      name: "Fartcoin",
      mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
      decimals: 6,
    },
  ];

  const swapOption = {
    maxSlippageBps: 1000, // 10%
  };

  it("should complete the entire rebalancing process successfully", async () => {
    // TODO: Dynamic want components. or various test case
    const wantComponents: Component[] = [
      {
        mint: new PublicKey(sampleTokenMints[0].mint),
        quantityInSystem: new BN(40_000),
      },
      {
        mint: new PublicKey(sampleTokenMints[1].mint),
        quantityInSystem: new BN(30_000),
      },
      {
        mint: new PublicKey(sampleTokenMints[2].mint),
        quantityInSystem: new BN(200_000),
      },
      {
        mint: new PublicKey(sampleTokenMints[3].mint),
        quantityInSystem: new BN(10_000),
      },
    ];

    let buildTxArgs = {
      basketId: basketId,
      rebalancer: rebalancer.publicKey,
      command: {
        wantComponents,
      },
      option: swapOption,
      executionContext: "",
      signedTxs: [],
    };
    let result = null;
    do {
      result = await pieProgram.rebalancer.buildNextRebalanceStepTx(
        buildTxArgs
      );

      const basketCfg = await pieProgram.state.getBasketConfig({ basketId });
      // console.log("basket config", basketCfg);
      printBasketComponents(basketCfg);

      console.log(`Rebalance Result`, result);

      // sign
      for (let i = 0; i < result.toSignTxs.length; i++) {
        result.toSignTxs[i].sign([rebalancer]);
      }
      buildTxArgs.signedTxs = result.toSignTxs;
      buildTxArgs.executionContext = result.sessionContext;
    } while (result.toSignTxs.length > 0);

    assert.equal(result.result.status(), RebalanceStatus.SUCCESS);

    const swaps = result.result.swaps();
    // assert.isTrue(swaps.length > 0);

    // const successfulSwaps = swaps.filter((swap) => swap.status === 1); // SUCCESS
    const failedSwaps = swaps.filter((swap) => swap.status === 2); // FAILED
    assert.lengthOf(failedSwaps, 0);
  });
});
