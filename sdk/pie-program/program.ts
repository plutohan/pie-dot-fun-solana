import { BN, EventParser, Program } from "@coral-xyz/anchor";
import { Cluster, Commitment, Connection, PublicKey } from "@solana/web3.js";
import { ProgramStateManager } from "./state/program-state";
import { AdminInstructions } from "./instructions/admin-instructions";
import { UserInstructions } from "./instructions/user-instructions";
import { CreatorInstructions } from "./instructions/creator-instructions";
import { RebalancerInstructions } from "./instructions/rebalancer-instructions";
import { Jito } from "../jito";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { EventHandler } from "./events";
import * as PieIDL from "../../target/idl/pie.json";
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
export class PieProgram {
  private readonly _idl = Object.assign({}, PieIDL);
  private readonly _cluster: Cluster;

  private readonly _programStateManager: ProgramStateManager;
  private readonly _instructions: {
    admin: AdminInstructions;
    user: UserInstructions;
    creator: CreatorInstructions;
    rebalancer: RebalancerInstructions;
  };

  public readonly jito: Jito;
  public readonly events: EventHandler;
  public readonly connection: Connection;
  public readonly programId: PublicKey;
  public readonly program: Program<Pie>;
  public readonly eventParser: EventParser;
  public readonly admin: AdminInstructions;
  public readonly user: UserInstructions;
  public readonly creator: CreatorInstructions;
  public readonly rebalancer: RebalancerInstructions;
  public readonly state: ProgramStateManager;
  /**
   * Creates a new instance of PieProgram
   * @param config Configuration options for the program
   */
  constructor(config: PieProgramConfig) {
    const {
      connection,
      cluster,
      jitoRpcUrl,
      programId = PieIDL.address,
      commitment = "confirmed",
    } = config;

    this.programId = new PublicKey(programId);
    this.jito = new Jito(jitoRpcUrl);

    this._programStateManager = new ProgramStateManager(
      this.programId,
      connection
    );
    this.program = this._programStateManager.program;
    this.eventParser = new EventParser(this.programId, this.program.coder);

    // Initialize instructions with null raydium - will be set in init()
    this._instructions = {
      admin: new AdminInstructions(connection, this.programId),
      user: new UserInstructions(connection, this.programId),
      creator: new CreatorInstructions(connection, this.programId),
      rebalancer: new RebalancerInstructions(connection, this.programId),
    };

    this.admin = this._instructions.admin;
    this.user = this._instructions.user;
    this.creator = this._instructions.creator;
    this.rebalancer = this._instructions.rebalancer;
    this.events = new EventHandler(this.programId, this.program);
    this.connection = connection;
    this.state = this._programStateManager;
  }
}
