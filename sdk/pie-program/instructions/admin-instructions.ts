import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { PDAs } from "../pda";
import { Pie } from "../../../target/types/pie";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  getOrCreateTokenAccountTx,
  isValidTransaction,
} from "../../utils/helper";

/**
 * Class for handling admin-related instructions
 */
export class AdminInstructions {
  constructor(
    private readonly program: Program<Pie>,
    private readonly pda: PDAs
  ) {}

  /**
   * Initializes the program
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
        this.program.provider.connection,
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
   * Transfers the admin role to a new account
   */
  async transferAdmin({
    admin,
    newAdmin,
  }: {
    admin: PublicKey;
    newAdmin: PublicKey;
  }): Promise<Transaction> {
    return await this.program.methods
      .transferAdmin(newAdmin)
      .accounts({ admin })
      .transaction();
  }

  /**
   * Updates the fee (10000 = 100% => 1000 = 1%)
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
        programState: this.pda.programState,
      })
      .transaction();
  }

  /**
   * Updates the platform fee wallet
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
      .accountsPartial({
        admin,
        programState: this.pda.programState,
      })
      .transaction();
  }

  /**
   * Updates the whitelisted creators
   */
  async updateWhitelistedCreators({
    admin,
    newWhitelistedCreators,
  }: {
    admin: PublicKey;
    newWhitelistedCreators: PublicKey[];
  }): Promise<Transaction> {
    return await this.program.methods
      .updateWhitelistedCreators(newWhitelistedCreators)
      .accountsPartial({
        admin,
        programState: this.pda.programState,
      })
      .transaction();
  }
}
