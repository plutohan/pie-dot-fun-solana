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
import { tokensAmm, tokensCpmm } from "./fixtures/devnet/token_test";
import { Table } from "console-table-printer";
import { getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import {
  getOrCreateNativeMintATA,
  getOrCreateTokenAccountTx,
  getTokenAccount,
  isValidTransaction,
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

  const pieProgram = new PieProgram({
    connection,
    cluster: "devnet",
    jitoRpcUrl: "",
  });

  beforeEach(async () => {
    await pieProgram.init();
  });

  it("Setup and Initialized if needed", async () => {
    let programState = await pieProgram.state.getProgramState();

    if (!programState) {
      const initializeTx = await pieProgram.admin.initialize({
        initializer: admin.publicKey,
        admin: admin.publicKey,
        creator: admin.publicKey,
        platformFeeWallet: admin.publicKey,
        platformFeePercentage: new BN(100),
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
    programState = await pieProgram.state.getProgramState();

    if (programState.platformFeePercentage.toNumber() == 0) {
      // mint redeem fee 1% and platform fee 0.5%
      const updateFeeTx = await pieProgram.admin.updateFee({
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
      NATIVE_MINT,
      admin.publicKey,
      programState.platformFeeWallet
    );

    if (isValidTransaction(outputTx)) {
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
        await pieProgram.admin.updatePlatformFeeWallet({
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

  it("Create Basket", async () => {
    const components: BasketComponent[] = [
      {
        mint: new PublicKey(tokensAmm[0].mint),
        quantityInSysDecimal: new BN(1 * 10 ** 6),
      },
      {
        mint: new PublicKey(tokensAmm[1].mint),
        quantityInSysDecimal: new BN(2 * 10 ** 6),
      },
      {
        mint: new PublicKey(tokensAmm[2].mint),
        quantityInSysDecimal: new BN(3 * 10 ** 6),
      },
    ];

    const createBasketArgs: CreateBasketArgs = {
      name: "Basket Name Test",
      symbol: "BNS",
      uri: "test",
      components: components,
      rebalancer: admin.publicKey,
    };

    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter;
    const createBasketTx = await pieProgram.creator.createBasket({
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
      NATIVE_MINT,
      admin.publicKey,
      admin.publicKey
    );

    if (isValidTransaction(outputTx)) {
      const createCreatorFeeTokenAccountTxResult =
        await sendAndConfirmTransaction(connection, outputTx, [admin], {
          skipPreflight: true,
          commitment: "confirmed",
        });
      console.log(
        `Creator fee token account created at tx: https://explorer.solana.com/tx/${createCreatorFeeTokenAccountTxResult}?cluster=devnet`
      );
    }

    const basket = await pieProgram.state.getBasketConfig({ basketId });
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

  it("Buy Component", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.state.getBasketConfig({
      basketId,
    });
    const totalSolTobuy = 4 * LAMPORTS_PER_SOL;

    const tx = new Transaction();
    const { tokenAccount: nativeMintAta, tx: nativeMintAtaTx } =
      await getOrCreateNativeMintATA(
        connection,
        admin.publicKey,
        admin.publicKey
      );

    if (isValidTransaction(nativeMintAtaTx)) {
      tx.add(nativeMintAtaTx);
    }

    const wrapSolIx = wrapSOLInstruction(admin.publicKey, totalSolTobuy);
    tx.add(...wrapSolIx);

    await sendAndConfirmTransaction(connection, tx, [admin], {
      skipPreflight: true,
      commitment: "confirmed",
    });

    for (let i = 0; i < basketConfigData.components.length; i++) {
      let txs = new Transaction();
      if (i == basketConfigData.components.length - 1) {
        txs.add(
          await pieProgram.buy.buyComponent({
            userSourceOwner: admin.publicKey,
            basketId,
            maxAmountIn: 1 * LAMPORTS_PER_SOL,
            amountOut: (1 + i) * 10 ** 6,
            ammId: tokensAmm[i].ammId,
            unwrapSol: true,
          })
        );
      } else {
        txs.add(
          await pieProgram.buy.buyComponent({
            userSourceOwner: admin.publicKey,
            basketId,
            maxAmountIn: 1 * LAMPORTS_PER_SOL,
            amountOut: (1 + i) * 10 ** 6,
            ammId: tokensAmm[i].ammId,
            unwrapSol: false,
          })
        );
      }
      const buyComponentTxResult = await sendAndConfirmTransaction(
        connection,
        txs,
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
    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable.printTable();
  });

  it("Mint Basket", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    console.log(
      JSON.stringify(
        await pieProgram.state.getUserFund({
          user: admin.publicKey,
          basketId,
        }),
        null,
        2
      )
    );
    const mintBasketTokenTx = await pieProgram.buy.mintBasketToken({
      user: admin.publicKey,
      basketId,
      amount: "1000000",
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

    console.log(
      JSON.stringify(
        await pieProgram.state.getUserFund({
          user: admin.publicKey,
          basketId,
        }),
        null,
        2
      )
    );
    const userFundTable = await showUserFundTable(
      pieProgram,
      admin.publicKey,
      basketId
    );
    userFundTable?.printTable();
  });

  it("Redeem Basket Token", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const redeemBasketTokenTx = await pieProgram.sell.redeemBasketToken({
      user: admin.publicKey,
      basketId,
      amount: 1000000,
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

  it("Sell Component", async () => {
    const programState = await pieProgram.state.getProgramState();
    const basketId = programState.basketCounter.sub(new BN(1));
    const basketConfigData = await pieProgram.state.getBasketConfig({
      basketId,
    });

    for (let i = 0; i < basketConfigData.components.length; i++) {
      let txs = new Transaction();
      if (i == 0) {
        txs.add(
          await pieProgram.sell.sellComponent({
            user: admin.publicKey,
            inputMint: basketConfigData.components[i].mint,
            basketId,
            amountIn: (1 + i) * 10 ** 6,
            minimumAmountOut: 0,
            ammId: tokensAmm[i].ammId,
            createNativeMintATA: true,
          })
        );
      } else {
        txs.add(
          await pieProgram.sell.sellComponent({
            user: admin.publicKey,
            inputMint: basketConfigData.components[i].mint,
            basketId,
            amountIn: (1 + i) * 10 ** 6,
            minimumAmountOut: 0,
            ammId: tokensAmm[i].ammId,
            createNativeMintATA: true,
          })
        );
      }
      const sellComponentTxResult = await sendAndConfirmTransaction(
        connection,
        txs,
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
      userFundTable?.printTable();
    }
  });
});
