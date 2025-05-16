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
  getTokenPriceAndDecimals,
  isValidTransaction,
  wrapSOLIx,
} from "../../utils/helper";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { getOrCreateTokenAccountTx } from "../../utils/helper";
import { createJupiterSwapIx } from "../../utils/jupiter";
import { JUPITER_PROGRAM_ID } from "../../constants";
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
  }): Promise<Transaction> {
    const tx = new Transaction();

    if (await this.getUserBalance({ user })) {
      return tx;
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
   * @param amount - The amount of component to buy.
   * @returns A promise that resolves to a transaction.
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
          jitoTipAmountInLamports: jitoTipAmountInLamports.toNumber(),
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
    const userBasketTokenAccount = getAssociatedTokenAddressSync(
      basketMint,
      user,
      false
    );
    const burnBasketTokenTx = await this.program.methods
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
    return burnBasketTokenTx;
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
}
