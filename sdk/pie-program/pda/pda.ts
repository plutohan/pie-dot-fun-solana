import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Constants for PDA seeds
const PROGRAM_STATE = "program_state";
const USER_FUND = "user_fund";
const BASKET_CONFIG = "basket_config";
const BASKET_MINT = "basket_mint";

const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

/**
 * Class for handling program-derived addresses (PDAs)
 */
export class PDAs {
  constructor(public readonly programId: PublicKey) {}

  /**
   * Returns the program state PDA
   */
  get programState(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PROGRAM_STATE)],
      this.programId
    )[0];
  }

  /**
   * Returns the basket config PDA for a given basket ID
   */
  basketConfig({ basketId }: { basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_CONFIG), basketId.toArrayLike(Buffer, "be", 8)],
      this.programId
    )[0];
  }

  /**
   * Returns the basket mint PDA for a given basket ID
   */
  basketMint({ basketId }: { basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_MINT), basketId.toArrayLike(Buffer, "be", 8)],
      this.programId
    )[0];
  }

  /**
   * Returns the user fund PDA for a given user and basket ID
   */
  userFund({ user, basketId }: { user: PublicKey; basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(USER_FUND),
        user.toBuffer(),
        basketId.toArrayLike(Buffer, "be", 8),
      ],
      this.programId
    )[0];
  }

  /**
   * Returns the metadata PDA for a given mint
   */
  metadata({ mint }: { mint: PublicKey }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
    )[0];
  }
}
