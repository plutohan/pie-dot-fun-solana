import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import {
  getOrCreateTokenAccountTx,
  isValidTransaction,
} from "../../utils/helper";
import { NATIVE_MINT } from "@solana/spl-token";
import { ProgramStateManager } from "../state";

/**
 * Class for handling admin-related instructions
 */
export class AdminInstructions extends ProgramStateManager {
  constructor(readonly connection: Connection, readonly programId: PublicKey) {
    super(programId, connection);
  }

  /**
   * Initializes the program.
   * @param admin - The admin account.
   * @returns A promise that resolves to a transaction.
   */
  async initialize({
    initializer,
    admin,
    platformFeeWallet,
    platformFeePercentage,
    basketCreationFee,
  }: {
    initializer: PublicKey;
    admin: PublicKey;
    platformFeeWallet: PublicKey;
    platformFeePercentage: BN;
    basketCreationFee: BN;
  }): Promise<Transaction> {
    const tx = await this.program.methods
      .initialize(
        admin,
        platformFeeWallet,
        platformFeePercentage,
        basketCreationFee
      )
      .accounts({ initializer })
      .transaction();

    const { tx: createPlatformFeeTokenAccountTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(NATIVE_MINT),
        initializer,
        platformFeeWallet
      );

    if (isValidTransaction(createPlatformFeeTokenAccountTx)) {
      tx.add(createPlatformFeeTokenAccountTx);
    }

    return tx;
  }

  /**
   * Update admin account
   */
  async updateAdmin({
    admin,
    newAdmin,
  }: {
    admin: PublicKey;
    newAdmin: PublicKey;
  }): Promise<Transaction> {
    return await this.program.methods
      .updateAdmin(newAdmin)
      .accounts({ admin })
      .transaction();
  }

  /**
   * Updates the fee. 10000 = 100% => 1000 = 1%
   * @param admin - The admin account.
   * @param newBasketCreationFee - The new basket creation fee in lamports.
   * @param newPlatformFeeBp - The new platform fee in basis points.
   * @returns A promise that resolves to a transaction.
   */
  async updateFee({
    admin,
    newBasketCreationFee,
    newPlatformFeeBp,
  }: {
    admin: PublicKey;
    newBasketCreationFee: number;
    newPlatformFeeBp: number;
  }): Promise<Transaction> {
    return await this.program.methods
      .updateFee(new BN(newBasketCreationFee), new BN(newPlatformFeeBp))
      .accountsPartial({
        admin,
        programState: this.programStatePDA(),
      })
      .transaction();
  }

  /**
   * Updates the platform fee wallet.
   * @param admin - The admin account.
   * @param newPlatformFeeWallet - The new platform fee wallet.
   * @returns A promise that resolves to a transaction.
   */
  async updatePlatformFeeWallet({
    admin,
    newPlatformFeeWallet,
  }: {
    admin: PublicKey;
    newPlatformFeeWallet: PublicKey;
  }): Promise<Transaction> {
    return await this.program.methods
      .updatePlatformFeeWallet(newPlatformFeeWallet)
      .accountsPartial({ admin, programState: this.programStatePDA() })
      .transaction();
  }

  /**
   * Migrates a basket to a new version.
   * @param admin - The admin account.
   * @param basketId - The basket ID to migrate.
   * @returns A promise that resolves to a transaction.
   */
  async migrateBasket({
    admin,
    basketId,
  }: {
    admin: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    return this.program.methods
      .migrateBasket()
      .accountsPartial({
        admin,
        programState: this.programStatePDA(),
        basketConfig: this.basketConfigPDA({ basketId }),
      })
      .transaction();
  }
}
