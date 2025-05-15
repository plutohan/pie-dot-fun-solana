import { BN } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { ProgramStateManager } from "../state";
import { CreateBasketArgs, CreateBasketWithTokenWeightsArgs } from "../types";
/**
 * Class for handling creator-related instructions
 */
export declare class CreatorInstructions extends ProgramStateManager {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly pieDotFunApiUrl: string;
    constructor(connection: Connection, programId: PublicKey, pieDotFunApiUrl: string);
    /**
     * Creates a basket.
     * @param creator - The creator account.
     * @param args - The basket arguments.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    createBasket({ creator, args, basketId, }: {
        creator: PublicKey;
        args: CreateBasketArgs;
        basketId: BN;
    }): Promise<Transaction>;
    /**
     * Creates a basket with token weights
     * @param creator - The creator account.
     * @param args - CreateBasketWithTokenWeightsArgs
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    createBasketWithTokenWeights({ creator, args, targetBasketTokenPriceInLamports, }: {
        creator: PublicKey;
        args: CreateBasketWithTokenWeightsArgs;
        targetBasketTokenPriceInLamports?: BN;
    }): Promise<Transaction>;
    /**
     * Update the rebalancer for a basket
     */
    updateRebalancer({ creator, basketId, newRebalancer, }: {
        creator: PublicKey;
        basketId: BN;
        newRebalancer: PublicKey;
    }): Promise<Transaction>;
    /**
     * Inactivate a basket
     */
    inactivateBasket({ creator, basketId, }: {
        creator: PublicKey;
        basketId: BN;
    }): Promise<Transaction>;
}
//# sourceMappingURL=creator-instructions.d.ts.map