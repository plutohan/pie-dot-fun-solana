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
exports.ProgramStateManager = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const PieIDL = __importStar(require("../../../target/idl/pie.json"));
const spl_token_1 = require("@solana/spl-token");
const spl_token_2 = require("@solana/spl-token");
/**
 * Class for handling program state, PDAs, and account queries
 */
class ProgramStateManager {
    constructor(programId, connection) {
        this.programId = programId;
        this.connection = connection;
        this._connection = connection;
    }
    get program() {
        return new anchor_1.Program(PieIDL, { connection: this._connection });
    }
    get accounts() {
        return this.program.account;
    }
    // PDA Methods
    programStatePDA() {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.PROGRAM_STATE)], this.programId)[0];
    }
    basketConfigPDA({ basketId }) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.BASKET_CONFIG), basketId.toArrayLike(Buffer, "be", 8)], this.programId)[0];
    }
    basketMintPDA({ basketId }) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.BASKET_MINT), basketId.toArrayLike(Buffer, "be", 8)], this.programId)[0];
    }
    userBalancePDA({ user }) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.USER_BALANCE), user.toBuffer()], this.programId)[0];
    }
    userFundPDA({ user, basketId, }) {
        return web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from(constants_1.USER_FUND),
            user.toBuffer(),
            basketId.toArrayLike(Buffer, "be", 8),
        ], this.programId)[0];
    }
    metadataPDA({ mint }) {
        return web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            new web3_js_1.PublicKey(constants_1.MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            mint.toBuffer(),
        ], new web3_js_1.PublicKey(constants_1.MPL_TOKEN_METADATA_PROGRAM_ID))[0];
    }
    // Account Query Methods
    async getProgramState() {
        try {
            return await this.accounts.programState.fetch(this.programStatePDA());
        }
        catch (error) {
            return null;
        }
    }
    async getBasketVaults({ basketId }) {
        const basketConfig = await this.getBasketConfig({ basketId });
        if (!basketConfig)
            return [];
        const tokenMints = basketConfig.components.map((component) => new web3_js_1.PublicKey(component.mint));
        return tokenMints.map((mint) => ({
            mint,
            balance: 0, // This will be populated by the PieProgram class
        }));
    }
    async getPlatformFeeTokenAccount() {
        const programState = await this.getProgramState();
        const platformFeeTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_2.NATIVE_MINT, programState.platformFeeWallet, true);
        return platformFeeTokenAccount;
    }
    async getCreatorFeeTokenAccount({ basketId, }) {
        const basketConfig = await this.getBasketConfig({ basketId });
        const creatorFeeTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_2.NATIVE_MINT, basketConfig.creator, true);
        return creatorFeeTokenAccount;
    }
    async getBasketConfig({ basketId, }) {
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        try {
            return await this.accounts.basketConfig.fetch(basketConfigPDA);
        }
        catch (error) {
            console.log({ error });
            return null;
        }
    }
    async getUserFund({ user, basketId, }) {
        const userFundPDA = this.userFundPDA({ user, basketId });
        try {
            return await this.accounts.userFund.fetch(userFundPDA);
        }
        catch (error) {
            return null;
        }
    }
    async getUserBalance({ user, }) {
        const userBalancePDA = this.userBalancePDA({ user });
        try {
            return await this.accounts.userBalance.fetch(userBalancePDA);
        }
        catch (error) {
            return null;
        }
    }
}
exports.ProgramStateManager = ProgramStateManager;
//# sourceMappingURL=program-state.js.map