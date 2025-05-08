import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import { isValidTransaction, unwrapSolIx, wrapSOLIx } from "../../utils/helper";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { getOrCreateTokenAccountTx } from "../../utils/helper";

/**
 * Class for handling buy-related instructions
 */
export class UserInstructions extends ProgramStateManager {
  constructor(readonly connection: Connection, readonly programId: PublicKey) {
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
    amount: string;
  }): Promise<Transaction> {
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    const basketConfig = await this.getBasketConfig({ basketId });

    const tx = new Transaction();

    const { tokenAccount: userWsolAccount, tx: createUserWsolAccountTx } =
      await getOrCreateTokenAccountTx(this.connection, NATIVE_MINT, user, user);

    if (isValidTransaction(createUserWsolAccountTx)) {
      tx.add(createUserWsolAccountTx);
    }

    tx.add(...wrapSOLIx(user, Number(amount)));

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
        creatorFeeTokenAccount,
      })
      .transaction();

    tx.add(depositWsolTx);

    return tx;
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
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorFeeTokenAccount,
      })
      .transaction();

    tx.add(withdrawWsolTx);

    tx.add(unwrapSolIx(userWsolAccount, user, user));

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
