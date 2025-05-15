"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PieProgram = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const program_state_1 = require("./state/program-state");
const admin_instructions_1 = require("./instructions/admin-instructions");
const user_instructions_1 = require("./instructions/user-instructions");
const creator_instructions_1 = require("./instructions/creator-instructions");
const rebalancer_instructions_1 = require("./instructions/rebalancer-instructions");
const jito_1 = require("../jito");
const events_1 = require("./events");
const PieIDL = __importStar(require("../../target/idl/pie.json"));
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
class PieProgram {
    /**
     * Creates a new instance of PieProgram
     * @param config Configuration options for the program
     */
    constructor(config) {
        this._idl = Object.assign({}, PieIDL);
        const { connection, cluster, jitoRpcUrl, programId = PieIDL.address, commitment = "confirmed", } = config;
        this.programId = new web3_js_1.PublicKey(programId);
        this.jito = new jito_1.Jito(jitoRpcUrl);
        this._programStateManager = new program_state_1.ProgramStateManager(this.programId, connection);
        this.program = this._programStateManager.program;
        this.eventParser = new anchor_1.EventParser(this.programId, this.program.coder);
        // Initialize instructions with null raydium - will be set in init()
        this._instructions = {
            admin: new admin_instructions_1.AdminInstructions(connection, this.programId),
            user: new user_instructions_1.UserInstructions(connection, this.programId),
            creator: new creator_instructions_1.CreatorInstructions(connection, this.programId),
            rebalancer: new rebalancer_instructions_1.RebalancerInstructions(connection, this.programId),
        };
        this.admin = this._instructions.admin;
        this.user = this._instructions.user;
        this.creator = this._instructions.creator;
        this.rebalancer = this._instructions.rebalancer;
        this.events = new events_1.EventHandler(this.programId, this.program);
        this.connection = connection;
        this.state = this._programStateManager;
    }
}
exports.PieProgram = PieProgram;
//# sourceMappingURL=program.js.map