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
import { tokensAmm } from "./fixtures/devnet/token_test";
import { Table } from "console-table-printer";
import { getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import {
  getOrCreateNativeMintATA,
  getOrCreateTokenAccountTx,
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

    if (programState) {
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

      if (outputTx) {
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
      {
        mint: new PublicKey(tokensAmm[3].mint),
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

    const programState = await pieProgram.getProgramState();
    const basketId = programState!.basketCounter;
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

    if (outputTx) {
      const createCreatorFeeTokenAccountTxResult =
        await sendAndConfirmTransaction(connection, outputTx, [admin], {
          skipPreflight: true,
          commitment: "confirmed",
        });
      console.log(
        `Creator fee token account created at tx: https://explorer.solana.com/tx/${createCreatorFeeTokenAccountTxResult}?cluster=devnet`
      );
    }

    let newLookupTable = new PublicKey("");

    for (let i = 0; i < createBasketArgs.components.length; i++) {
      newLookupTable = await pieProgram.addRaydiumAmmToAddressLookupTable({
        connection,
        signer: admin,
        ammId: tokensAmm[i].ammId!,
        lookupTable: newLookupTable,
      });
    }

    if (!addressLookupTableMap.has(basketId.toString())) {
      addressLookupTableMap.set(basketId.toString(), newLookupTable);
    }
    const basket = await pieProgram.getBasketConfig({ basketId });
    if (basket) {
      assert.equal(
        basket.components.length,
        createBasketArgs.components.length
      );
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
    }
  });

  it("Buy Component AMM", async () => {
    const programState = await pieProgram.getProgramState();
    if (programState) {
      const basketId = programState.basketCounter.sub(new BN(1));
      const basketConfigData = await pieProgram.getBasketConfig({ basketId });
      const totalSolTobuy = 4 * LAMPORTS_PER_SOL;
      const tx = new Transaction();
      const { tx: createNativeMintTx } = await getOrCreateNativeMintATA(
        connection,
        admin.publicKey,
        admin.publicKey
      );
      if (createNativeMintTx) {
        tx.add(createNativeMintTx);
      }

      const wrappedSolIx = wrapSOLInstruction(admin.publicKey, totalSolTobuy);
      tx.add(...wrappedSolIx);
      const amountToBuy = 2_000_000;

      await sendAndConfirmTransaction(connection, tx, [admin], {
        skipPreflight: true,
        commitment: "confirmed",
      });

      if (basketConfigData) {
        for (let i = 0; i < basketConfigData.components.length; i++) {
          let txs = new Transaction();
          if (i == basketConfigData.components.length) {
            txs.add(
              await pieProgram.buyComponent({
                userSourceOwner: admin.publicKey,
                basketId,
                maxAmountIn: 1 * LAMPORTS_PER_SOL,
                amountOut: amountToBuy,
                ammId: tokensAmm[i].ammId!,
                unwrapSol: true,
              })
            );
          } else {
            txs.add(
              await pieProgram.buyComponent({
                userSourceOwner: admin.publicKey,
                basketId,
                maxAmountIn: 1 * LAMPORTS_PER_SOL,
                amountOut: amountToBuy,
                ammId: tokensAmm[i].ammId!,
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
      }
      const userFundTable = await showUserFundTable(
        pieProgram,
        admin.publicKey,
        basketId
      );
      userFundTable.printTable();
    }
  });

  it("Buy Component Using look up table", async () => {
    const programState = await pieProgram.getProgramState();
    if (programState) {
      const basketId = programState.basketCounter.sub(new BN(1));
      const basketConfigData = await pieProgram.getBasketConfig({ basketId });
      if (basketConfigData) {
        const amountToBuy = 2_000_000;

        let addressLookupTable: PublicKey | undefined;
        const addressLookupTablesAccount: AddressLookupTableAccount[] = [];
        const totalSolTobuy = 4 * LAMPORTS_PER_SOL;
        const tx = new Transaction();
        const { tokenAccount: nativeMintAta, tx: createNativeMintTx } =
          await getOrCreateNativeMintATA(
            connection,
            admin.publicKey,
            admin.publicKey
          );
        if (createNativeMintTx) {
          tx.add(createNativeMintTx);
        }
        const wrappedSolIx = wrapSOLInstruction(admin.publicKey, totalSolTobuy);
        tx.add(...wrappedSolIx);

        for (let i = 0; i < basketConfigData.components.length; i++) {
          const buyComponentTx = await pieProgram.buyComponent({
            userSourceOwner: admin.publicKey,
            basketId,
            maxAmountIn: 1 * LAMPORTS_PER_SOL,
            amountOut: amountToBuy,
            ammId: tokensAmm[i].ammId!,
            unwrapSol: false,
          });
          tx.add(buyComponentTx);
        }
        console.log("tx.instruciton: ", tx.instructions);
        if (addressLookupTableMap.has(basketId.toString())) {
          addressLookupTable = addressLookupTableMap.get(basketId.toString());
          if (addressLookupTable) {
            const lut = (
              await connection.getAddressLookupTable(addressLookupTable)
            ).value;
            if (lut) {
              addressLookupTablesAccount.push(lut);
            }
          }
        }

        tx.add(unwrapSolIx(nativeMintAta, admin.publicKey, admin.publicKey));
        console.log("addressLookupTablesAccount; ", addressLookupTablesAccount);
        await finalizeTransaction(
          connection,
          admin,
          tx,
          addressLookupTablesAccount
        );

        const userFund = await pieProgram.getUserFund({
          user: admin.publicKey,
          basketId,
        });

        const table = new Table({
          columns: [
            { name: "mint", alignment: "left", color: "cyan" },
            { name: "amount", alignment: "right", color: "green" },
          ],
        });

        if (userFund) {
          for (let i = 0; i < userFund.components.length; i++) {
            let component = userFund.components[i];
            table.addRow({
              mint: component.mint.toBase58(),
              amount: component.amount.toString(),
            });
          }
          table.printTable();
        }
      }
    }
  });

  // it("Mint Basket", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));

  //   const mintBasketTokenTx = await pieProgram.mintBasketToken({
  //     user: admin.publicKey,
  //     basketId,
  //     amount: 4,
  //   });

  //   const mintBasketTokenTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     mintBasketTokenTx,
  //     [admin],
  //     {
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     }
  //   );

  //   console.log(
  //     `Mint basket token at tx: https://explorer.solana.com/tx/${mintBasketTokenTxResult}?cluster=devnet`
  //   );

  //   console.log("User fund after mint basket: ");
  //   const userFundTable = await showUserFundTable(
  //     pieProgram,
  //     admin.publicKey,
  //     basketId
  //   );
  //   userFundTable.printTable();
  // });

  // it("Redeem Basket Token", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const redeemBasketTokenTx = await pieProgram.redeemBasketToken({
  //     user: admin.publicKey,
  //     basketId,
  //     amount: 2,
  //   });

  //   const redeemBasketTokenTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     redeemBasketTokenTx,
  //     [admin],
  //     {
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     }
  //   );

  //   console.log(
  //     `Redeem basket token at tx: https://explorer.solana.com/tx/${redeemBasketTokenTxResult}?cluster=devnet`
  //   );
  //   console.log("User fund after redeem basket: ");
  //   const userFundTable = await showUserFundTable(
  //     pieProgram,
  //     admin.publicKey,
  //     basketId
  //   );
  //   userFundTable.printTable();
  // });

  // it("Sell Component", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const sellComponentTx = await pieProgram.sellComponent({
  //     user: admin.publicKey,
  //     inputMint: new PublicKey(tokens[1].mint),
  //     basketId,
  //     amountIn: 10 * 1000000,
  //     minimumAmountOut: 0,
  //     raydium,
  //     ammId: tokens[1].ammId,
  //     createNativeMintATA: true,
  //   });

  //   const sellComponentTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     sellComponentTx,
  //     [admin],
  //     {
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     }
  //   );

  //   console.log(
  //     `Sell component at tx: https://explorer.solana.com/tx/${sellComponentTxResult}?cluster=devnet`
  //   );

  //   console.log("User fund after sell component basket: ");
  //   const userFundTable = await showUserFundTable(
  //     pieProgram,
  //     admin.publicKey,
  //     basketId
  //   );
  //   userFundTable.printTable();
  // });

  // it("Sell component using lookup table", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const userFund = await pieProgram.getUserFund(admin.publicKey, basketId);
  //   let addressLookupTable: PublicKey;
  //   const addressLookupTablesAccount: AddressLookupTableAccount[] = [];

  //   const tx = new Transaction();
  //   for (let i = 0; i < userFund.components.length; i++) {
  //     const sellComponentTx = await pieProgram.sellComponent({
  //       user: admin.publicKey,
  //       inputMint: userFund.components[i].mint,
  //       basketId,
  //       amountIn: userFund.components[i].amount.toNumber(),
  //       minimumAmountOut: 0,
  //       raydium,
  //       ammId: tokens[i].ammId,
  //       createNativeMintATA: true,
  //     });
  //     tx.add(sellComponentTx);
  //   }

  //   if (addressLookupTableMap.has(basketId.toString())) {
  //     addressLookupTable = addressLookupTableMap.get(basketId.toString());
  //     const lut = (await connection.getAddressLookupTable(addressLookupTable))
  //       .value;
  //     addressLookupTablesAccount.push(lut);
  //   }

  //   await finalizeTransaction(
  //     connection,
  //     admin,
  //     tx,
  //     addressLookupTablesAccount
  //   );

  //   const userFundAfter = await pieProgram.getUserFund(
  //     admin.publicKey,
  //     basketId
  //   );

  //   const table = new Table({
  //     columns: [
  //       { name: "mint", alignment: "left", color: "cyan" },
  //       { name: "amount", alignment: "right", color: "green" },
  //     ],
  //   });

  //   for (let i = 0; i < userFundAfter.components.length; i++) {
  //     let component = userFundAfter.components[i];
  //     table.addRow({
  //       mint: component.mint.toBase58(),
  //       amount: component.amount.toString(),
  //     });
  //   }
  //   table.printTable();
  // });

  // // it("Sell Component CPMM", async () => {
  // //   const programState = await pieProgram.getProgramState();
  // //   const basketId = programState.basketCounter.sub(new BN(1));
  // //   const sellComponentTx = await pieProgram.sellComponentCpmm(
  // //     admin.publicKey,
  // //     basketId,
  // //     new PublicKey(tokensCpmm[0].mint),
  // //     10 * 1000000,
  // //     0,
  // //     raydium,
  // //     tokensCpmm[0].poolId,
  // //     true
  // //   );

  // //   const sellComponentTxResult = await sendAndConfirmTransaction(
  // //     connection,
  // //     sellComponentTx,
  // //     [admin],
  // //     {
  // //       skipPreflight: true,
  // //       commitment: "confirmed",
  // //     }
  // //   );

  // //   console.log(
  // //     `Sell component at tx: https://explorer.solana.com/tx/${sellComponentTxResult}?cluster=devnet`
  // //   );

  // //   console.log("User fund after sell component basket: ");
  // //   const userFundTable = await showUserFundTable(
  // //     pieProgram,
  // //     admin.publicKey,
  // //     basketId
  // //   );
  // //   userFundTable.printTable();
  // // });

  // it("Start rebalance basket", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const startRebalanceTx = await pieProgram.startRebalancing(
  //     admin.publicKey,
  //     basketId
  //   );
  //   const startRebalanceTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     startRebalanceTx,
  //     [admin],
  //     {
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     }
  //   );

  //   console.log(
  //     `Start rebalance at tx: https://explorer.solana.com/tx/${startRebalanceTxResult}?cluster=devnet`
  //   );

  //   const basketMintTable = await showBasketConfigTable(
  //     connection,
  //     pieProgram,
  //     basketId
  //   );
  //   basketMintTable.printTable();
  // });

  // it("Executing rebalance basket by selling the first component", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const basketConfigPDA = pieProgram.basketConfigPDA(basketId);
  //   const basketConfigData = await pieProgram.getBasketConfig(basketId);
  //   const component = basketConfigData.components[0];

  //   const vaultComponentAccount = await getAssociatedTokenAddress(
  //     component.mint,
  //     basketConfigPDA,
  //     true
  //   );

  //   const vaultComponentsBalance = await connection.getTokenAccountBalance(
  //     vaultComponentAccount,
  //     "confirmed"
  //   );

  //   const executeRebalanceTx = await pieProgram.executeRebalancing(
  //     admin.publicKey,
  //     false,
  //     vaultComponentsBalance.value.amount,
  //     "0",
  //     tokens[0].ammId,
  //     basketId,
  //     new PublicKey(tokens[0].mint),
  //     raydium
  //   );

  //   const executeRebalanceTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     executeRebalanceTx,
  //     [admin],
  //     {
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     }
  //   );

  //   console.log(
  //     `Executing rebalance at tx: https://explorer.solana.com/tx/${executeRebalanceTxResult}?cluster=devnet`
  //   );
  //   console.log(`Basket config ${basketId.toString()} data: `);
  //   const basketMintTable = await showBasketConfigTable(
  //     connection,
  //     pieProgram,
  //     basketId
  //   );
  //   basketMintTable.printTable();
  // });

  // it("Executing rebalance basket by buying component 5", async () => {
  //   const isSwapBaseOut = true;
  //   const newBasketBuy = tokens[5];
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const basketConfigPDA = pieProgram.basketConfigPDA(basketId);
  //   const vaultWrappedSolAccount = await getAssociatedTokenAddress(
  //     NATIVE_MINT,
  //     basketConfigPDA,
  //     true
  //   );
  //   const vaultWrappedSolBalance = await connection.getTokenAccountBalance(
  //     vaultWrappedSolAccount
  //   );

  //   const executeRebalanceTx = await pieProgram.executeRebalancing(
  //     admin.publicKey,
  //     isSwapBaseOut,
  //     new BN(vaultWrappedSolBalance.value.amount).div(new BN(2)).toString(),
  //     "20",
  //     newBasketBuy.ammId,
  //     basketId,
  //     new PublicKey(newBasketBuy.mint),
  //     raydium
  //   );

  //   const executeRebalanceTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     executeRebalanceTx,
  //     [admin],
  //     {
  //       skipPreflight: false,
  //       commitment: "confirmed",
  //     }
  //   );

  //   //add basket info to lookup table when buy new basket token to config
  //   if (isSwapBaseOut) {
  //     const lookupTable = addressLookupTableMap.get(basketId.toString());

  //     await pieProgram.addBasketInfoToAddressLookupTable(
  //       raydium,
  //       connection,
  //       admin,
  //       newBasketBuy.ammId,
  //       basketId,
  //       lookupTable
  //     );
  //   }

  //   console.log(
  //     `Executing rebalance at tx: https://explorer.solana.com/tx/${executeRebalanceTxResult}?cluster=devnet`
  //   );
  //   console.log(`Basket config ${basketId.toString()} data: `);
  //   const basketMintTable = await showBasketConfigTable(
  //     connection,
  //     pieProgram,
  //     basketId
  //   );
  //   basketMintTable.printTable();
  // });

  // it("Stop rebalance basket", async () => {
  //   const programState = await pieProgram.getProgramState();
  //   const basketId = programState.basketCounter.sub(new BN(1));
  //   const basketPDA = pieProgram.basketConfigPDA(basketId);
  //   const { tokenAccount: nativeAta, tx: txs } = await getOrCreateNativeMintATA(
  //     connection,
  //     admin.publicKey,
  //     basketPDA
  //   );
  //   const stopRebalanceTx = await pieProgram.stopRebalancing(
  //     admin.publicKey,
  //     basketId
  //   );
  //   txs.add(stopRebalanceTx);
  //   const stopRebalanceTxResult = await sendAndConfirmTransaction(
  //     connection,
  //     txs,
  //     [admin],
  //     {
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     }
  //   );
  //   console.log(
  //     `Stop rebalance at tx: https://explorer.solana.com/tx/${stopRebalanceTxResult}?cluster=devnet`
  //   );

  //   const basketConfig = await pieProgram.getBasketConfig(basketId);
  //   assert.equal(basketConfig.isRebalancing, false);
  // });
});
