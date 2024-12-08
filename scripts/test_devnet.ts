import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  BasketComponent,
  CreateBasketArgs,
  PieProgram,
} from "../sdk/pie-program";
import devnetAdmin from "../public/devnet-admin.json";
import { tokens } from "../tests/utils/token_test";
import { initSdk } from "../tests/utils/config";
import { BN } from "@coral-xyz/anchor";

async function main() {
  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pieProgram = new PieProgram(connection);
  const raydium = await initSdk(connection, "devnet");

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

  let rebalancer = await pieProgram.getRebalancerState(admin.publicKey);
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

  programState = await pieProgram.getProgramState();
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
    {
      skipPreflight: true,
      commitment: "confirmed",
    }
  );

  console.log(
    `Basket created at tx: https://explorer.solana.com/tx/${createBasketTxResult}?cluster=devnet`
  );
  const basketConfigData = await pieProgram.getBasketConfig(basketId);

  const basketDisplay = [];
  for(let i = 0; i < basketConfigData.components.length; i ++) {
    
  }

  for (let i = 0; i < basketConfigData.components.length; i++) {
    const component = basketConfigData.components[i];
    const buyComponentTx = await pieProgram.buyComponent(
      admin.publicKey,
      basketId,
      0.1 * LAMPORTS_PER_SOL,
      20000000,
      raydium,
      tokens[0].ammId
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

  const redeemBasketTokenTx = await pieProgram.redeemBasketToken(
    admin.publicKey,
    basketId,
    1000
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

  const sellComponentTx = await pieProgram.sellComponent(
    admin.publicKey,
    new PublicKey(tokens[1].mint),
    basketId,
    0.1 * LAMPORTS_PER_SOL,
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

  //start rebalancing
  const startRebalancingTx = await pieProgram.startRebalancing(
    admin.publicKey,
    basketId
  );
  if (startRebalancingTx) {
    const startRebalancingTxResult = await sendAndConfirmTransaction(
      connection,
      startRebalancingTx,
      [admin],
      { skipPreflight: true, commitment: "confirmed" }
    );

    console.log(
      `Start rebalancing at tx: https://explorer.solana.com/tx/${startRebalancingTxResult}?cluster=devnet`
    );
  }

  //execute rebalancing
  const executeRebalancingTx = await pieProgram.executeRebalancing(
    admin.publicKey,
    false,
    0.0001 * LAMPORTS_PER_SOL,
    100,
    tokens[2].ammId,
    basketId,
    new PublicKey(tokens[2].mint),
    raydium
  );

  const executeRebalancingTxResult = await sendAndConfirmTransaction(
    connection,
    executeRebalancingTx,
    [admin],
    { skipPreflight: true, commitment: "confirmed" }
  );

  console.log(
    `Execute rebalancing at tx: https://explorer.solana.com/tx/${executeRebalancingTxResult}?cluster=devnet`
  );

  //stop rebalancing
  const stopRebalancingTx = await pieProgram.stopRebalancing(
    admin.publicKey,
    basketId
  );

  const stopRebalancingTxResult = await sendAndConfirmTransaction(
    connection,
    stopRebalancingTx,
    [admin],
    { skipPreflight: true, commitment: "confirmed" }
  );

  console.log(
    `Stop rebalancing at tx: https://explorer.solana.com/tx/${stopRebalancingTxResult}?cluster=devnet`
  );
}

main();
