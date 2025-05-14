import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
/**
 * Class for handling admin-related instructions
 */
export declare class AdminInstructions extends ProgramStateManager {
    readonly connection: Connection;
    readonly programId: PublicKey;
    constructor(connection: Connection, programId: PublicKey);
    /**
     * Initializes the program.
     * @param admin - The admin account.
     * @returns A promise that resolves to a transaction.
     */
    initialize({ initializer, admin, platformFeeWallet, platformFeePercentage, basketCreationFee, }: {
        initializer: PublicKey;
        admin: PublicKey;
        platformFeeWallet: PublicKey;
        platformFeePercentage: BN;
        basketCreationFee: BN;
    }): Promise<Transaction>;
    /**
     * Update admin account
     */
    updateAdmin({ admin, newAdmin, }: {
        admin: PublicKey;
        newAdmin: PublicKey;
    }): Promise<Transaction>;
    /**
     * Updates the fee. 10000 = 100% => 1000 = 1%
     * @param admin - The admin account.
     * @param newBasketCreationFee - The new basket creation fee in lamports.
     * @param newPlatformFeeBp - The new platform fee in basis points.
     * @returns A promise that resolves to a transaction.
     */
    updateFee({ admin, newBasketCreationFee, newPlatformFeeBp, }: {
        admin: PublicKey;
        newBasketCreationFee: number;
        newPlatformFeeBp: number;
    }): Promise<Transaction>;
    /**
     * Updates the platform fee wallet.
     * @param admin - The admin account.
     * @param newPlatformFeeWallet - The new platform fee wallet.
     * @returns A promise that resolves to a transaction.
     */
    updatePlatformFeeWallet({ admin, newPlatformFeeWallet, }: {
        admin: PublicKey;
        newPlatformFeeWallet: PublicKey;
    }): Promise<Transaction>;
    /**
     * Migrates a basket to a new version.
     * @param admin - The admin account.
     * @param basketId - The basket ID to migrate.
     * @returns A promise that resolves to a transaction.
     */
    migrateBasket({ admin, basketId, }: {
        admin: PublicKey;
        basketId: BN;
    }): Promise<Transaction>;
}
//# sourceMappingURL=admin-instructions.d.ts.map