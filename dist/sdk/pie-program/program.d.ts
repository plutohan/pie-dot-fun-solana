import { EventParser, Program } from "@coral-xyz/anchor";
import { Cluster, Commitment, Connection, PublicKey } from "@solana/web3.js";
import { ProgramStateManager } from "./state/program-state";
import { AdminInstructions } from "./instructions/admin-instructions";
import { UserInstructions } from "./instructions/user-instructions";
import { CreatorInstructions } from "./instructions/creator-instructions";
import { RebalancerInstructions } from "./instructions/rebalancer-instructions";
import { Jito } from "../jito";
import { EventHandler } from "./events";
import type { Pie } from "../../target/types/pie";
/**
 * Configuration options for initializing the PieProgram
 */
export interface PieProgramConfig {
    connection: Connection;
    cluster: Cluster;
    jitoRpcUrl: string;
    programId?: string;
    sharedLookupTable?: string;
    commitment?: Commitment;
    pieDotFunApiUrl?: string;
}
/**
 * Main PieProgram class that serves as the entry point to the SDK
 *
 * @example
 * ```typescript
 * const pieProgram = new PieProgram({
 *   connection: new Connection("https://api.mainnet-beta.solana.com"),
 *   cluster: "mainnet-beta",
 *   jitoRpcUrl: "https://jito-api.mainnet-beta.solana.com",
 * });
 *
 * await pieProgram.init();
 * ```
 */
export declare class PieProgram {
    private readonly _idl;
    private readonly _cluster;
    private readonly _programStateManager;
    private readonly _instructions;
    readonly jito: Jito;
    readonly events: EventHandler;
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly program: Program<Pie>;
    readonly eventParser: EventParser;
    readonly admin: AdminInstructions;
    readonly user: UserInstructions;
    readonly creator: CreatorInstructions;
    readonly rebalancer: RebalancerInstructions;
    readonly state: ProgramStateManager;
    readonly pieDotFunApiUrl: string;
    /**
     * Creates a new instance of PieProgram
     * @param config Configuration options for the program
     */
    constructor(config: PieProgramConfig);
}
//# sourceMappingURL=program.d.ts.map