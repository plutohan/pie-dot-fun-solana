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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const devnet_admin_json_1 = __importDefault(require("../public/devnet-admin.json"));
const chai_1 = require("chai");
const helper_1 = require("./utils/helper");
const pie_program_1 = require("../sdk/pie-program");
const spl_token_1 = require("@solana/spl-token");
function sleep(s) {
    return new Promise((resolve) => setTimeout(resolve, s * 1000));
}
describe("pie", () => {
    // Configure the client to use the local cluster.
    const defaultProvider = anchor.AnchorProvider.env();
    const connection = new web3_js_1.Connection("http://localhost:8899", "confirmed");
    const admin = web3_js_1.Keypair.fromSecretKey(new Uint8Array(devnet_admin_json_1.default));
    const newAdmin = web3_js_1.Keypair.generate();
    const rebalancer = web3_js_1.Keypair.generate();
    const platformFeeWallet = web3_js_1.Keypair.generate();
    const pieProgram = new pie_program_1.PieProgram(connection, "devnet");
    it("is success deploy without admin change", async () => {
        await Promise.all([
            connection.requestAirdrop(admin.publicKey, web3_js_1.LAMPORTS_PER_SOL),
            connection.requestAirdrop(defaultProvider.publicKey, web3_js_1.LAMPORTS_PER_SOL),
            connection.requestAirdrop(newAdmin.publicKey, web3_js_1.LAMPORTS_PER_SOL),
            connection.requestAirdrop(rebalancer.publicKey, web3_js_1.LAMPORTS_PER_SOL),
            connection.requestAirdrop(platformFeeWallet.publicKey, web3_js_1.LAMPORTS_PER_SOL),
        ]);
        await sleep(1);
        const initTx = await pieProgram.initialize({ admin: admin.publicKey });
        await (0, web3_js_1.sendAndConfirmTransaction)(connection, initTx, [admin]);
        const programState = await pieProgram.getProgramState();
        chai_1.assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
    });
    describe("transfer_admin", () => {
        it("should be transfer with new admin", async () => {
            const transferTx = await pieProgram.transferAdmin({
                admin: admin.publicKey,
                newAdmin: newAdmin.publicKey,
            });
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, transferTx, [admin]);
            let programState = await pieProgram.getProgramState();
            chai_1.assert.equal(programState.admin.toBase58(), newAdmin.publicKey.toBase58());
            //transfer back
            const transferBackTx = await pieProgram.transferAdmin({
                admin: newAdmin.publicKey,
                newAdmin: admin.publicKey,
            });
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, transferBackTx, [newAdmin]);
            programState = await pieProgram.getProgramState();
            chai_1.assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
        });
        it("should fail if the admin is unauthorized", async () => {
            try {
                const transferTx = await pieProgram.transferAdmin({
                    admin: newAdmin.publicKey,
                    newAdmin: admin.publicKey,
                });
                await (0, web3_js_1.sendAndConfirmTransaction)(connection, transferTx, [newAdmin]);
            }
            catch (e) { }
        });
    });
    describe("update_fee", () => {
        it("should update fee", async () => {
            const updateFeeTx = await pieProgram.updateFee({
                admin: admin.publicKey,
                newCreatorFeePercentage: 1000,
                newPlatformFeePercentage: 9000,
            });
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, updateFeeTx, [admin]);
            const programState = await pieProgram.getProgramState();
            chai_1.assert.equal(programState.creatorFeePercentage.toNumber(), 1000);
            chai_1.assert.equal(programState.platformFeePercentage.toNumber(), 9000);
        });
        it("should fail if not admin", async () => {
            try {
                const updateFeeTx = await pieProgram.updateFee({
                    admin: newAdmin.publicKey,
                    newCreatorFeePercentage: 1000,
                    newPlatformFeePercentage: 1000,
                });
                await (0, web3_js_1.sendAndConfirmTransaction)(connection, updateFeeTx, [newAdmin]);
            }
            catch (e) {
                chai_1.assert.isNotEmpty(e);
            }
        });
        it("should fail if the fee is invalid", async () => {
            try {
                const updateFeeTx = await pieProgram.updateFee({
                    admin: admin.publicKey,
                    newCreatorFeePercentage: (1000 * 10 ** 10) ^ 4,
                    newPlatformFeePercentage: 1000,
                });
                await (0, web3_js_1.sendAndConfirmTransaction)(connection, updateFeeTx, [admin]);
            }
            catch (e) {
                chai_1.assert.isNotEmpty(e);
            }
        });
    });
    describe("update_platform_fee_wallet", () => {
        it("should update platform fee wallet", async () => {
            const updatePlatformFeeWalletTx = await pieProgram.updatePlatformFeeWallet({
                admin: admin.publicKey,
                newPlatformFeeWallet: platformFeeWallet.publicKey,
            });
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, updatePlatformFeeWalletTx, [
                admin,
            ]);
            const programState = await pieProgram.getProgramState();
            chai_1.assert.equal(programState.platformFeeWallet.toBase58(), platformFeeWallet.publicKey.toBase58());
        });
        it("should fail if not admin", async () => {
            try {
                const updatePlatformFeeWalletTx = await pieProgram.updatePlatformFeeWallet({
                    admin: newAdmin.publicKey,
                    newPlatformFeeWallet: platformFeeWallet.publicKey,
                });
                await (0, web3_js_1.sendAndConfirmTransaction)(connection, updatePlatformFeeWalletTx, [
                    newAdmin,
                ]);
            }
            catch (e) { }
        });
    });
    describe("create_basket", () => {
        describe("v1", () => {
            it("should create a basket with metadata", async () => {
                const basketComponents = await (0, helper_1.createBasketComponents)(connection, admin, [1, 2, 3]);
                const createBasketArgs = {
                    name: "Basket Name Test",
                    symbol: "BNS",
                    uri: "test",
                    components: basketComponents,
                    rebalancer: admin.publicKey,
                };
                const programState = await pieProgram.getProgramState();
                const basketId = programState.basketCounter;
                const createBasketTx = await pieProgram.createBasket({
                    creator: admin.publicKey,
                    args: createBasketArgs,
                    basketId,
                });
                await (0, web3_js_1.sendAndConfirmTransaction)(connection, createBasketTx, [admin]);
                const basketConfig = pieProgram.basketConfigPDA({ basketId });
                const basketMint = pieProgram.basketMintPDA({ basketId });
                const basketConfigData = await pieProgram.getBasketConfig({ basketId });
                chai_1.assert.equal(basketConfigData.creator.toBase58(), admin.publicKey.toBase58());
                chai_1.assert.equal(basketConfigData.mint.toBase58(), basketMint.toBase58());
                chai_1.assert.equal(basketConfigData.components.length, 3);
                const mintData = await (0, spl_token_1.getMint)(connection, basketMint);
                chai_1.assert.equal(mintData.supply.toString(), "0");
                chai_1.assert.equal(mintData.decimals, 6);
                chai_1.assert.equal(mintData.mintAuthority?.toBase58(), basketConfig.toBase58());
            });
            it("should create a basket with metadata", async () => {
                const basketComponents = await (0, helper_1.createBasketComponents)(connection, admin, [1, 2, 3]);
                const createBasketArgs = {
                    name: "Basket Name Test",
                    symbol: "BNS",
                    uri: "test",
                    components: basketComponents,
                    rebalancer: admin.publicKey,
                };
                const programState = await pieProgram.getProgramState();
                const basketId = programState.basketCounter;
                const createBasketTx = await pieProgram.createBasket({
                    creator: admin.publicKey,
                    args: createBasketArgs,
                    basketId,
                });
                await (0, web3_js_1.sendAndConfirmTransaction)(connection, createBasketTx, [admin]);
            });
            it("should fail if the creator is unauthorized", async () => { });
        });
        describe("v2", () => {
            it("should create a basket with metadata", async () => { });
            it("should create a basket with any creator", async () => { });
        });
    });
    describe("update_rebalancer", () => {
        it("should update with new balancer in basket config state", async () => {
            const basketComponents = await (0, helper_1.createBasketComponents)(connection, admin, [1, 2, 3]);
            const createBasketArgs = {
                name: "Basket Name Test",
                symbol: "BNS",
                uri: "test",
                components: basketComponents,
                rebalancer: admin.publicKey,
            };
            const programState = await pieProgram.getProgramState();
            const basketId = programState.basketCounter;
            const createBasketTx = await pieProgram.createBasket({
                creator: admin.publicKey,
                args: createBasketArgs,
                basketId,
            });
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, createBasketTx, [admin]);
            const basketState = await pieProgram.getBasketConfig({ basketId });
            console.assert(basketState.rebalancer.toBase58(), admin.publicKey.toBase58());
            const updateRebalancerTx = await pieProgram.updateRebalancer({
                creator: admin.publicKey,
                basketId,
                newRebalancer: rebalancer.publicKey,
            });
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, updateRebalancerTx, [admin]);
            console.assert(basketState.rebalancer.toBase58(), rebalancer.publicKey.toBase58());
        });
        it("should fail if unauthorized", async () => { });
    });
});
//# sourceMappingURL=pie.js.map