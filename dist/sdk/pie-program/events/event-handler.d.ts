import { EventParser as AnchorEventParser, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { Pie } from "../../../target/types/pie";
import { BuyComponentEvent, CreateBasketEvent, ExecuteRebalancingEvent, MintBasketTokenEvent, RedeemBasketTokenEvent, SellComponentEvent, StartRebalancingEvent, StopRebalancingEvent, UpdateAdminEvent, TransferBasketEvent, UpdateRebalancerEvent } from "../types";
/**
 * Class for parsing and handling program events
 */
export declare class EventHandler {
    eventParser: AnchorEventParser;
    constructor(programId: PublicKey, program: Program<Pie>);
    /**
     * Register a listener for CreateBasket events
     */
    onCreateBasket(connection: Connection, callback: (event: CreateBasketEvent) => void): number;
    /**
     * Register a listener for UpdateRebalancer events
     */
    onUpdateRebalancer(connection: Connection, callback: (event: UpdateRebalancerEvent) => void): number;
    /**
     * Register a listener for UpdateAdmin events
     */
    onUpdateAdmin(connection: Connection, callback: (event: UpdateAdminEvent) => void): number;
    /**
     * Register a listener for TransferBasket events
     */
    onTransferBasket(connection: Connection, callback: (event: TransferBasketEvent) => void): number;
    /**
     * Register a listener for ExecuteRebalancing events
     */
    onExecuteRebalancing(connection: Connection, callback: (event: ExecuteRebalancingEvent) => void): number;
    /**
     * Register a listener for StartRebalancing events
     */
    onStartRebalancing(connection: Connection, callback: (event: StartRebalancingEvent) => void): number;
    /**
     * Register a listener for StopRebalancing events
     */
    onStopRebalancing(connection: Connection, callback: (event: StopRebalancingEvent) => void): number;
    /**
     * Register a listener for BuyComponent events
     */
    onBuyComponent(connection: Connection, callback: (event: BuyComponentEvent) => void): number;
    /**
     * Register a listener for SellComponent events
     */
    onSellComponent(connection: Connection, callback: (event: SellComponentEvent) => void): number;
    /**
     * Register a listener for MintBasketToken events
     */
    onMintBasketToken(connection: Connection, callback: (event: MintBasketTokenEvent) => void): number;
    /**
     * Register a listener for RedeemBasketToken events
     */
    onRedeemBasketToken(connection: Connection, callback: (event: RedeemBasketTokenEvent) => void): number;
    /**
     * Parse log events from a transaction
     */
    parseEvents(logs: string[]): any[];
    /**
     * Helper method to register event listeners
     */
    private registerEventListener;
}
//# sourceMappingURL=event-handler.d.ts.map