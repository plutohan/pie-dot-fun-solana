"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = void 0;
const anchor_1 = require("@coral-xyz/anchor");
/**
 * Class for parsing and handling program events
 */
class EventHandler {
    constructor(programId, program) {
        this.eventParser = new anchor_1.EventParser(programId, program.coder);
    }
    /**
     * Register a listener for CreateBasket events
     */
    onCreateBasket(connection, callback) {
        return this.registerEventListener(connection, "CreateBasketEvent", callback);
    }
    /**
     * Register a listener for UpdateRebalancer events
     */
    onUpdateRebalancer(connection, callback) {
        return this.registerEventListener(connection, "UpdateRebalancerEvent", callback);
    }
    /**
     * Register a listener for UpdateAdmin events
     */
    onUpdateAdmin(connection, callback) {
        return this.registerEventListener(connection, "UpdateAdminEvent", callback);
    }
    /**
     * Register a listener for TransferBasket events
     */
    onTransferBasket(connection, callback) {
        return this.registerEventListener(connection, "TransferBasketEvent", callback);
    }
    /**
     * Register a listener for ExecuteRebalancing events
     */
    onExecuteRebalancing(connection, callback) {
        return this.registerEventListener(connection, "ExecuteRebalancingEvent", callback);
    }
    /**
     * Register a listener for StartRebalancing events
     */
    onStartRebalancing(connection, callback) {
        return this.registerEventListener(connection, "StartRebalancingEvent", callback);
    }
    /**
     * Register a listener for StopRebalancing events
     */
    onStopRebalancing(connection, callback) {
        return this.registerEventListener(connection, "StopRebalancingEvent", callback);
    }
    /**
     * Register a listener for BuyComponent events
     */
    onBuyComponent(connection, callback) {
        return this.registerEventListener(connection, "BuyComponentEvent", callback);
    }
    /**
     * Register a listener for SellComponent events
     */
    onSellComponent(connection, callback) {
        return this.registerEventListener(connection, "SellComponentEvent", callback);
    }
    /**
     * Register a listener for MintBasketToken events
     */
    onMintBasketToken(connection, callback) {
        return this.registerEventListener(connection, "MintBasketTokenEvent", callback);
    }
    /**
     * Register a listener for RedeemBasketToken events
     */
    onRedeemBasketToken(connection, callback) {
        return this.registerEventListener(connection, "RedeemBasketTokenEvent", callback);
    }
    /**
     * Parse log events from a transaction
     */
    parseEvents(logs) {
        return [...this.eventParser.parseLogs(logs)];
    }
    /**
     * Helper method to register event listeners
     */
    registerEventListener(connection, eventName, callback) {
        return connection.onLogs("all", (logs) => {
            if (!logs.logs || !logs.logs.length) {
                return;
            }
            try {
                const events = [...this.eventParser.parseLogs(logs.logs)];
                events
                    .filter((event) => event.name === eventName)
                    .forEach((event) => {
                    callback(event.data);
                });
            }
            catch (e) {
                console.error(`Error parsing ${eventName} event:`, e);
            }
        }, "confirmed");
    }
}
exports.EventHandler = EventHandler;
//# sourceMappingURL=event-handler.js.map