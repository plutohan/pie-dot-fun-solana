import { BN } from "@coral-xyz/anchor";
import {
  Transaction,
  PublicKey,
  Connection,
  AddressLookupTableAccount,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import {
  getTokenAccountWithTokenProgram,
  getTokenPriceAndDecimals,
  isValidTransaction,
  wrapSOLIx,
} from "../../utils/helper";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import { createJupiterSwapIx } from "../../utils/jupiter";
import { JUPITER_PROGRAM_ID, SYS_DECIMALS } from "../../constants";
import { Jito } from "../../jito";

/**
 * Class for handling buy-related instructions
 */
export class UserInstructions extends ProgramStateManager {
  constructor(
    readonly connection: Connection,
    readonly programId: PublicKey,
    readonly pieDotFunApiUrl: string,
    readonly jito: Jito
  ) {
    super(programId, connection);
  }

  /**
   * Initializes the user balance.
   * @param user - The user account.
   * @returns A promise that resolves to a transaction.
   */
  async initializeUserBalance({
    user,
  }: {
    user: PublicKey;
  }): Promise<Transaction | null> {
    const tx = new Transaction();

    if (await this.getUserBalance({ user })) {
      return null;
    }

    const initializeUserBalanceTx = await this.program.methods
      .initializeUserBalance()
      .accountsPartial({ user })
      .transaction();
    tx.add(initializeUserBalanceTx);
    return tx;
  }

  /**
   * Deposits WSOL into the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of WSOL to deposit.
   * @returns A promise that resolves to a transaction.
   */
  async depositWsol({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const programState = await this.getProgramState();
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    const basketConfig = await this.getBasketConfig({ basketId });

    const tx = new Transaction();

    const { tokenAccount: userWsolAccount, tx: createUserWsolAccountTx } =
      await getOrCreateTokenAccountTx(this.connection, NATIVE_MINT, user, user);

    if (isValidTransaction(createUserWsolAccountTx)) {
      tx.add(createUserWsolAccountTx);
    }

    tx.add(...wrapSOLIx(user, amount));

    const { tokenAccount: vaultWsolAccount, tx: createVaultWsolAccountTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        NATIVE_MINT,
        user,
        basketConfigPDA
      );

    if (isValidTransaction(createVaultWsolAccountTx)) {
      tx.add(createVaultWsolAccountTx);
    }

    const depositWsolTx = await this.program.methods
      .depositWsol(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfigPDA,
        userWsolAccount,
        vaultWsolAccount,
        creatorFeeWallet: basketConfig.creator,
        platformFeeWallet: programState.platformFeeWallet,
      })
      .transaction();

    tx.add(depositWsolTx);

    return tx;
  }

  /**
   * Buys a component using Jupiter.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param outputMint - The mint of the component to buy.
   * @param amount - The amount of component to buy.
   * @param swapMode - The swap mode.
   * @param maxAccounts - The maximum number of accounts to use.
   * @param slippageBps - The slippage in basis points.
   * @param dynamicSlippage - Whether to use dynamic slippage.
   * @returns A promise that resolves to transaction information.
   */
  async buyComponentJupiter({
    user,
    basketId,
    outputMint,
    amount,
    swapMode,
    maxAccounts,
    slippageBps,
    dynamicSlippage,
  }: {
    user: PublicKey;
    basketId: BN;
    outputMint: PublicKey;
    amount: number;
    swapMode: "ExactIn" | "ExactOut";
    maxAccounts?: number;
    slippageBps?: number;
    dynamicSlippage?: boolean;
  }): Promise<{
    buyComponentJupiterTx: Transaction;
    addressLookupTableAccounts: AddressLookupTableAccount[];
    txLength: number;
  }> {
    const tx = new Transaction();

    const basketConfigPDA = this.basketConfigPDA({ basketId });

    const { swapInstructions, addressLookupTableAccounts } =
      await createJupiterSwapIx({
        connection: this.connection,
        inputMint: NATIVE_MINT,
        outputMint,
        amount,
        fromAccount: basketConfigPDA,
        swapMode,
        maxAccounts,
        slippageBps,
        dynamicSlippage,
      });

    const {
      tokenAccount: vaultTokenDestination,
      tx: createVaultTokenDestinationTx,
      tokenProgram: outputTokenProgram,
    } = await getOrCreateTokenAccountTx(
      this.connection,
      outputMint,
      user,
      basketConfigPDA
    );

    if (isValidTransaction(createVaultTokenDestinationTx)) {
      tx.add(createVaultTokenDestinationTx);
    }
    const buyComponentJupiterTx = await this.program.methods
      .buyComponentJupiter(
        Buffer.from(swapInstructions.swapInstruction.data, "base64")
      )
      .accountsPartial({
        user,
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfigPDA,
        vaultTokenDestination: vaultTokenDestination,
        outputTokenProgram,
        jupiterProgram: new PublicKey(JUPITER_PROGRAM_ID),
      })
      .remainingAccounts(
        swapInstructions.swapInstruction.accounts.map((acc) => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: false,
          isWritable: acc.isWritable,
        }))
      )
      .instruction();

    tx.add(buyComponentJupiterTx);

    // calculate tx length
    const message = new TransactionMessage({
      payerKey: user,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [buyComponentJupiterTx],
    }).compileToV0Message(addressLookupTableAccounts);
    const versionedTx = new VersionedTransaction(message);
    const serializedTx = versionedTx.serialize();

    return {
      buyComponentJupiterTx: tx,
      addressLookupTableAccounts,
      txLength: serializedTx.length,
    };
  }

  /**
   * Mints a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
  async mintBasketToken({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    const userFund = this.userFundPDA({ user, basketId });

    const userBalance = await this.getUserBalance({ user });

    if (!userBalance) {
      tx.add(
        await this.initializeUserBalance({
          user,
        })
      );
    }

    const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } =
      await getOrCreateTokenAccountTx(this.connection, basketMint, user, user);
    if (isValidTransaction(userBasketTokenTx)) {
      tx.add(userBasketTokenTx);
    }
    const mintBasketTokenTx = await this.program.methods
      .mintBasketToken()
      .accountsPartial({
        user,
        basketConfig,
        userFund,
        basketMint,
        userBasketTokenAccount,
      })
      .transaction();
    tx.add(mintBasketTokenTx);
    return tx;
  }

  /**
   * Buys a basket
   *
   *
   */
  async buyBasketJitoTxs({
    user,
    basketId,
    amountInLamports,
    jitoTipAmountInLamports,
    slippageBps,
    dynamicSlippage,
    maxAccounts = 20,
  }: {
    user: PublicKey;
    basketId: BN;
    amountInLamports: number;
    jitoTipAmountInLamports?: BN;
    slippageBps?: number;
    dynamicSlippage?: boolean;
    maxAccounts?: number;
  }): Promise<string[]> {
    const basketConfig = await this.getBasketConfig({ basketId });

    const tokenPriceAndDecimals = await Promise.all(
      basketConfig.components.map((component) =>
        getTokenPriceAndDecimals({
          mint: component.mint,
          connection: this.connection,
          pieDotFunApiUrl: this.pieDotFunApiUrl,
        })
      )
    );

    const tokenWeights = basketConfig.components.map((component, index) => {
      return component.quantityInSysDecimal
        .mul(new BN(tokenPriceAndDecimals[index].price.rawAmount))
        .div(new BN(10 ** tokenPriceAndDecimals[index].decimals));
    });

    const totalWeight = tokenWeights.reduce(
      (acc, curr) => acc.add(new BN(curr)),
      new BN(0)
    );

    const inputAmounts = tokenWeights.map((weight) =>
      weight.mul(new BN(amountInLamports)).div(totalWeight)
    );

    // @TODO handle when WSOL is in the components
    const jupiterSwapTxs = await Promise.all(
      basketConfig.components.map((component, index) =>
        this.buyComponentJupiter({
          user,
          basketId,
          outputMint: component.mint,
          amount: inputAmounts[index].toNumber(),
          swapMode: "ExactIn",
          maxAccounts,
          dynamicSlippage,
          slippageBps,
        })
      )
    );

    const jupiterSwapTxsOrdered = jupiterSwapTxs.sort(
      (a, b) => a.txLength - b.txLength
    );

    const recentBlockhash = (await this.connection.getLatestBlockhash())
      .blockhash;

    const serializedTxs: string[] = [];

    // 1. initialize user balance
    // 2. deposit wsol
    // 3. buy components
    // 4. mint basket token
    while (jupiterSwapTxsOrdered.length > 0) {
      console.log("building tx..");
      const tx = new Transaction();
      const lookupTableAccounts = [];
      // @TODO: optimize
      tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_000_000,
        })
      );
      // tx.add(
      //   ComputeBudgetProgram.setComputeUnitPrice({
      //     microLamports: 10000,
      //   })
      // );
      let swap1;
      let swap2;
      if (serializedTxs.length === 0) {
        tx.add(await this.initializeUserBalance({ user }));
        tx.add(
          await this.depositWsol({
            user,
            basketId,
            amount: amountInLamports,
          })
        );
        // @TODO: optimize with LUT
        swap1 = jupiterSwapTxsOrdered.shift();
      } else {
        swap1 = jupiterSwapTxsOrdered.shift();
        swap2 = jupiterSwapTxsOrdered.pop();
      }

      if (swap1) {
        tx.add(swap1.buyComponentJupiterTx);
        lookupTableAccounts.push(...swap1.addressLookupTableAccounts);
      }
      if (swap2) {
        tx.add(swap2.buyComponentJupiterTx);
        lookupTableAccounts.push(...swap2.addressLookupTableAccounts);
      }

      if (jupiterSwapTxsOrdered.length > 0) {
        const serializedTx = await this.jito.serializeJitoTransaction({
          recentBlockhash,
          signer: user,
          transaction: tx,
          lookupTables: lookupTableAccounts,
        });
        serializedTxs.push(serializedTx);
      } else {
        // the last tx
        tx.add(
          await this.mintBasketToken({
            user,
            basketId,
          })
        );
        const jitoTipAccounts = await this.jito.getTipAccounts();
        const randomIndex = Math.floor(Math.random() * jitoTipAccounts.length);
        const jitoTipAccount = jitoTipAccounts[randomIndex];
        const serializedTx = await this.jito.serializeJitoTransaction({
          recentBlockhash,
          signer: user,
          transaction: tx,
          lookupTables: lookupTableAccounts,
          jitoTipAccount: new PublicKey(jitoTipAccount),
          jitoTipAmountInLamports: jitoTipAmountInLamports?.toNumber(),
        });
        serializedTxs.push(serializedTx);
      }
    }

    return serializedTxs;
  }

  /**
   * Withdraws a WSOL from the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
  async withdrawWsol({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    const basketConfig = await this.getBasketConfig({ basketId });
    const programState = await this.getProgramState();
    const tx = new Transaction();
    const { tokenAccount: userWsolAccount, tx: createUserWsolAccountTx } =
      await getOrCreateTokenAccountTx(this.connection, NATIVE_MINT, user, user);

    if (isValidTransaction(createUserWsolAccountTx)) {
      tx.add(createUserWsolAccountTx);
    }

    const {
      tokenAccount: creatorFeeTokenAccount,
      tx: creatorFeeTokenAccountCreationTx,
    } = await getOrCreateTokenAccountTx(
      this.connection,
      NATIVE_MINT,
      user,
      basketConfig.creator
    );

    if (isValidTransaction(creatorFeeTokenAccountCreationTx)) {
      tx.add(creatorFeeTokenAccountCreationTx);
    }

    const withdrawWsolTx = await this.program.methods
      .withdrawWsol()
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfigPDA,
        userWsolAccount,
        platformFeeWallet: programState.platformFeeWallet,
        creatorFeeWallet: basketConfig.creator,
      })
      .transaction();

    tx.add(withdrawWsolTx);
    return tx;
  }

  /**
   * Redeems a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount.
   * @returns A promise that resolves to a transaction.
   */
  async redeemBasketToken({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    console.log(basketMint.toBase58());
    const userBasketTokenAccount = getAssociatedTokenAddressSync(
      basketMint,
      user,
      false
    );
    const redeemBasketTokenTx = await this.program.methods
      .redeemBasketToken(new BN(amount))
      .accountsPartial({
        programState: this.programStatePDA(),
        user,
        basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        basketMint,
        userBasketTokenAccount: userBasketTokenAccount,
      })
      .transaction();
    return redeemBasketTokenTx;
  }

  ///////////////////////////////
  //       DEPRECATED          //
  ///////////////////////////////

  /**
   * Deposits a component into the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of component to deposit.
   * @param mint - The mint of the component.
   * @returns A promise that resolves to a transaction.
   */
  async depositComponent({
    user,
    basketId,
    amount,
    mint,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: string;
    mint: PublicKey;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({ basketId });
    const tx = new Transaction();

    const { tokenAccount: userTokenAccount } = await getOrCreateTokenAccountTx(
      this.connection,
      mint,
      user,
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        mint,
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const depositComponentTx = await this.program.methods
      .depositComponent(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userTokenAccount,
        vaultTokenAccount: outputTokenAccount,
      })
      .transaction();

    tx.add(depositComponentTx);

    return tx;
  }

  /**
   * Withdraws a component from the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of component to withdraw.
   * @param mint - The mint of the component.
   * @returns A promise that resolves to a transaction.
   */
  async withdrawComponent({
    user,
    basketId,
    amount,
    mint,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: string;
    mint: PublicKey;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({ basketId });
    const tx = new Transaction();

    const { tokenAccount: vaultTokenAccount } = await getOrCreateTokenAccountTx(
      this.connection,
      mint,
      user,
      basketConfig
    );

    const { tokenAccount: userTokenAccount, tx: createUserTokenAccountTx } =
      await getOrCreateTokenAccountTx(this.connection, mint, user, user);

    if (isValidTransaction(createUserTokenAccountTx)) {
      tx.add(createUserTokenAccountTx);
    }

    const withdrawComponentTx = await this.program.methods
      .withdrawComponent(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA(),
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userTokenAccount,
        vaultTokenAccount,
      })
      .transaction();

    tx.add(withdrawComponentTx);

    return tx;
  }

  /**
   * Sells a component using Jupiter.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param inputMint - The mint of token to sell.
   * @param outputMint - The mint of token to receive.
   * @param swapMode - The swap mode.
   * @returns A promise that resolves to transaction information.
   */
  async sellComponentJupiter({
    user,
    basketId,
    inputMint,
    outputMint,
    amount,
    swapMode,
    maxAccounts,
    slippageBps,
    dynamicSlippage,
  }: {
    user: PublicKey;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    amount: number;
    swapMode: "ExactIn" | "ExactOut";
    maxAccounts?: number;
    slippageBps?: number;
    dynamicSlippage?: boolean;
  }): Promise<{
    sellComponentJupiterTx: Transaction;
    addressLookupTableAccounts: AddressLookupTableAccount[];
    txLength: number;
  }> {
    const tx = new Transaction();
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    const userFundPDA = this.userFundPDA({ user, basketId });
    const { swapInstructions, addressLookupTableAccounts } =
      await createJupiterSwapIx({
        connection: this.connection,
        inputMint,
        outputMint,
        amount,
        fromAccount: basketConfigPDA,
        swapMode,
        maxAccounts,
        slippageBps,
        dynamicSlippage,
      });

    const { tokenAccount: vaultTokenSource, tokenProgram: inputTokenProgram } =
      await getTokenAccountWithTokenProgram(
        this.connection,
        inputMint,
        basketConfigPDA
      );

    const vaultTokenDestination = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketConfigPDA,
      true
    );

    const sellComponentJupiterIx = await this.program.methods
      .sellComponentJupiter(
        Buffer.from(swapInstructions.swapInstruction.data, "base64")
      )
      .accountsPartial({
        user,
        userFund: userFundPDA,
        basketConfig: basketConfigPDA,
        vaultTokenSource,
        vaultTokenDestination,
        inputTokenProgram,
        jupiterProgram: new PublicKey(JUPITER_PROGRAM_ID),
      })
      .remainingAccounts(
        swapInstructions.swapInstruction.accounts.map((acc) => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: false,
          isWritable: acc.isWritable,
        }))
      )
      .instruction();

    tx.add(sellComponentJupiterIx);

    // Calculate tx length
    const message = new TransactionMessage({
      payerKey: user,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [sellComponentJupiterIx],
    }).compileToV0Message(addressLookupTableAccounts);
    const versionedTx = new VersionedTransaction(message);
    const serializedTx = versionedTx.serialize();

    return {
      sellComponentJupiterTx: tx,
      addressLookupTableAccounts,
      txLength: serializedTx.length,
    };
  }

  /**
   * Sells a basket
   * This function performs the reverse of buyBasketJitoTxs:
   * 1. Redeem basket token
   * 2. Sell components for WSOL
   * 3. Withdraw WSOL
   */
  async sellBasketJitoTxs({
    user,
    basketId,
    amountInRawDecimal,
    jitoTipAmountInLamports,
    slippageBps,
    dynamicSlippage,
    maxAccounts = 20,
  }: {
    user: PublicKey;
    basketId: BN;
    amountInRawDecimal: number;
    jitoTipAmountInLamports?: BN;
    slippageBps?: number;
    dynamicSlippage?: boolean;
    maxAccounts?: number;
  }): Promise<string[]> {
    const basketConfig = await this.getBasketConfig({ basketId });

    // Get current components in the basket
    const components = basketConfig.components;

    const amounts = components.map((component) =>
      component.quantityInSysDecimal
        .mul(new BN(amountInRawDecimal))
        .div(new BN(SYS_DECIMALS))
    );

    // Prepare to sell each component for WSOL using Jupiter
    const jupiterSellTxs = await Promise.all(
      components.map((component, index) =>
        this.sellComponentJupiter({
          user,
          basketId,
          inputMint: component.mint,
          outputMint: NATIVE_MINT,
          amount: amounts[index].toNumber(),
          swapMode: "ExactIn",
          maxAccounts,
          dynamicSlippage,
          slippageBps,
        })
      )
    );

    // Sort transactions by size to optimize batching
    const jupiterSellTxsOrdered = jupiterSellTxs.sort(
      (a, b) => a.txLength - b.txLength
    );

    const recentBlockhash = (await this.connection.getLatestBlockhash())
      .blockhash;
    const jitoTipAccounts = await this.jito.getTipAccounts();
    const randomIndex = Math.floor(Math.random() * jitoTipAccounts.length);
    const jitoTipAccount = jitoTipAccounts[randomIndex];

    const serializedTxs: string[] = [];

    // 1. Redeem basket token
    // 2. Sell components for WSOL
    // 3. Withdraw WSOL

    // First transaction includes redeeming basket token

    while (jupiterSellTxsOrdered.length > 0) {
      console.log("building tx..");
      const tx = new Transaction();
      const lookupTableAccounts = [];
      // @TODO: optimize
      tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_000_000,
        })
      );
      let swap1;
      let swap2;
      if (serializedTxs.length === 0) {
        tx.add(
          await this.redeemBasketToken({
            user,
            basketId,
            amount: amountInRawDecimal,
          })
        );
      }
      swap1 = jupiterSellTxsOrdered.shift();
      swap2 = jupiterSellTxsOrdered.pop();

      if (swap1) {
        tx.add(swap1.sellComponentJupiterTx);
        lookupTableAccounts.push(...swap1.addressLookupTableAccounts);
      }
      if (swap2) {
        tx.add(swap2.sellComponentJupiterTx);
        lookupTableAccounts.push(...swap2.addressLookupTableAccounts);
      }

      if (jupiterSellTxsOrdered.length > 0) {
        const serializedTx = await this.jito.serializeJitoTransaction({
          recentBlockhash,
          signer: user,
          transaction: tx,
          lookupTables: lookupTableAccounts,
        });
        serializedTxs.push(serializedTx);
      } else {
        // the last tx
        if (serializedTxs.length < 5) {
          // @TODO: optimize with lut
          // make separate txs for withdraw wsol
          const serializedTx1 = await this.jito.serializeJitoTransaction({
            recentBlockhash,
            signer: user,
            transaction: tx,
            lookupTables: lookupTableAccounts,
          });
          serializedTxs.push(serializedTx1);

          const serializedTx2 = await this.jito.serializeJitoTransaction({
            recentBlockhash,
            signer: user,
            transaction: await this.withdrawWsol({
              user,
              basketId,
            }),
            lookupTables: lookupTableAccounts,
            jitoTipAccount: new PublicKey(jitoTipAccount),
            jitoTipAmountInLamports: jitoTipAmountInLamports?.toNumber(),
          });
          serializedTxs.push(serializedTx2);
        } else {
          tx.add(
            await this.withdrawWsol({
              user,
              basketId,
            })
          );
          const serializedTx = await this.jito.serializeJitoTransaction({
            recentBlockhash,
            signer: user,
            transaction: tx,
            lookupTables: lookupTableAccounts,
            jitoTipAccount: new PublicKey(jitoTipAccount),
            jitoTipAmountInLamports: jitoTipAmountInLamports?.toNumber(),
          });
          serializedTxs.push(serializedTx);
        }
      }
    }

    return serializedTxs;
  }
}
