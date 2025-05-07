import { BN, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { BasketConfig, ProgramState, UserBalance, UserFund } from "../types";
import {
  PROGRAM_STATE,
  USER_FUND,
  BASKET_CONFIG,
  BASKET_MINT,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  USER_BALANCE,
} from "./constants";
import * as PieIDL from "../../../target/idl/pie.json";
import { Pie } from "../../../target/types/pie";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { NATIVE_MINT } from "@solana/spl-token";

/**
 * Class for handling program state, PDAs, and account queries
 */
export class ProgramStateManager {
  protected readonly _connection: Connection;

  constructor(readonly programId: PublicKey, readonly connection: Connection) {
    this._connection = connection;
  }

  get program() {
    return new Program<Pie>(PieIDL as Pie, { connection: this._connection });
  }

  get accounts(): any {
    return this.program.account;
  }

  // PDA Methods
  programStatePDA(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PROGRAM_STATE)],
      this.programId
    )[0];
  }

  basketConfigPDA({ basketId }: { basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_CONFIG), basketId.toArrayLike(Buffer, "be", 8)],
      this.programId
    )[0];
  }

  basketMintPDA({ basketId }: { basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_MINT), basketId.toArrayLike(Buffer, "be", 8)],
      this.programId
    )[0];
  }

  userBalancePDA({ user }: { user: PublicKey }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(USER_BALANCE), user.toBuffer()],
      this.programId
    )[0];
  }

  userFundPDA({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(USER_FUND),
        user.toBuffer(),
        basketId.toArrayLike(Buffer, "be", 8),
      ],
      this.programId
    )[0];
  }

  metadataPDA({ mint }: { mint: PublicKey }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
    )[0];
  }

  // Account Query Methods
  async getProgramState(): Promise<ProgramState | null> {
    try {
      return await this.accounts.programState.fetch(this.programStatePDA());
    } catch (error) {
      return null;
    }
  }

  async getBasketVaults({ basketId }: { basketId: BN }): Promise<
    {
      mint: PublicKey;
      balance: number;
    }[]
  > {
    const basketConfig = await this.getBasketConfig({ basketId });
    if (!basketConfig) return [];

    const tokenMints = basketConfig.components.map(
      (component) => new PublicKey(component.mint)
    );

    return tokenMints.map((mint) => ({
      mint,
      balance: 0, // This will be populated by the PieProgram class
    }));
  }

  async getPlatformFeeTokenAccount(): Promise<PublicKey> {
    const programState = await this.getProgramState();
    const platformFeeTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      programState.platformFeeWallet,
      true
    );
    return platformFeeTokenAccount;
  }

  async getCreatorFeeTokenAccount({
    basketId,
  }: {
    basketId: BN;
  }): Promise<PublicKey> {
    const basketConfig = await this.getBasketConfig({ basketId });
    const creatorFeeTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketConfig.creator,
      true
    );
    return creatorFeeTokenAccount;
  }

  async getBasketConfig({
    basketId,
  }: {
    basketId: BN;
  }): Promise<BasketConfig | null> {
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    try {
      return await this.accounts.basketConfig.fetch(basketConfigPDA);
    } catch (error) {
      return null;
    }
  }

  async getUserFund({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): Promise<UserFund | null> {
    const userFundPDA = this.userFundPDA({ user, basketId });
    try {
      return await this.accounts.userFund.fetch(userFundPDA);
    } catch (error) {
      return null;
    }
  }

  async getUserBalance({
    user,
  }: {
    user: PublicKey;
  }): Promise<UserBalance | null> {
    const userBalancePDA = this.userBalancePDA({ user });
    try {
      return await this.accounts.userBalance.fetch(userBalancePDA);
    } catch (error) {
      return null;
    }
  }
}
