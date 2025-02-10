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
import { Raydium } from "@raydium-io/raydium-sdk-v2";
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
} from "../sdk/utils/helper";
import {
  addAddressesToTable,
  finalizeTransaction,
} from "../sdk/utils/lookupTable";
import { tokensClmm } from "./fixtures/devnet/token_test";

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
      // platform fee 5% and creator fee 5%
      const updateFeeTx = await pieProgram.updateFee({
        admin: admin.publicKey,
        newCreatorFeePercentage: 500,
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

  it("Create Basket CLMM", async () => {
    const components: BasketComponent[] = [
      {
        mint: new PublicKey(tokensClmm[0].mint),
        quantityInSysDecimal: new BN(1 * 10 ** 6),
      },
    ];

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket Name Test",
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
    //create vault token account
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
      //create creator fee token account if needed
      const { tx: createVaultTokenAccountTx } = await getOrCreateTokenAccountTx(
        connection,
        new PublicKey(component.mint),
        admin.publicKey,
        pieProgram.basketConfigPDA({ basketId })
      );

      if (outputTx.signatures.length !== 0) {
        const createCreatorFeeTokenAccountTxResult =
          await sendAndConfirmTransaction(
            connection,
            createVaultTokenAccountTx,
            [admin],
            {
              skipPreflight: true,
              commitment: "confirmed",
            }
          );
        console.log(
          `Creator fee token account created at tx: https://explorer.solana.com/tx/${createCreatorFeeTokenAccountTxResult}?cluster=devnet`
        );
      }
      table.addRow({
        mint: component.mint.toBase58(),
        quantity: component.quantityInSysDecimal.toString(),
      });
    }
    table.printTable();
  });

  it("Buy Component CLMM", async () => {
    const programState = await pieProgram.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.getBasketConfig({ basketId });

    const tx = new Transaction();

    const { tokenAccount: nativeMintAta, tx: wrappedSolIx } =
      await getOrCreateNativeMintATA(
        connection,
        admin.publicKey,
        admin.publicKey
      );

    tx.add(wrappedSolIx);

    for (let i = 0; i < basketConfigData.components.length; i++) {
      const buyComponentTx = await pieProgram.buyComponentClmm({
        user: admin.publicKey,
        basketId,
        amountOut: new BN(200000000),
        outputMint: new PublicKey(tokensClmm[i].mint),
        poolId: tokensClmm[i].poolId,
        slippage: 100,
      });

      tx.add(buyComponentTx);
    }
    const buyComponentTxResult = await sendAndConfirmTransaction(
      connection,
      tx,
      [admin],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );

    console.log(
      `Buy component CLMM at tx: https://explorer.solana.com/tx/${buyComponentTxResult}?cluster=devnet`
    );

    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable.printTable();
  });

  // it("Sell Component CLMM", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const basketConfigData = await pieProgram.getBasketConfig({ basketId });
  //   for (let i = 0; i < basketConfigData.components.length; i++) {
  //     const sellComponentClmmTx = await pieProgram.sellComponentClmm({
  //       user: admin.publicKey,
  //       basketId,
  //       amountIn: new BN(20000),
  //       inputMint: new PublicKey(tokensClmm[i].mint),
  //       poolId: tokensClmm[i].poolId,
  //       unwrappedSol: false,
  //     });

  //     const sellComponentClmmTxResult = await sendAndConfirmTransaction(
  //       connection,
  //       sellComponentClmmTx,
  //       [admin],
  //       {
  //         skipPreflight: true,
  //         commitment: "confirmed",
  //       }
  //     );

  //     console.log(
  //       `Sell component CLMM at tx: https://explorer.solana.com/tx/${sellComponentClmmTxResult}?cluster=devnet`
  //     );
  //   }
  //   const userFundTable = await showUserFundTable(
  //     pieProgram,
  //     admin.publicKey,
  //     basketId
  //   );
  //   userFundTable.printTable();
  // });
});
