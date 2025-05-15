import { BN, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { BasketConfig, ProgramState, UserBalance, UserFund } from "../types";
import { Pie } from "../../../target/types/pie";
/**
 * Class for handling program state, PDAs, and account queries
 */
export declare class ProgramStateManager {
    readonly programId: PublicKey;
    readonly connection: Connection;
    protected readonly _connection: Connection;
    constructor(programId: PublicKey, connection: Connection);
    get program(): Program<Pie>;
    get accounts(): any;
    programStatePDA(): PublicKey;
    basketConfigPDA({ basketId }: {
        basketId: BN;
    }): PublicKey;
    basketMintPDA({ basketId }: {
        basketId: BN;
    }): PublicKey;
    userBalancePDA({ user }: {
        user: PublicKey;
    }): PublicKey;
    userFundPDA({ user, basketId, }: {
        user: PublicKey;
        basketId: BN;
    }): PublicKey;
    metadataPDA({ mint }: {
        mint: PublicKey;
    }): PublicKey;
    getProgramState(): Promise<ProgramState | null>;
    getBasketVaults({ basketId }: {
        basketId: BN;
    }): Promise<{
        mint: PublicKey;
        balance: number;
    }[]>;
    getPlatformFeeTokenAccount(): Promise<PublicKey>;
    getCreatorFeeTokenAccount({ basketId, }: {
        basketId: BN;
    }): Promise<PublicKey>;
    getBasketConfig({ basketId, }: {
        basketId: BN;
    }): Promise<BasketConfig | null>;
    getUserFund({ user, basketId, }: {
        user: PublicKey;
        basketId: BN;
    }): Promise<UserFund | null>;
    getUserBalance({ user, }: {
        user: PublicKey;
    }): Promise<UserBalance | null>;
}
//# sourceMappingURL=program-state.d.ts.map