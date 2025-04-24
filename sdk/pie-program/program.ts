import { BN, EventParser, Program } from "@coral-xyz/anchor";
import { Cluster, Commitment, Connection, PublicKey } from "@solana/web3.js";
import { ProgramStateManager } from "./state/program-state";
import { AdminInstructions } from "./instructions/admin-instructions";
import { BuyInstructions } from "./instructions/buy-instructions";
import { SellInstructions } from "./instructions/sell-instructions";
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
  private readonly idl = Object.assign({}, PieIDL);
  private raydium: Raydium | null = null;
  private readonly jito: Jito;
  private readonly events: EventHandler;
  private readonly program: Program<Pie>;
  private readonly _eventParser: EventParser;
  private readonly _cluster: Cluster;
  private readonly _commitment: Commitment;

  private readonly programStateManager: ProgramStateManager;
  private readonly instructions: {
    admin: AdminInstructions;
    buy: BuyInstructions;
    sell: SellInstructions;
    creator: CreatorInstructions;
    rebalancer: RebalancerInstructions;
  };

  public readonly admin: AdminInstructions;
  public readonly buy: BuyInstructions;
  public readonly sell: SellInstructions;
  public readonly creator: CreatorInstructions;
  public readonly rebalancer: RebalancerInstructions;

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
      sharedLookupTable = "2ZWHWfumGv3cC4My3xzgQXMWNEnmYGVGnURhpgW6SL7m",
      commitment = "confirmed",
    } = config;

    this._cluster = cluster;
    this._commitment = commitment;
    this.idl.address = programId;
    this.jito = new Jito(jitoRpcUrl);

    const programPubkey = new PublicKey(programId);
    this.programStateManager = new ProgramStateManager(
      programPubkey,
      connection
    );
    this.program = this.programStateManager.program;
    this._eventParser = new EventParser(programPubkey, this.program.coder);

    // Initialize instructions with null raydium - will be set in init()
    this.instructions = {
      admin: new AdminInstructions(connection, programPubkey),
      buy: new BuyInstructions(connection, programPubkey, null as any),
      sell: new SellInstructions(connection, programPubkey, null as any),
      creator: new CreatorInstructions(connection, programPubkey),
      rebalancer: new RebalancerInstructions(
        connection,
        programPubkey,
        null as any
      ),
    };

    this.admin = this.instructions.admin;
    this.buy = this.instructions.buy;
    this.sell = this.instructions.sell;
    this.creator = this.instructions.creator;
    this.rebalancer = this.instructions.rebalancer;
    this.events = new EventHandler(programPubkey, this.program);
  }

  /**
   * Initialize the program and its dependencies
   * @throws Error if initialization fails
   */
  async init(): Promise<void> {
    try {
      this.raydium = await Raydium.load({
        connection: this.connection as any,
        cluster: this.cluster as any,
        disableFeatureCheck: true,
        blockhashCommitment: "confirmed",
      });

      // Update instructions with initialized raydium
      this.instructions.buy = new BuyInstructions(
        this.connection,
        this.programId,
        this.raydium
      );
      this.instructions.sell = new SellInstructions(
        this.connection,
        this.programId,
        this.raydium
      );
      this.instructions.rebalancer = new RebalancerInstructions(
        this.connection,
        this.programId,
        this.raydium
      );
    } catch (error) {
      throw new Error(`Failed to initialize PieProgram: ${error.message}`);
    }
  }

  /**
   * Get the program's public key
   */
  get programId(): PublicKey {
    return this.state.programId;
  }

  /**
   * Get the program's connection
   */
  get connection(): Connection {
    return this.programStateManager.connection;
  }

  /**
   * Get the program's cluster
   */
  get cluster(): Cluster {
    return this._cluster;
  }

  /**
   * Get the program's commitment level
   */
  get commitment(): Commitment {
    return this._commitment;
  }

  /**
   * Get the program's event parser
   */
  get eventParser(): EventParser {
    return this._eventParser;
  }

  /**
   * Get the program's event handler
   */
  get eventHandler(): EventHandler {
    return this.events;
  }

  /**
   * Get the program's state manager
   */
  get state(): ProgramStateManager {
    return this.programStateManager;
  }
}
