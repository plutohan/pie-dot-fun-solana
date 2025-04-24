import {
  BorshCoder,
  EventParser as AnchorEventParser,
  Program,
  Event,
} from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { Pie } from "../../../target/types/pie";
import {
  BuyComponentEvent,
  CreateBasketEvent,
  ExecuteRebalancingEvent,
  MintBasketTokenEvent,
  RedeemBasketTokenEvent,
  SellComponentEvent,
  StartRebalancingEvent,
  StopRebalancingEvent,
  TransferAdminEvent,
  TransferBasketEvent,
  UpdateRebalancerEvent,
} from "../types";

/**
 * Class for parsing and handling program events
 */
export class EventHandler {
  public eventParser: AnchorEventParser;

  constructor(programId: PublicKey, program: Program<Pie>) {
    this.eventParser = new AnchorEventParser(
      programId,
      program.coder as BorshCoder
    );
  }

  /**
   * Register a listener for CreateBasket events
   */
  onCreateBasket(
    connection: Connection,
    callback: (event: CreateBasketEvent) => void
  ): number {
    return this.registerEventListener<CreateBasketEvent>(
      connection,
      "CreateBasketEvent",
      callback
    );
  }

  /**
   * Register a listener for UpdateRebalancer events
   */
  onUpdateRebalancer(
    connection: Connection,
    callback: (event: UpdateRebalancerEvent) => void
  ): number {
    return this.registerEventListener<UpdateRebalancerEvent>(
      connection,
      "UpdateRebalancerEvent",
      callback
    );
  }

  /**
   * Register a listener for TransferAdmin events
   */
  onTransferAdmin(
    connection: Connection,
    callback: (event: TransferAdminEvent) => void
  ): number {
    return this.registerEventListener<TransferAdminEvent>(
      connection,
      "TransferAdminEvent",
      callback
    );
  }

  /**
   * Register a listener for TransferBasket events
   */
  onTransferBasket(
    connection: Connection,
    callback: (event: TransferBasketEvent) => void
  ): number {
    return this.registerEventListener<TransferBasketEvent>(
      connection,
      "TransferBasketEvent",
      callback
    );
  }

  /**
   * Register a listener for ExecuteRebalancing events
   */
  onExecuteRebalancing(
    connection: Connection,
    callback: (event: ExecuteRebalancingEvent) => void
  ): number {
    return this.registerEventListener<ExecuteRebalancingEvent>(
      connection,
      "ExecuteRebalancingEvent",
      callback
    );
  }

  /**
   * Register a listener for StartRebalancing events
   */
  onStartRebalancing(
    connection: Connection,
    callback: (event: StartRebalancingEvent) => void
  ): number {
    return this.registerEventListener<StartRebalancingEvent>(
      connection,
      "StartRebalancingEvent",
      callback
    );
  }

  /**
   * Register a listener for StopRebalancing events
   */
  onStopRebalancing(
    connection: Connection,
    callback: (event: StopRebalancingEvent) => void
  ): number {
    return this.registerEventListener<StopRebalancingEvent>(
      connection,
      "StopRebalancingEvent",
      callback
    );
  }

  /**
   * Register a listener for BuyComponent events
   */
  onBuyComponent(
    connection: Connection,
    callback: (event: BuyComponentEvent) => void
  ): number {
    return this.registerEventListener<BuyComponentEvent>(
      connection,
      "BuyComponentEvent",
      callback
    );
  }

  /**
   * Register a listener for SellComponent events
   */
  onSellComponent(
    connection: Connection,
    callback: (event: SellComponentEvent) => void
  ): number {
    return this.registerEventListener<SellComponentEvent>(
      connection,
      "SellComponentEvent",
      callback
    );
  }

  /**
   * Register a listener for MintBasketToken events
   */
  onMintBasketToken(
    connection: Connection,
    callback: (event: MintBasketTokenEvent) => void
  ): number {
    return this.registerEventListener<MintBasketTokenEvent>(
      connection,
      "MintBasketTokenEvent",
      callback
    );
  }

  /**
   * Register a listener for RedeemBasketToken events
   */
  onRedeemBasketToken(
    connection: Connection,
    callback: (event: RedeemBasketTokenEvent) => void
  ): number {
    return this.registerEventListener<RedeemBasketTokenEvent>(
      connection,
      "RedeemBasketTokenEvent",
      callback
    );
  }

  /**
   * Parse log events from a transaction
   */
  parseEvents(logs: string[]): any[] {
    return [...this.eventParser.parseLogs(logs)];
  }

  /**
   * Helper method to register event listeners
   */
  private registerEventListener<T>(
    connection: Connection,
    eventName: string,
    callback: (event: T) => void
  ): number {
    return connection.onLogs(
      "all",
      (logs) => {
        if (!logs.logs || !logs.logs.length) {
          return;
        }

        try {
          const events = [...this.eventParser.parseLogs(logs.logs)];
          events
            .filter((event) => event.name === eventName)
            .forEach((event) => {
              callback(event.data as T);
            });
        } catch (e) {
          console.error(`Error parsing ${eventName} event:`, e);
        }
      },
      "confirmed"
    );
  }
}
