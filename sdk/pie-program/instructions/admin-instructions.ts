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
    creator,
    platformFeeWallet,
    platformFeePercentage,
  }: {
    initializer: PublicKey;
    admin: PublicKey;
    creator: PublicKey;
    platformFeeWallet: PublicKey;
    platformFeePercentage: BN;
  }): Promise<Transaction> {
    const tx = await this.program.methods
      .initialize(admin, creator, platformFeeWallet, platformFeePercentage)
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
   * @param newCreatorFeePercentage - The new creator fee percentage.
   * @param newPlatformFeePercentage - The new platform fee percentage.
   * @returns A promise that resolves to a transaction.
   */
  async updateFee({
    admin,
    newCreatorFeePercentage,
    newPlatformFeePercentage,
  }: {
    admin: PublicKey;
    newCreatorFeePercentage: number;
    newPlatformFeePercentage: number;
  }): Promise<Transaction> {
    return await this.program.methods
      .updateFee(
        new BN(newCreatorFeePercentage),
        new BN(newPlatformFeePercentage)
      )
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
   * Mirgate basket is_component_fixed
   * @param admin - The admin account.
   * @param basketId - The basket ID.
   * @param isComponentFixed - Whethere allow component change
   * @returns A promise that resolves to a transaction.
   */
  async migrateBasketIsComponentFixed({
                                            admin,
                                            basketId,
                                            isComponentFixed,
                                          }: {
    admin: PublicKey;
    basketId: BN;
    isComponentFixed: boolean;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({basketId});
    return await this.program.methods
      .migrateBasketConfigIsComponentFixed(isComponentFixed)
      .accountsPartial({
        admin,
        programState: this.programStatePDA(),
        basketConfig,
      })
      .transaction();
  }
}
