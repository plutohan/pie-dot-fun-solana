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

async function main() {
  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pieProgram = new PieProgram(connection);
  const raydium = await initSdk(connection, "devnet");

  const programState = await pieProgram.getProgramState();
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

  const components: BasketComponent[] = [
    {
      mint: new PublicKey(tokens[0].mint),
      ratio: 1,
    },
    {
      mint: new PublicKey(tokens[1].mint),
      ratio: 2,
    },
    {
      mint: new PublicKey(tokens[2].mint),
      ratio: 3,
    },
  ];

  const createBasketArgs: CreateBasketArgs = {
    name: "Basket Name Test",
    symbol: "BNS",
    uri: "test",
    components: components,
  };

  const { tx, basketMint } = await pieProgram.createBasket(
    admin.publicKey,
    createBasketArgs,
    6
  );

  const createBasketTxResult = await sendAndConfirmTransaction(
    connection,
    tx,
    [admin, basketMint],
    {
      skipPreflight: true,
      commitment: "confirmed",
    }
  );

  console.log(
    `Basket created at tx: https://explorer.solana.com/tx/${createBasketTxResult}?cluster=devnet`
  );

  const basketConfig = pieProgram.basketConfigPDA(basketMint.publicKey);

  const basketConfigData = await pieProgram.getBasketConfig(
    basketMint.publicKey
  );

  for (const component of basketConfigData.components) {
    const buyComponentTx = await pieProgram.buyComponent(
      admin.publicKey,
      basketConfig,
      (component.ratio * LAMPORTS_PER_SOL) / 100,
      0.1 * LAMPORTS_PER_SOL,
      raydium,
      tokens[1].ammId
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
    basketConfig,
    basketMint.publicKey,
    0.01 * 10 ** 6
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

  const burnBasketTokenTx = await pieProgram.burnBasketToken(
    admin.publicKey,
    basketConfig,
    basketMint.publicKey,
    0.01 * 10 ** 6
  );

  const burnBasketTokenTxResult = await sendAndConfirmTransaction(
    connection,
    burnBasketTokenTx,
    [admin],
    {
      skipPreflight: true,
      commitment: "confirmed",
    }
  );

  console.log(
    `Burn basket token at tx: https://explorer.solana.com/tx/${burnBasketTokenTxResult}?cluster=devnet`
  );

  const sellComponentTx = await pieProgram.sellComponent(
    admin.publicKey,
    new PublicKey(tokens[1].mint),
    basketConfig,
    basketMint.publicKey,
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
}

main();
