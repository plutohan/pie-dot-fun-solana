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
const PieIDL = __importStar(require("../target/idl/pie.json"));
const spl_token_1 = require("@solana/spl-token");
const raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
const helper_1 = require("./utils/helper");
const lookupTable_1 = require("./utils/lookupTable");
const jito_1 = require("../sdk/jito");
const constants_1 = require("./constants");
const PROGRAM_STATE = "program_state";
const USER_FUND = "user_fund";
const BASKET_CONFIG = "basket_config";
const BASKET_MINT = "basket_mint";
const MPL_TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
class PieProgram {
    constructor(connection, cluster, jitoRpcUrl, programId = PieIDL.address, sharedLookupTable = "2ZWHWfumGv3cC4My3xzgQXMWNEnmYGVGnURhpgW6SL7m") {
        this.connection = connection;
        this.cluster = cluster;
        this.jitoRpcUrl = jitoRpcUrl;
        this.sharedLookupTable = sharedLookupTable;
        this.idl = Object.assign({}, PieIDL);
        this.idl.address = programId;
        this.jito = new jito_1.Jito(jitoRpcUrl);
        this.eventParser = new anchor_1.EventParser(new web3_js_1.PublicKey(programId), new anchor_1.BorshCoder(PieIDL));
    }
    async init() {
        this.raydium = await raydium_sdk_v2_1.Raydium.load({
            connection: this.connection,
            cluster: this.cluster,
            disableFeatureCheck: true,
            blockhashCommitment: "confirmed",
        });
    }
    get program() {
        return new anchor_1.Program(this.idl, { connection: this.connection });
    }
    get accounts() {
        return this.program.account;
    }
    get programStatePDA() {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(PROGRAM_STATE)], this.program.programId)[0];
    }
    basketConfigPDA({ basketId }) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(BASKET_CONFIG), basketId.toArrayLike(Buffer, "be", 8)], this.program.programId)[0];
    }
    basketMintPDA({ basketId }) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(BASKET_MINT), basketId.toArrayLike(Buffer, "be", 8)], this.program.programId)[0];
    }
    userFundPDA({ user, basketId, }) {
        return web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from(USER_FUND),
            user.toBuffer(),
            basketId.toArrayLike(Buffer, "be", 8),
        ], this.program.programId)[0];
    }
    metadataPDA({ mint }) {
        return web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("metadata"),
            new web3_js_1.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            mint.toBuffer(),
        ], new web3_js_1.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID))[0];
    }
    async getProgramState() {
        try {
            return await this.accounts.programState.fetch(this.programStatePDA);
        }
        catch (error) {
            return null;
        }
    }
    async getPlatformFeeTokenAccount() {
        const programState = await this.getProgramState();
        const platformFeeTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_1.NATIVE_MINT, programState.platformFeeWallet, true);
        return platformFeeTokenAccount;
    }
    async getCreatorFeeTokenAccount({ basketId, }) {
        const basketConfig = await this.getBasketConfig({ basketId });
        const creatorFeeTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_1.NATIVE_MINT, basketConfig.creator, true);
        return creatorFeeTokenAccount;
    }
    async getBasketConfig({ basketId, }) {
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        try {
            return await this.accounts.basketConfig.fetch(basketConfigPDA);
        }
        catch (error) {
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
    async getTokenBalance({ mint, owner, commitment = "confirmed", }) {
        const tokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, owner, true);
        try {
            const balance = await this.connection.getTokenAccountBalance(tokenAccount, commitment);
            return Number(balance.value.amount);
        }
        catch (error) {
            // Return 0 if the token account doesn't exist
            return 0;
        }
    }
    async getAllTokenAccountWithBalance({ owner }) {
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(owner, {
            programId: spl_token_1.TOKEN_PROGRAM_ID,
        });
        return tokenAccounts.value.map((tokenAccount) => ({
            mint: tokenAccount.account.data.parsed.info.mint,
            owner: tokenAccount.account.data.parsed.info.owner,
            pubkey: tokenAccount.pubkey,
            tokenAmount: tokenAccount.account.data.parsed.info.tokenAmount,
        }));
    }
    async getBasketVaults({ basketId }) {
        const basketConfig = await this.getBasketConfig({ basketId });
        const tokenMints = [];
        const tokenBalances = [];
        for (const component of basketConfig.components) {
            tokenMints.push(new web3_js_1.PublicKey(component.mint));
            tokenBalances.push(this.getTokenBalance({
                mint: new web3_js_1.PublicKey(component.mint),
                owner: this.basketConfigPDA({ basketId }),
            }));
        }
        const resolvedBalances = await Promise.all(tokenBalances);
        return tokenMints.map((mint, index) => ({
            mint,
            balance: resolvedBalances[index],
        }));
    }
    /**
     * Initializes the program.
     * @param admin - The admin account.
     * @returns A promise that resolves to a transaction.
     */
    async initialize({ initializer, admin, creator, platformFeeWallet, platformFeePercentage, }) {
        const tx = await this.program.methods
            .initialize(admin, creator, platformFeeWallet, platformFeePercentage)
            .accounts({ initializer })
            .transaction();
        const { tx: createPlatformFeeTokenAccountTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), initializer, platformFeeWallet);
        if ((0, helper_1.isValidTransaction)(createPlatformFeeTokenAccountTx)) {
            tx.add(createPlatformFeeTokenAccountTx);
        }
        return tx;
    }
    async initializeSharedLookupTable({ admin, }) {
        console.log("creating new shared lookup table");
        const newLookupTable = await (0, lookupTable_1.createLookupTable)(this.connection, admin);
        await (0, lookupTable_1.addAddressesToTable)(this.connection, admin, newLookupTable, [
            this.program.programId,
            this.programStatePDA,
            await this.getPlatformFeeTokenAccount(),
            raydium_sdk_v2_1.SYSTEM_PROGRAM_ID,
            spl_token_1.NATIVE_MINT,
            spl_token_1.TOKEN_PROGRAM_ID,
            spl_token_1.TOKEN_2022_PROGRAM_ID,
            spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
        ]);
        this.sharedLookupTable = newLookupTable.toBase58();
        return newLookupTable;
    }
    async addBaksetToSharedLookupTable({ basketId, admin, }) {
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        const basketMintPDA = this.basketMintPDA({ basketId });
        const creatorFeeTokenAccount = await this.getCreatorFeeTokenAccount({
            basketId,
        });
        const basketWsolAccount = await (0, helper_1.getTokenAccount)(this.connection, spl_token_1.NATIVE_MINT, basketConfigPDA);
        await (0, lookupTable_1.addAddressesToTable)(this.connection, admin, new web3_js_1.PublicKey(this.sharedLookupTable), [
            basketConfigPDA,
            basketMintPDA,
            creatorFeeTokenAccount,
            basketWsolAccount,
        ]);
    }
    /**
     * Transfers the admin role to a new account.
     * @param admin - The current admin account.
     * @param newAdmin - The new admin account.
     * @returns A promise that resolves to a transaction.
     */
    async transferAdmin({ admin, newAdmin, }) {
        return await this.program.methods
            .transferAdmin(newAdmin)
            .accounts({ admin })
            .transaction();
    }
    /**
     * Updates the rebalance margin.
     * @param admin - The admin account.
     * @param newMargin - The new margin.
     * @returns A promise that resolves to a transaction.
     */
    async updateRebalanceMargin({ admin, newMargin, }) {
        return await this.program.methods
            .updateRebalanceMargin(new anchor_1.BN(newMargin))
            .accounts({ admin, programState: this.programStatePDA })
            .transaction();
    }
    /**
     * Updates the fee. 10000 = 100% => 1000 = 1%
     * @param admin - The admin account.
     * @param newCreatorFeePercentage - The new creator fee percentage.
     * @param newPlatformFeePercentage - The new platform fee percentage.
     * @returns A promise that resolves to a transaction.
     */
    async updateFee({ admin, newCreatorFeePercentage, newPlatformFeePercentage, }) {
        return await this.program.methods
            .updateFee(new anchor_1.BN(newCreatorFeePercentage), new anchor_1.BN(newPlatformFeePercentage))
            .accounts({ admin, programState: this.programStatePDA })
            .transaction();
    }
    /**
     * Updates the platform fee wallet.
     * @param admin - The admin account.
     * @param newPlatformFeeWallet - The new platform fee wallet.
     * @returns A promise that resolves to a transaction.
     */
    async updatePlatformFeeWallet({ admin, newPlatformFeeWallet, }) {
        return await this.program.methods
            .updatePlatformFeeWallet(newPlatformFeeWallet)
            .accounts({ admin, programState: this.programStatePDA })
            .transaction();
    }
    async updateWhitelistedCreators({ admin, newWhitelistedCreators, }) {
        return await this.program.methods
            .updateWhitelistedCreators(newWhitelistedCreators)
            .accounts({ admin, programState: this.programStatePDA })
            .transaction();
    }
    /**
     * Creates vaults account for all basket.
     * @param creator - The creator account.
     * @param args - The basket arguments.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async createBasketVaultAccounts({ creator, args, basketId, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const vaults = [];
        for (let i = 0; i < args.components.length; i++) {
            const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(args.components[i].mint), creator, basketConfig);
            tx.add(outputTx);
            vaults.push(outputTokenAccount);
        }
        return { vaults, tx };
    }
    /**
     * Creates a basket.
     * @param creator - The creator account.
     * @param args - The basket arguments.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async createBasket({ creator, args, basketId, }) {
        const basketMint = this.basketMintPDA({ basketId });
        const createBasketTx = await this.program.methods
            .createBasket(args)
            .accountsPartial({
            creator,
            programState: this.programStatePDA,
            metadataAccount: this.metadataPDA({ mint: basketMint }),
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint: basketMint,
        })
            .transaction();
        const { tx: createPlatformFeeTokenAccountTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), creator, creator);
        if ((0, helper_1.isValidTransaction)(createPlatformFeeTokenAccountTx)) {
            createBasketTx.add(createPlatformFeeTokenAccountTx);
        }
        return createBasketTx;
    }
    /**
     * Creates a basket.
     * @param creator - The creator account.
     * @param basketId - The basket ID.
     * @param newRebalancer - New rebalancer in the basket
     * @returns A promise that resolves to a transaction.
     */
    async updateRebalancer({ creator, basketId, newRebalancer, }) {
        return await this.program.methods
            .updateRebalancer(newRebalancer)
            .accountsPartial({
            creator,
            basketConfig: this.basketConfigPDA({ basketId }),
        })
            .transaction();
    }
    /**
     * Deposits WSOL into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of WSOL to deposit.
     * @returns A promise that resolves to a transaction.
     */
    async depositWsol({ user, basketId, amount, userWsolAccount, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, basketConfig);
        if ((0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const depositWsolTx = await this.program.methods
            .depositWsol(new anchor_1.BN(amount))
            .accountsPartial({
            user,
            programState: this.programStatePDA,
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfig,
            userWsolAccount,
            vaultWsolAccount: outputTokenAccount,
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        })
            .transaction();
        tx.add(depositWsolTx);
        return tx;
    }
    /**
     * Buys a component.
     * @param userSourceOwner - The user source owner account.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    async buyComponent({ userSourceOwner, basketId, maxAmountIn, amountOut, ammId, unwrapSol = true, }) {
        const tx = new web3_js_1.Transaction();
        const data = await this.raydium.liquidity.getPoolInfoFromRpc({
            poolId: ammId,
        });
        const inputMint = spl_token_1.NATIVE_MINT;
        const basketConfig = this.basketConfigPDA({ basketId });
        const poolKeys = data.poolKeys;
        const baseIn = inputMint.toString() === poolKeys.mintA.address;
        const [mintIn, mintOut] = baseIn
            ? [poolKeys.mintA.address, poolKeys.mintB.address]
            : [poolKeys.mintB.address, poolKeys.mintA.address];
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(mintIn), userSourceOwner);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(mintOut), userSourceOwner, basketConfig);
        if ((0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const buyComponentTx = await this.program.methods
            .buyComponent(new anchor_1.BN(maxAmountIn), new anchor_1.BN(amountOut))
            .accountsPartial({
            userSourceOwner: userSourceOwner,
            programState: this.programStatePDA,
            basketConfig: basketConfig,
            amm: new web3_js_1.PublicKey(ammId),
            userFund: this.userFundPDA({ user: userSourceOwner, basketId }),
            ammAuthority: new web3_js_1.PublicKey(poolKeys.authority),
            ammOpenOrders: new web3_js_1.PublicKey(poolKeys.openOrders),
            ammCoinVault: new web3_js_1.PublicKey(poolKeys.vault.A),
            ammPcVault: new web3_js_1.PublicKey(poolKeys.vault.B),
            marketProgram: new web3_js_1.PublicKey(poolKeys.marketProgramId),
            market: new web3_js_1.PublicKey(poolKeys.marketId),
            marketBids: new web3_js_1.PublicKey(poolKeys.marketBids),
            marketAsks: new web3_js_1.PublicKey(poolKeys.marketAsks),
            marketEventQueue: new web3_js_1.PublicKey(poolKeys.marketEventQueue),
            marketCoinVault: new web3_js_1.PublicKey(poolKeys.marketBaseVault),
            marketPcVault: new web3_js_1.PublicKey(poolKeys.marketQuoteVault),
            marketVaultSigner: new web3_js_1.PublicKey(poolKeys.marketAuthority),
            ammProgram: new web3_js_1.PublicKey(poolKeys.programId),
            userTokenSource: inputTokenAccount,
            vaultTokenDestination: outputTokenAccount,
            vaultTokenDestinationMint: new web3_js_1.PublicKey(mintOut),
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        })
            .transaction();
        tx.add(buyComponentTx);
        if (unwrapSol && inputMint === spl_token_1.NATIVE_MINT) {
            tx.add((0, helper_1.unwrapSolIx)(inputTokenAccount, userSourceOwner, userSourceOwner));
        }
        return tx;
    }
    /**
     * Buys a component CPMM.
     * @param user - The user source owner account.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    async buyComponentCpmm({ user, basketId, amountOut, poolId, }) {
        const tx = new web3_js_1.Transaction();
        const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
        const basketConfig = this.basketConfigPDA({ basketId });
        const poolKeys = data.poolKeys;
        const poolInfo = data.poolInfo;
        const rpcData = data.rpcData;
        const baseIn = spl_token_1.NATIVE_MINT.toString() === poolKeys.mintA.address;
        const [mintA, mintB] = [
            new web3_js_1.PublicKey(poolInfo.mintA.address),
            new web3_js_1.PublicKey(poolInfo.mintB.address),
        ];
        const [mintIn, mintOut] = baseIn
            ? [poolKeys.mintA.address, poolKeys.mintB.address]
            : [poolKeys.mintB.address, poolKeys.mintA.address];
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(mintIn), user);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(mintOut), user, basketConfig);
        if ((0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const swapResult = raydium_sdk_v2_1.CurveCalculator.swapBaseOut({
            poolMintA: poolInfo.mintA,
            poolMintB: poolInfo.mintB,
            tradeFeeRate: rpcData.configInfo.tradeFeeRate,
            baseReserve: rpcData.baseReserve,
            quoteReserve: rpcData.quoteReserve,
            outputMint: mintOut,
            outputAmount: new anchor_1.BN(amountOut),
        });
        const buyComponentCpmmTx = await this.program.methods
            .buyComponentCpmm(swapResult.amountIn, new anchor_1.BN(amountOut))
            .accountsPartial({
            user: user,
            programState: this.programStatePDA,
            basketConfig: basketConfig,
            userFund: this.userFundPDA({ user, basketId }),
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolInfo.id),
            authority: new web3_js_1.PublicKey(poolKeys.authority),
            userTokenSource: inputTokenAccount,
            vaultTokenDestination: outputTokenAccount,
            userTokenSourceMint: baseIn ? mintA : mintB,
            vaultTokenDestinationMint: baseIn ? mintB : mintA,
            inputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
            outputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
            inputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintA" : "mintB"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            outputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintB" : "mintA"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
            observationState: (0, raydium_sdk_v2_1.getPdaObservationId)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey,
        })
            .transaction();
        tx.add(buyComponentCpmmTx);
        return tx;
    }
    /**
     * Buys a component using CLMM from Raydium.
     * @param user - The user source owner account.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param poolId - The CLMM pool ID.
     * @returns A promise that resolves to a transaction.
     */
    async buyComponentClmm({ user, basketId, amountOut, outputMint, poolId, slippage, }) {
        const tx = new web3_js_1.Transaction();
        const basketConfig = this.basketConfigPDA({ basketId });
        const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const poolInfo = data.poolInfo;
        const poolKeys = data.poolKeys;
        const clmmPoolInfo = data.computePoolInfo;
        const tickCache = data.tickData;
        const { remainingAccounts, ...res } = raydium_sdk_v2_1.PoolUtils.computeAmountIn({
            poolInfo: clmmPoolInfo,
            tickArrayCache: tickCache[poolId],
            amountOut,
            baseMint: outputMint,
            slippage,
            epochInfo: await this.raydium.fetchEpochInfo(),
        });
        let sqrtPriceLimitX64;
        sqrtPriceLimitX64 =
            outputMint.toString() === poolInfo.mintB.address
                ? raydium_sdk_v2_1.MIN_SQRT_PRICE_X64.add(new anchor_1.BN(1))
                : raydium_sdk_v2_1.MAX_SQRT_PRICE_X64.sub(new anchor_1.BN(1));
        const [programId, id] = [
            new web3_js_1.PublicKey(poolInfo.programId),
            new web3_js_1.PublicKey(poolInfo.id),
        ];
        const [mintAVault, mintBVault] = [
            new web3_js_1.PublicKey(poolKeys.vault.A),
            new web3_js_1.PublicKey(poolKeys.vault.B),
        ];
        const [mintA, mintB] = [
            new web3_js_1.PublicKey(poolInfo.mintA.address),
            new web3_js_1.PublicKey(poolInfo.mintB.address),
        ];
        const baseIn = spl_token_1.NATIVE_MINT.toString() === poolKeys.mintA.address;
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), user);
        const { tokenAccount: outputTokenAccount, tx: outputTx, tokenProgram: outputTokenProgram, } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(baseIn ? mintB : mintA), user, basketConfig);
        if ((0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const buyComponentTx = await this.program.methods
            .buyComponentClmm(new anchor_1.BN(amountOut), res.maxAmountIn.amount, sqrtPriceLimitX64)
            .accountsPartial({
            user: user,
            userFund: this.userFundPDA({ user, basketId }),
            programState: this.programStatePDA,
            basketConfig: basketConfig,
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolKeys.id),
            userTokenSource: inputTokenAccount,
            userTokenSourceMint: spl_token_1.NATIVE_MINT,
            vaultTokenDestination: outputTokenAccount,
            vaultTokenDestinationMint: baseIn ? mintB : mintA,
            outputTokenProgram,
            inputVault: baseIn ? mintAVault : mintBVault,
            outputVault: baseIn ? mintBVault : mintAVault,
            observationState: new web3_js_1.PublicKey(clmmPoolInfo.observationId),
        })
            .remainingAccounts(await (0, helper_1.buildClmmRemainingAccounts)(remainingAccounts, (0, raydium_sdk_v2_1.getPdaExBitmapAccount)(programId, id).publicKey))
            .transaction();
        tx.add(buyComponentTx);
        return tx;
    }
    /**
     * Sells a component.
     * @param user - The user account.
     * @param inputMint - The input mint.
     * @param basketId - The basket ID.
     * @param amountIn - The amount in.
     * @param minimumAmountOut - The minimum amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    async sellComponent({ user, inputMint, basketId, amountIn, minimumAmountOut, ammId, createNativeMintATA, unwrapSol, }) {
        const tx = new web3_js_1.Transaction();
        const basketMint = this.basketMintPDA({ basketId });
        const data = await this.raydium.liquidity.getPoolInfoFromRpc({
            poolId: ammId,
        });
        const poolKeys = data.poolKeys;
        const baseIn = inputMint.toString() === poolKeys.mintA.address;
        const [mintIn, mintOut] = baseIn
            ? [poolKeys.mintA.address, poolKeys.mintB.address]
            : [poolKeys.mintB.address, poolKeys.mintA.address];
        const basketConfig = this.basketConfigPDA({ basketId });
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(mintIn), basketConfig);
        const { tokenAccount: outputTokenAccount, tx: createNativeMintATATx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(mintOut), user, user);
        if (createNativeMintATA && (0, helper_1.isValidTransaction)(createNativeMintATATx)) {
            tx.add(createNativeMintATATx);
        }
        const sellComponentTx = await this.program.methods
            .sellComponent(new anchor_1.BN(amountIn), new anchor_1.BN(minimumAmountOut))
            .accountsPartial({
            user: user,
            programState: this.programStatePDA,
            basketConfig: basketConfig,
            basketMint: basketMint,
            amm: new web3_js_1.PublicKey(ammId),
            userFund: this.userFundPDA({ user, basketId }),
            ammAuthority: new web3_js_1.PublicKey(poolKeys.authority),
            ammOpenOrders: new web3_js_1.PublicKey(poolKeys.openOrders),
            ammCoinVault: new web3_js_1.PublicKey(poolKeys.vault.A),
            ammPcVault: new web3_js_1.PublicKey(poolKeys.vault.B),
            marketProgram: new web3_js_1.PublicKey(poolKeys.marketProgramId),
            market: new web3_js_1.PublicKey(poolKeys.marketId),
            marketBids: new web3_js_1.PublicKey(poolKeys.marketBids),
            marketAsks: new web3_js_1.PublicKey(poolKeys.marketAsks),
            marketEventQueue: new web3_js_1.PublicKey(poolKeys.marketEventQueue),
            marketCoinVault: new web3_js_1.PublicKey(poolKeys.marketBaseVault),
            marketPcVault: new web3_js_1.PublicKey(poolKeys.marketQuoteVault),
            marketVaultSigner: new web3_js_1.PublicKey(poolKeys.marketAuthority),
            ammProgram: new web3_js_1.PublicKey(poolKeys.programId),
            userTokenDestination: outputTokenAccount,
            vaultTokenSource: inputTokenAccount,
            vaultTokenSourceMint: new web3_js_1.PublicKey(mintIn),
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        })
            .transaction();
        tx.add(sellComponentTx);
        if (unwrapSol) {
            tx.add((0, spl_token_1.createCloseAccountInstruction)(outputTokenAccount, user, user));
        }
        return tx;
    }
    /**
     * Sell a component CPMM.
     * @param user - The user also payer.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    async sellComponentCpmm({ user, basketId, inputMint, amountIn, minimumAmountOut, poolId, createNativeMintATA, unwrapSol, }) {
        const tx = new web3_js_1.Transaction();
        const basketConfig = this.basketConfigPDA({ basketId });
        const basketMint = this.basketMintPDA({ basketId });
        const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
        const poolKeys = data.poolKeys;
        const poolInfo = data.poolInfo;
        const baseIn = inputMint.toString() === poolKeys.mintA.address;
        const [mintA, mintB] = [
            new web3_js_1.PublicKey(poolInfo.mintA.address),
            new web3_js_1.PublicKey(poolInfo.mintB.address),
        ];
        const [mintIn, mintOut] = baseIn
            ? [poolKeys.mintA.address, poolKeys.mintB.address]
            : [poolKeys.mintB.address, poolKeys.mintA.address];
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(mintIn), basketConfig);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(mintOut), user, user);
        if (createNativeMintATA && (0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const sellComponentTx = await this.program.methods
            .sellComponentCpmm(new anchor_1.BN(amountIn), new anchor_1.BN(minimumAmountOut))
            .accountsPartial({
            user: user,
            programState: this.programStatePDA,
            basketConfig: basketConfig,
            userFund: this.userFundPDA({ user, basketId }),
            basketMint: basketMint,
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
            authority: new web3_js_1.PublicKey(poolKeys.authority),
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolInfo.id),
            vaultTokenSource: inputTokenAccount,
            userTokenDestination: outputTokenAccount,
            vaultTokenSourceMint: baseIn ? mintA : mintB,
            userTokenDestinationMint: baseIn ? mintB : mintA,
            inputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
            outputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
            inputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintA" : "mintB"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            outputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintB" : "mintA"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            observationState: (0, raydium_sdk_v2_1.getPdaObservationId)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey,
        })
            .transaction();
        tx.add(sellComponentTx);
        if (unwrapSol) {
            tx.add((0, spl_token_1.createCloseAccountInstruction)(outputTokenAccount, user, user));
        }
        return tx;
    }
    /**
     * Sell a component CLMM.
     * @param user - The user also payer.
     * @param basketId - The basket ID.
     * @param maxAmountIn - The maximum amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @returns A promise that resolves to a transaction.
     */
    async sellComponentClmm({ user, basketId, amountIn, inputMint, poolId, slippage, createNativeMintATA, unwrapSol, }) {
        const tx = new web3_js_1.Transaction();
        const basketConfig = this.basketConfigPDA({ basketId });
        const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const poolInfo = data.poolInfo;
        const poolKeys = data.poolKeys;
        const clmmPoolInfo = data.computePoolInfo;
        const tickCache = data.tickData;
        const baseIn = inputMint.toString() === poolInfo.mintA.address;
        const { minAmountOut, remainingAccounts } = raydium_sdk_v2_1.PoolUtils.computeAmountOutFormat({
            poolInfo: clmmPoolInfo,
            tickArrayCache: tickCache[poolId],
            amountIn,
            tokenOut: poolInfo[baseIn ? "mintB" : "mintA"],
            slippage,
            epochInfo: await this.raydium.fetchEpochInfo(),
        });
        let sqrtPriceLimitX64;
        sqrtPriceLimitX64 = baseIn
            ? raydium_sdk_v2_1.MIN_SQRT_PRICE_X64.add(new anchor_1.BN(1))
            : raydium_sdk_v2_1.MAX_SQRT_PRICE_X64.sub(new anchor_1.BN(1));
        const [programId, id] = [
            new web3_js_1.PublicKey(poolInfo.programId),
            new web3_js_1.PublicKey(poolInfo.id),
        ];
        // const [mintAVault, mintBVault] = [
        //   new PublicKey(poolKeys.vault.A),
        //   new PublicKey(poolKeys.vault.B),
        // ];
        const [mintA, mintB] = [
            new web3_js_1.PublicKey(poolInfo.mintA.address),
            new web3_js_1.PublicKey(poolInfo.mintB.address),
        ];
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(inputMint), basketConfig);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), user, user);
        if (createNativeMintATA && (0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        // @TODO should be minAmountOut.amount.raw but I get negative value
        const otherAmountThreshold = new anchor_1.BN(0);
        const sellComponentTx = await this.program.methods
            .sellComponentClmm(amountIn, otherAmountThreshold, sqrtPriceLimitX64)
            .accountsPartial({
            user: user,
            programState: this.programStatePDA,
            basketConfig: basketConfig,
            userFund: this.userFundPDA({ user, basketId }),
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
            basketMint: this.basketMintPDA({ basketId }),
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolInfo.id),
            vaultTokenSource: inputTokenAccount,
            userTokenDestination: outputTokenAccount,
            vaultTokenSourceMint: baseIn ? mintA : mintB,
            userTokenDestinationMint: baseIn ? mintB : mintA,
            inputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
            outputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
            inputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintA" : "mintB"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            observationState: new web3_js_1.PublicKey(clmmPoolInfo.observationId),
        })
            .remainingAccounts(await (0, helper_1.buildClmmRemainingAccounts)(remainingAccounts, (0, raydium_sdk_v2_1.getPdaExBitmapAccount)(programId, id).publicKey))
            .transaction();
        tx.add(sellComponentTx);
        if (unwrapSol) {
            tx.add((0, spl_token_1.createCloseAccountInstruction)(outputTokenAccount, user, user));
        }
        return tx;
    }
    /**
     * Deposits WSOL into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of WSOL to deposit.
     * @returns A promise that resolves to a transaction.
     */
    async withdrawWsol({ user, basketId, amount, userWsolAccount, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, basketConfig);
        if ((0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const withdrawWsolTx = await this.program.methods
            .withdrawWsol(new anchor_1.BN(amount))
            .accountsPartial({
            user,
            programState: this.programStatePDA,
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfig,
            userWsolAccount,
            vaultWsolAccount: outputTokenAccount,
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        })
            .transaction();
        tx.add(withdrawWsolTx);
        return tx;
    }
    /**
     * Mints a basket token.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount.
     * @returns A promise that resolves to a transaction.
     */
    async mintBasketToken({ user, basketId, amount, }) {
        const tx = new web3_js_1.Transaction();
        const basketMint = this.basketMintPDA({ basketId });
        const basketConfig = this.basketConfigPDA({ basketId });
        const userFund = this.userFundPDA({ user, basketId });
        const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, basketMint, user, user);
        if ((0, helper_1.isValidTransaction)(userBasketTokenTx)) {
            tx.add(userBasketTokenTx);
        }
        const mintBasketTokenTx = await this.program.methods
            .mintBasketToken(new anchor_1.BN(amount))
            .accountsPartial({
            user,
            programState: this.programStatePDA,
            basketConfig,
            userFund,
            basketMint,
            userBasketTokenAccount,
        })
            .transaction();
        tx.add(mintBasketTokenTx);
        return tx;
    }
    /**
     * Redeems a basket token.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount.
     * @returns A promise that resolves to a transaction.
     */
    async redeemBasketToken({ user, basketId, amount, }) {
        const basketMint = this.basketMintPDA({ basketId });
        const basketConfig = this.basketConfigPDA({ basketId });
        const userBasketTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(basketMint, user, false);
        const burnBasketTokenTx = await this.program.methods
            .redeemBasketToken(new anchor_1.BN(amount))
            .accountsPartial({
            programState: this.programStatePDA,
            user,
            basketConfig,
            userFund: this.userFundPDA({ user, basketId }),
            basketMint,
            userBasketTokenAccount: userBasketTokenAccount,
        })
            .transaction();
        return burnBasketTokenTx;
    }
    /**
     * Starts rebalancing.
     * @param rebalancer - The rebalancer account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async startRebalancing({ rebalancer, basketId, }) {
        const basketConfigData = await this.getBasketConfig({ basketId });
        if (!basketConfigData) {
            return null;
        }
        else {
            if (basketConfigData.isRebalancing) {
                return null;
            }
            else {
                return await this.program.methods
                    .startRebalancing()
                    .accountsPartial({
                    rebalancer,
                    basketConfig: this.basketConfigPDA({ basketId }),
                })
                    .transaction();
            }
        }
    }
    /**
     * Stops rebalancing.
     * @param rebalancer - The rebalancer account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async stopRebalancing({ rebalancer, basketId, }) {
        const basketPDA = this.basketConfigPDA({ basketId });
        return await this.program.methods
            .stopRebalancing()
            .accountsPartial({
            rebalancer,
            basketConfig: basketPDA,
        })
            .transaction();
    }
    /**
     * Executes rebalancing.
     * @param rebalancer - The rebalancer account.
     * @param isSwapBaseOut - Whether to swap base out.
     * @param amount - The amount in when swap base in, or the amount out when swap base out.
     * @param otherAmountThreshold - Maximum amount in or minimum amount out.
     * @param ammId - The AMM ID.
     * @param basketId - The basket ID.
     * @param inputMint - The input mint.
     * @param outputMint - The output mint.
     * @param createTokenAccount - Whether to create the output token account.
     * @returns A promise that resolves to a transaction or null.
     */
    async executeRebalancing({ rebalancer, isSwapBaseOut, amount, otherAmountThreshold, ammId, basketId, inputMint, outputMint, createTokenAccount = true, }) {
        const tx = new web3_js_1.Transaction();
        const data = await this.raydium.liquidity.getPoolInfoFromRpc({
            poolId: ammId,
        });
        const basketMint = this.basketMintPDA({ basketId });
        const basketConfig = this.basketConfigPDA({ basketId });
        const poolKeys = data.poolKeys;
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(inputMint), basketConfig);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(outputMint), rebalancer, basketConfig);
        if (createTokenAccount && (0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const amountIn = isSwapBaseOut ? otherAmountThreshold : amount;
        const amountOut = isSwapBaseOut ? amount : otherAmountThreshold;
        const executeRebalancingTx = await this.program.methods
            .executeRebalancing(isSwapBaseOut, new anchor_1.BN(amountIn), new anchor_1.BN(amountOut))
            .accountsPartial({
            rebalancer,
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint,
            amm: new web3_js_1.PublicKey(ammId),
            ammAuthority: new web3_js_1.PublicKey(poolKeys.authority),
            ammOpenOrders: new web3_js_1.PublicKey(poolKeys.openOrders),
            ammCoinVault: new web3_js_1.PublicKey(poolKeys.vault.A),
            ammPcVault: new web3_js_1.PublicKey(poolKeys.vault.B),
            marketProgram: new web3_js_1.PublicKey(poolKeys.marketProgramId),
            market: new web3_js_1.PublicKey(poolKeys.marketId),
            marketBids: new web3_js_1.PublicKey(poolKeys.marketBids),
            marketAsks: new web3_js_1.PublicKey(poolKeys.marketAsks),
            marketEventQueue: new web3_js_1.PublicKey(poolKeys.marketEventQueue),
            marketCoinVault: new web3_js_1.PublicKey(poolKeys.marketBaseVault),
            marketPcVault: new web3_js_1.PublicKey(poolKeys.marketQuoteVault),
            marketVaultSigner: new web3_js_1.PublicKey(poolKeys.marketAuthority),
            ammProgram: new web3_js_1.PublicKey(poolKeys.programId),
            vaultTokenSource: inputTokenAccount,
            vaultTokenDestination: outputTokenAccount,
            vaultTokenSourceMint: new web3_js_1.PublicKey(inputMint),
            vaultTokenDestinationMint: new web3_js_1.PublicKey(outputMint),
        })
            .transaction();
        tx.add(executeRebalancingTx);
        return tx;
    }
    async executeRebalancingCpmm({ rebalancer, isSwapBaseOut, amount, otherAmountThreshold, poolId, basketId, inputMint, outputMint, createTokenAccount = true, }) {
        const tx = new web3_js_1.Transaction();
        const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
        const basketMint = this.basketMintPDA({ basketId });
        const basketConfig = this.basketConfigPDA({ basketId });
        const poolKeys = data.poolKeys;
        const poolInfo = data.poolInfo;
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, new web3_js_1.PublicKey(inputMint), basketConfig);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(outputMint), rebalancer, basketConfig);
        if (createTokenAccount && (0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;
        let inputVault;
        let outputVault;
        let inputTokenProgram;
        let outputTokenProgram;
        let inputTokenMint;
        let outputTokenMint;
        if (isInputMintA) {
            inputVault = new web3_js_1.PublicKey(poolKeys.vault.A);
            outputVault = new web3_js_1.PublicKey(poolKeys.vault.B);
            inputTokenProgram = new web3_js_1.PublicKey(poolKeys.mintA.programId);
            outputTokenProgram = new web3_js_1.PublicKey(poolKeys.mintB.programId);
            inputTokenMint = new web3_js_1.PublicKey(poolKeys.mintA.address);
            outputTokenMint = new web3_js_1.PublicKey(poolKeys.mintB.address);
        }
        else {
            inputVault = new web3_js_1.PublicKey(poolKeys.vault.B);
            outputVault = new web3_js_1.PublicKey(poolKeys.vault.A);
            inputTokenProgram = new web3_js_1.PublicKey(poolKeys.mintB.programId);
            outputTokenProgram = new web3_js_1.PublicKey(poolKeys.mintA.programId);
            inputTokenMint = new web3_js_1.PublicKey(poolKeys.mintB.address);
            outputTokenMint = new web3_js_1.PublicKey(poolKeys.mintA.address);
        }
        const amountIn = isSwapBaseOut ? otherAmountThreshold : amount;
        const amountOut = isSwapBaseOut ? amount : otherAmountThreshold;
        const executeRebalancingTx = await this.program.methods
            .executeRebalancingCpmm(isSwapBaseOut, new anchor_1.BN(amountIn), new anchor_1.BN(amountOut))
            .accountsPartial({
            rebalancer,
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint,
            authority: new web3_js_1.PublicKey(poolKeys.authority),
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolInfo.id),
            vaultTokenSourceMint: new web3_js_1.PublicKey(inputMint),
            vaultTokenDestinationMint: new web3_js_1.PublicKey(outputMint),
            vaultTokenSource: inputTokenAccount,
            vaultTokenDestination: outputTokenAccount,
            inputVault,
            outputVault,
            inputTokenProgram,
            outputTokenProgram,
            observationState: (0, raydium_sdk_v2_1.getPdaObservationId)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey,
        })
            .transaction();
        tx.add(executeRebalancingTx);
        return tx;
    }
    /**
     * Execute rebalancing using Raydium CLMM (Concentrated Liquidity Market Maker) pool
     * @param rebalancer - The rebalancer's public key who has permission to rebalance
     * @param isSwapBaseOut - Whether this is a swap where amount specified is the output amount
     * @param basketId - The ID of the basket being rebalanced
     * @param amount - The amount to swap (either input or output amount depending on isSwapBaseOut)
     * @param slippage - Slippage in basis points
     * @param poolId - The Raydium CLMM pool ID to execute the swap on
     * @param inputMint - The mint address of the input token
     * @param outputMint - The mint address of the output token
     */
    async executeRebalancingClmm({ rebalancer, isSwapBaseOut, basketId, amount, otherAmountThreshold, slippage, poolId, inputMint, outputMint, createTokenAccount = true, }) {
        const tx = new web3_js_1.Transaction();
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const poolInfo = data.poolInfo;
        const poolKeys = data.poolKeys;
        const clmmPoolInfo = data.computePoolInfo;
        const tickCache = data.tickData;
        let remainingAccounts;
        // let otherAmountThreshold;
        const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;
        const sqrtPriceLimitX64 = isInputMintA
            ? raydium_sdk_v2_1.MIN_SQRT_PRICE_X64.add(new anchor_1.BN(1))
            : raydium_sdk_v2_1.MAX_SQRT_PRICE_X64.sub(new anchor_1.BN(1));
        if (isSwapBaseOut) {
            const computed = raydium_sdk_v2_1.PoolUtils.computeAmountIn({
                poolInfo: clmmPoolInfo,
                tickArrayCache: tickCache[poolId],
                amountOut: new anchor_1.BN(amount),
                baseMint: outputMint,
                slippage,
                epochInfo: await this.raydium.fetchEpochInfo(),
            });
            remainingAccounts = computed.remainingAccounts;
        }
        else {
            const computed = raydium_sdk_v2_1.PoolUtils.computeAmountOut({
                poolInfo: clmmPoolInfo,
                tickArrayCache: tickCache[poolId],
                amountIn: new anchor_1.BN(amount),
                baseMint: inputMint,
                slippage,
                epochInfo: await this.raydium.fetchEpochInfo(),
                catchLiquidityInsufficient: true,
            });
            remainingAccounts = computed.remainingAccounts;
            // @TODO should be computed.minAmountOut.amount, but it's not working
            // otherAmountThreshold = new BN(0);
        }
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, outputMint, rebalancer, basketConfigPDA);
        if (createTokenAccount && (0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const executeRabalancingClmmTx = await this.program.methods
            .executeRebalancingClmm(isSwapBaseOut, new anchor_1.BN(amount), new anchor_1.BN(otherAmountThreshold), sqrtPriceLimitX64)
            .accountsPartial({
            rebalancer,
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint: this.basketMintPDA({ basketId }),
            vaultWrappedSol: spl_token_1.NATIVE_MINT,
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolKeys.id),
            vaultTokenSource: await (0, helper_1.getTokenAccount)(this.connection, inputMint, basketConfigPDA),
            vaultTokenDestination: outputTokenAccount,
            inputVault: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.vault.A)
                : new web3_js_1.PublicKey(poolKeys.vault.B),
            outputVault: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.vault.B)
                : new web3_js_1.PublicKey(poolKeys.vault.A),
            inputTokenProgram: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.mintA.programId)
                : new web3_js_1.PublicKey(poolKeys.mintB.programId),
            outputTokenProgram: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.mintB.programId)
                : new web3_js_1.PublicKey(poolKeys.mintA.programId),
            observationState: new web3_js_1.PublicKey(clmmPoolInfo.observationId),
            vaultTokenSourceMint: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.mintA.address)
                : new web3_js_1.PublicKey(poolKeys.mintB.address),
            vaultTokenDestinationMint: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.mintB.address)
                : new web3_js_1.PublicKey(poolKeys.mintA.address),
        })
            .remainingAccounts(await (0, helper_1.buildClmmRemainingAccounts)(remainingAccounts, (0, raydium_sdk_v2_1.getPdaExBitmapAccount)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey))
            .transaction();
        tx.add(executeRabalancingClmmTx);
        return tx;
    }
    async addRaydiumAmmToAddressLookupTable({ connection, signer, ammId, lookupTable, }) {
        const data = await this.raydium.liquidity.getPoolInfoFromRpc({
            poolId: ammId,
        });
        const MAX_LOOKUP_TABLE_ADDRESS = 256;
        const poolKeys = data.poolKeys;
        const addressesKey = [
            new web3_js_1.PublicKey(poolKeys.mintA.address),
            new web3_js_1.PublicKey(poolKeys.mintB.address),
            new web3_js_1.PublicKey(ammId),
            new web3_js_1.PublicKey(poolKeys.authority),
            new web3_js_1.PublicKey(poolKeys.openOrders),
            new web3_js_1.PublicKey(poolKeys.vault.A),
            new web3_js_1.PublicKey(poolKeys.vault.B),
            new web3_js_1.PublicKey(poolKeys.marketProgramId),
            new web3_js_1.PublicKey(poolKeys.marketId),
            new web3_js_1.PublicKey(poolKeys.marketBids),
            new web3_js_1.PublicKey(poolKeys.marketAsks),
            new web3_js_1.PublicKey(poolKeys.marketEventQueue),
            new web3_js_1.PublicKey(poolKeys.marketBaseVault),
            new web3_js_1.PublicKey(poolKeys.marketQuoteVault),
            new web3_js_1.PublicKey(poolKeys.marketAuthority),
            new web3_js_1.PublicKey(poolKeys.programId),
        ];
        if (lookupTable) {
            const addressesStored = await (0, lookupTable_1.findAddressesInTable)(connection, lookupTable);
            const addressToAdd = addressesKey.filter((address) => !addressesStored.some((stored) => stored.equals(address)));
            if (addressToAdd.length + addressesStored.length >=
                MAX_LOOKUP_TABLE_ADDRESS) {
                throw Error("Exceeds 256 addresses of lookup table");
            }
            await (0, lookupTable_1.addAddressesToTable)(connection, signer, lookupTable, addressToAdd);
        }
        else {
            const newLookupTable = await (0, lookupTable_1.createLookupTable)(connection, signer);
            await (0, lookupTable_1.addAddressesToTable)(connection, signer, newLookupTable, addressesKey);
            return newLookupTable;
        }
        return lookupTable;
    }
    async addRaydiumCpmmToAddressLookupTable({ connection, signer, poolId, lookupTable, }) {
        const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
        const MAX_LOOKUP_TABLE_ADDRESS = 256;
        const poolKeys = data.poolKeys;
        const poolInfo = data.poolInfo;
        const addressesKey = [
            new web3_js_1.PublicKey(poolKeys.mintA.address),
            new web3_js_1.PublicKey(poolKeys.mintB.address),
            new web3_js_1.PublicKey(poolId),
            new web3_js_1.PublicKey(poolKeys.authority),
            new web3_js_1.PublicKey(poolKeys.config.id),
            new web3_js_1.PublicKey(poolInfo.id),
            new web3_js_1.PublicKey(poolKeys.vault.A),
            new web3_js_1.PublicKey(poolKeys.vault.B),
            new web3_js_1.PublicKey(poolKeys.programId),
            (0, raydium_sdk_v2_1.getPdaObservationId)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey,
        ];
        if (lookupTable) {
            const addressesStored = await (0, lookupTable_1.findAddressesInTable)(connection, lookupTable);
            const addressToAdd = addressesKey.filter((address) => !addressesStored.some((stored) => stored.equals(address)));
            if (addressToAdd.length + addressesStored.length >=
                MAX_LOOKUP_TABLE_ADDRESS) {
                throw Error("Exceeds 256 addresses of lookup table");
            }
            await (0, lookupTable_1.addAddressesToTable)(connection, signer, lookupTable, addressToAdd);
        }
        else {
            const newLookupTable = await (0, lookupTable_1.createLookupTable)(connection, signer);
            await (0, lookupTable_1.addAddressesToTable)(connection, signer, newLookupTable, addressesKey);
            return newLookupTable;
        }
        return lookupTable;
    }
    async addRaydiumClmmToAddressLookupTable({ connection, signer, poolId, lookupTable, }) {
        const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const MAX_LOOKUP_TABLE_ADDRESS = 256;
        const poolKeys = data.poolKeys;
        const poolInfo = data.poolInfo;
        const addressesKey = [
            new web3_js_1.PublicKey(poolKeys.mintA.address),
            new web3_js_1.PublicKey(poolKeys.mintB.address),
            new web3_js_1.PublicKey(poolId),
            new web3_js_1.PublicKey(poolKeys.vault.A),
            new web3_js_1.PublicKey(poolKeys.vault.B),
            new web3_js_1.PublicKey(poolKeys.config.id),
            new web3_js_1.PublicKey(poolKeys.programId),
            (0, raydium_sdk_v2_1.getPdaObservationId)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey,
            new web3_js_1.PublicKey(poolKeys.exBitmapAccount),
        ];
        if (lookupTable) {
            const addressesStored = await (0, lookupTable_1.findAddressesInTable)(connection, lookupTable);
            const addressToAdd = addressesKey.filter((address) => !addressesStored.some((stored) => stored.equals(address)));
            if (addressToAdd.length + addressesStored.length >=
                MAX_LOOKUP_TABLE_ADDRESS) {
                throw Error("Exceeds 256 addresses of lookup table");
            }
            await (0, lookupTable_1.addAddressesToTable)(connection, signer, lookupTable, addressToAdd);
        }
        else {
            const newLookupTable = await (0, lookupTable_1.createLookupTable)(connection, signer);
            await (0, lookupTable_1.addAddressesToTable)(connection, signer, newLookupTable, addressesKey);
            return newLookupTable;
        }
        return lookupTable;
    }
    async generateLookupTableAccount() {
        const lut = (await this.connection.getAddressLookupTable(new web3_js_1.PublicKey(this.sharedLookupTable))).value;
        return [lut];
    }
    /**
     * Creates a bundle of transactions for buying components and minting basket tokens
     * @param params Bundle creation parameters
     * @returns Array of serialized transactions
     */
    async createBuyAndMintBundle({ user, basketId, slippage, inputAmount, mintAmount, buySwapData, swapsPerBundle, tokenInfo, }) {
        let tx = new web3_js_1.Transaction();
        const serializedTxs = [];
        // Create WSOL account and wrap SOL
        const { tokenAccount: wsolAccount, tx: createWsolAtaTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), user, user);
        if ((0, helper_1.isValidTransaction)(createWsolAtaTx)) {
            tx.add(createWsolAtaTx);
        }
        const wrappedSolIx = (0, helper_1.wrapSOLInstruction)(user, Number(inputAmount));
        tx.add(...wrappedSolIx);
        const deposit = (0, helper_1.findDepositAndRemoveInPlace)(buySwapData);
        if (deposit) {
            const depositIx = await this.depositWsol({
                user,
                basketId,
                amount: deposit.amountIn,
                userWsolAccount: wsolAccount,
            });
            tx.add(depositIx);
        }
        const tokenLuts = [];
        // create all the buy component transactions
        const buyComponentTxs = buySwapData.map((swap) => {
            const token = (0, helper_1.getTokenFromTokenInfo)(tokenInfo, swap.mint);
            tokenLuts.push(this.connection.getAddressLookupTable(new web3_js_1.PublicKey(token.lut)));
            let buyComponentTx;
            switch (token.type) {
                case "amm":
                    buyComponentTx = this.buyComponent({
                        userSourceOwner: user,
                        basketId,
                        maxAmountIn: Number(swap.maxAmountIn),
                        amountOut: Number(swap.amountOut),
                        ammId: token.poolId,
                        unwrapSol: false,
                    });
                    break;
                case "clmm":
                    buyComponentTx = this.buyComponentClmm({
                        user,
                        basketId,
                        amountOut: new anchor_1.BN(swap.amountOut),
                        outputMint: new web3_js_1.PublicKey(token.mint),
                        poolId: token.poolId,
                        slippage,
                    });
                    break;
                case "cpmm":
                    buyComponentTx = this.buyComponentCpmm({
                        user,
                        basketId,
                        amountOut: Number(swap.amountOut),
                        poolId: token.poolId,
                    });
                    break;
            }
            return buyComponentTx;
        });
        const asyncTasks = [];
        asyncTasks.push(this.jito.getTipAccounts());
        asyncTasks.push(this.jito.getTipInformation());
        asyncTasks.push(this.generateLookupTableAccount());
        asyncTasks.push(this.connection.getLatestBlockhash("confirmed"));
        const [tokenLutsResult, buyComponentTxsResult, asyncTasksResult] = await Promise.all([
            Promise.all(tokenLuts),
            Promise.all(buyComponentTxs),
            Promise.all(asyncTasks),
        ]);
        let [tipAccounts, tipInformation, addressLookupTablesAccount, recentBlockhash,] = asyncTasksResult;
        // Process each component
        for (let i = 0; i < buySwapData.length; i++) {
            if (i > 0 && i % swapsPerBundle === 0) {
                const serializedTx = this.jito.serializeJitoTransaction({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: user,
                });
                serializedTxs.push(serializedTx);
                tx = new web3_js_1.Transaction();
                addressLookupTablesAccount = await this.generateLookupTableAccount();
            }
            tx.add(buyComponentTxsResult[i]);
            const lut = tokenLutsResult[i].value;
            addressLookupTablesAccount.push(lut);
            // Handle final transaction in bundle
            if (i === buySwapData.length - 1) {
                const mintBasketTokenTx = await this.mintBasketToken({
                    user,
                    basketId,
                    amount: mintAmount,
                });
                tx.add(mintBasketTokenTx);
                tx.add((0, spl_token_1.createCloseAccountInstruction)(wsolAccount, user, user));
                const serializedTx = this.jito.serializeJitoTransaction({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: user,
                    jitoTipAccount: new web3_js_1.PublicKey(tipAccounts[Math.floor(Math.random() * tipAccounts.length)]),
                    amountInLamports: Math.floor(tipInformation?.landed_tips_50th_percentile * web3_js_1.LAMPORTS_PER_SOL),
                });
                serializedTxs.push(serializedTx);
            }
        }
        return serializedTxs;
    }
    /**
     * Creates a bundle of transactions for redeeming basket tokens and selling components
     * @param params Bundle creation parameters
     * @returns Array of serialized transactions
     */
    async createRedeemAndSellBundle({ user, basketId, slippage, redeemAmount, swapsPerBundle, tokenInfo, }) {
        const swapData = [];
        const swapBackupData = [];
        const basketConfigData = await this.getBasketConfig({ basketId });
        let withdrawData;
        basketConfigData.components.forEach((component) => {
            if (component.mint.toBase58() === spl_token_1.NATIVE_MINT.toBase58()) {
                withdrawData = {
                    type: "withdraw",
                    amount: (0, helper_1.restoreRawDecimal)(component.quantityInSysDecimal.mul(new anchor_1.BN(redeemAmount))).toString(),
                };
            }
            else {
                const getSwapDataInput = {
                    isSwapBaseOut: false,
                    inputMint: component.mint.toBase58(),
                    outputMint: spl_token_1.NATIVE_MINT.toBase58(),
                    amount: (0, helper_1.restoreRawDecimal)(component.quantityInSysDecimal.mul(new anchor_1.BN(redeemAmount))).toString(),
                    slippagePct: slippage,
                };
                swapData.push((0, helper_1.getSwapData)(getSwapDataInput));
                swapBackupData.push(getSwapDataInput);
            }
        });
        const swapDataResult = await Promise.all(swapData);
        (0, helper_1.checkAndReplaceSwapDataError)(swapDataResult, swapBackupData);
        const tokenLuts = [];
        const sellComponentTxs = swapDataResult.map((swap) => {
            const token = (0, helper_1.getTokenFromTokenInfo)(tokenInfo, swap.data.inputMint);
            tokenLuts.push(this.connection.getAddressLookupTable(new web3_js_1.PublicKey(token.lut)));
            let sellComponentTx;
            switch (token.type) {
                case "amm":
                    sellComponentTx = this.sellComponent({
                        user,
                        inputMint: new web3_js_1.PublicKey(swap.data.inputMint),
                        basketId,
                        amountIn: Number(swap.data.inputAmount),
                        minimumAmountOut: Number(swap.data.otherAmountThreshold),
                        ammId: token.poolId,
                    });
                    break;
                case "clmm":
                    sellComponentTx = this.sellComponentClmm({
                        user,
                        basketId,
                        amountIn: new anchor_1.BN(swap.data.inputAmount),
                        inputMint: new web3_js_1.PublicKey(swap.data.inputMint),
                        poolId: token.poolId,
                        slippage,
                    });
                    break;
                case "cpmm":
                    sellComponentTx = this.sellComponentCpmm({
                        user,
                        basketId,
                        inputMint: new web3_js_1.PublicKey(swap.data.inputMint),
                        amountIn: Number(swap.data.inputAmount),
                        minimumAmountOut: Number(swap.data.otherAmountThreshold),
                        poolId: token.poolId,
                    });
                    break;
            }
            return sellComponentTx;
        });
        const asyncTasks = [];
        asyncTasks.push(this.jito.getTipAccounts());
        asyncTasks.push(this.jito.getTipInformation());
        asyncTasks.push(this.generateLookupTableAccount());
        asyncTasks.push(this.connection.getLatestBlockhash("confirmed"));
        asyncTasks.push(this.getTokenBalance({
            mint: basketConfigData.mint,
            owner: user,
        }));
        const [tokenLutsResult, sellComponentTxsResult, asyncTasksResult] = await Promise.all([
            Promise.all(tokenLuts),
            Promise.all(sellComponentTxs),
            Promise.all(asyncTasks),
        ]);
        let [tipAccounts, tipInformation, addressLookupTablesAccount, recentBlockhash, userBasketTokenBalance,] = asyncTasksResult;
        let tx = new web3_js_1.Transaction();
        const serializedTxs = [];
        // Create native mint ATA
        const { tokenAccount: userWsolAccount, tx: createUserWsolAccount } = await (0, helper_1.getOrCreateNativeMintATA)(this.connection, user, user);
        if ((0, helper_1.isValidTransaction)(createUserWsolAccount)) {
            tx.add(createUserWsolAccount);
        }
        for (let i = 0; i < swapDataResult.length; i++) {
            if (i === 0) {
                tx.add(await this.redeemBasketToken({ user, basketId, amount: redeemAmount }));
            }
            else if (i % swapsPerBundle === 0) {
                const serializedTx = this.jito.serializeJitoTransaction({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: user,
                });
                serializedTxs.push(serializedTx);
                tx = new web3_js_1.Transaction();
                addressLookupTablesAccount = await this.generateLookupTableAccount();
            }
            tx.add(sellComponentTxsResult[i]);
            const lut = tokenLutsResult[i].value;
            addressLookupTablesAccount.push(lut);
            if (i === swapDataResult.length - 1) {
                if (withdrawData) {
                    tx.add(await this.withdrawWsol({
                        user,
                        basketId,
                        amount: withdrawData.amount,
                        userWsolAccount,
                    }));
                }
                tx.add((0, helper_1.unwrapSolIx)(userWsolAccount, user, user));
                // close basket token account if all basket tokens are redeemed
                if (userBasketTokenBalance == redeemAmount) {
                    tx.add((0, spl_token_1.createCloseAccountInstruction)((0, spl_token_1.getAssociatedTokenAddressSync)(basketConfigData.mint, user, false), user, user));
                }
                const serializedTx = this.jito.serializeJitoTransaction({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: user,
                    jitoTipAccount: new web3_js_1.PublicKey(tipAccounts[Math.floor(Math.random() * tipAccounts.length)]),
                    amountInLamports: Math.floor(tipInformation?.landed_tips_50th_percentile * web3_js_1.LAMPORTS_PER_SOL),
                });
                serializedTxs.push(serializedTx);
            }
        }
        return serializedTxs;
    }
    async createRebalanceBundle({ basketId, rebalancer, slippage, swapsPerBundle, rebalanceInfo, withStartRebalance, withStopRebalance, }) {
        const serializedTxs = [];
        let tx = new web3_js_1.Transaction();
        let addressLookupTablesAccount = await this.generateLookupTableAccount();
        const swapData = [];
        rebalanceInfo.forEach((rebalance) => {
            // if otherAmountThreshold is not set, we need to get the swap data
            if (!rebalance.otherAmountThreshold) {
                swapData.push((0, helper_1.getSwapData)({
                    isSwapBaseOut: rebalance.isSwapBaseOut,
                    inputMint: rebalance.inputMint,
                    outputMint: rebalance.outputMint,
                    amount: rebalance.amount,
                    slippagePct: slippage,
                }));
            }
        });
        const swapDataResult = await Promise.all(swapData);
        (0, helper_1.checkSwapDataError)(swapDataResult);
        const tokenLuts = [];
        const rebalanceTxs = [];
        for (let i = 0; i < rebalanceInfo.length; i++) {
            let rebalanceTx;
            const amount = rebalanceInfo[i].amount;
            const otherAmountThreshold = rebalanceInfo[i].otherAmountThreshold ||
                swapDataResult.find((swap) => swap.data.inputMint === rebalanceInfo[i].inputMint &&
                    swap.data.outputMint === rebalanceInfo[i].outputMint)?.data.otherAmountThreshold;
            switch (rebalanceInfo[i].type) {
                case "amm":
                    rebalanceTx = this.executeRebalancing({
                        rebalancer,
                        isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
                        amount,
                        otherAmountThreshold,
                        ammId: rebalanceInfo[i].poolId,
                        basketId,
                        inputMint: new web3_js_1.PublicKey(rebalanceInfo[i].inputMint),
                        outputMint: new web3_js_1.PublicKey(rebalanceInfo[i].outputMint),
                        // do not create token account for native mint because it is already created in the startRebalanceTx
                        createTokenAccount: rebalanceInfo[i].outputMint === spl_token_1.NATIVE_MINT.toBase58()
                            ? false
                            : true,
                    });
                    break;
                case "cpmm":
                    rebalanceTx = this.executeRebalancingCpmm({
                        rebalancer,
                        basketId,
                        isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
                        amount,
                        otherAmountThreshold,
                        poolId: rebalanceInfo[i].poolId,
                        inputMint: new web3_js_1.PublicKey(rebalanceInfo[i].inputMint),
                        outputMint: new web3_js_1.PublicKey(rebalanceInfo[i].outputMint),
                        createTokenAccount: rebalanceInfo[i].outputMint === spl_token_1.NATIVE_MINT.toBase58()
                            ? false
                            : true,
                    });
                    break;
                case "clmm":
                    rebalanceTx = this.executeRebalancingClmm({
                        rebalancer,
                        basketId,
                        isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
                        inputMint: new web3_js_1.PublicKey(rebalanceInfo[i].inputMint),
                        outputMint: new web3_js_1.PublicKey(rebalanceInfo[i].outputMint),
                        amount: rebalanceInfo[i].amount,
                        otherAmountThreshold,
                        poolId: rebalanceInfo[i].poolId,
                        slippage,
                        createTokenAccount: rebalanceInfo[i].outputMint === spl_token_1.NATIVE_MINT.toBase58()
                            ? false
                            : true,
                    });
                    break;
            }
            rebalanceTxs.push(rebalanceTx);
            tokenLuts.push(this.connection.getAddressLookupTable(new web3_js_1.PublicKey(rebalanceInfo[i].lut)));
        }
        const asyncTasks = [];
        asyncTasks.push(this.jito.getTipAccounts());
        asyncTasks.push(this.jito.getTipInformation());
        asyncTasks.push(this.connection.getLatestBlockhash("confirmed"));
        const [tokenLutsResult, rebalanceTxsResult, asyncTasksResult] = await Promise.all([
            Promise.all(tokenLuts),
            Promise.all(rebalanceTxs),
            Promise.all(asyncTasks),
        ]);
        let [tipAccounts, tipInformation, recentBlockhash] = asyncTasksResult;
        for (let i = 0; i < rebalanceInfo.length; i++) {
            if (i === 0) {
                if (withStartRebalance) {
                    const startRebalanceTx = await this.startRebalancing({
                        rebalancer,
                        basketId,
                    });
                    if ((0, helper_1.isValidTransaction)(startRebalanceTx)) {
                        tx.add(startRebalanceTx);
                    }
                }
                const { tx: createNativeMintATATx } = await (0, helper_1.getOrCreateNativeMintATA)(this.connection, rebalancer, this.basketConfigPDA({ basketId }));
                if ((0, helper_1.isValidTransaction)(createNativeMintATATx)) {
                    tx.add(createNativeMintATATx);
                }
            }
            else if (i % swapsPerBundle === 0) {
                const serializedTx = this.jito.serializeJitoTransaction({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: rebalancer,
                });
                serializedTxs.push(serializedTx);
                tx = new web3_js_1.Transaction();
                addressLookupTablesAccount = await this.generateLookupTableAccount();
            }
            tx.add(rebalanceTxsResult[i]);
            addressLookupTablesAccount.push(tokenLutsResult[i].value);
            if (i == rebalanceInfo.length - 1) {
                if (withStopRebalance) {
                    const stopRebalanceTx = await this.stopRebalancing({
                        rebalancer,
                        basketId,
                    });
                    tx.add(stopRebalanceTx);
                }
                const serializedTx = this.jito.serializeJitoTransaction({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: rebalancer,
                    jitoTipAccount: new web3_js_1.PublicKey(tipAccounts[Math.floor(Math.random() * tipAccounts.length)]),
                    amountInLamports: Math.floor(tipInformation?.landed_tips_50th_percentile * web3_js_1.LAMPORTS_PER_SOL),
                });
                serializedTxs.push(serializedTx);
            }
        }
        return serializedTxs;
    }
    async calculateOptimalInputAmounts({ basketId, userInputInLamports, basketPriceInLamports, slippagePct, feePct, bufferPct, }) {
        const idealBasketAmountInRawDecimal = new anchor_1.BN(userInputInLamports)
            .mul(new anchor_1.BN(constants_1.SYS_DECIMALS))
            .div(new anchor_1.BN(basketPriceInLamports));
        const basketConfigData = await this.getBasketConfig({
            basketId: new anchor_1.BN(basketId),
        });
        const swapData = [];
        let depositData;
        basketConfigData.components.forEach((component) => {
            if (component.mint.toBase58() === spl_token_1.NATIVE_MINT.toBase58()) {
                depositData = {
                    type: "deposit",
                    amount: (0, helper_1.restoreRawDecimalRoundUp)(component.quantityInSysDecimal.mul(idealBasketAmountInRawDecimal)).toString(),
                };
            }
            else {
                swapData.push((0, helper_1.getSwapData)({
                    isSwapBaseOut: true,
                    inputMint: spl_token_1.NATIVE_MINT.toBase58(),
                    outputMint: component.mint.toBase58(),
                    amount: (0, helper_1.restoreRawDecimalRoundUp)(component.quantityInSysDecimal.mul(idealBasketAmountInRawDecimal)).toString(),
                    slippagePct,
                }));
            }
        });
        const swapDataResult = await Promise.all(swapData);
        (0, helper_1.checkSwapDataError)(swapDataResult);
        let initialTotalAmountIn = swapDataResult.reduce((acc, curr) => acc.add(new anchor_1.BN(curr.data.inputAmount)), new anchor_1.BN(0));
        if (depositData?.amount) {
            initialTotalAmountIn = initialTotalAmountIn.add(new anchor_1.BN(depositData.amount));
        }
        const highestPriceImpactPct = swapDataResult.reduce((acc, curr) => Math.max(acc, curr.data.priceImpactPct), 0);
        // this should be equal to or less than 1 ex. 0.95
        let multiplier = 1 -
            (new anchor_1.BN(initialTotalAmountIn)
                .sub(new anchor_1.BN(userInputInLamports))
                .toNumber() /
                Number(userInputInLamports) +
                feePct / 100 +
                bufferPct / 100);
        // In case when the initialTotalAmountIn is less than the userInputInLamports,
        // the multiplier should be greater than 1
        if (initialTotalAmountIn.lt(new anchor_1.BN(userInputInLamports))) {
            multiplier =
                Number(userInputInLamports) / Number(initialTotalAmountIn) -
                    feePct / 100 -
                    bufferPct / 100;
        }
        let finalBasketAmountInRawDecimal = new anchor_1.BN(idealBasketAmountInRawDecimal.toNumber() * multiplier);
        // revised swap data based on the multiplier
        const revisedSwapData = [];
        basketConfigData.components.forEach((component) => {
            if (component.mint.toBase58() === spl_token_1.NATIVE_MINT.toBase58()) {
                revisedSwapData.push({
                    mint: component.mint.toBase58(),
                    amountIn: (0, helper_1.restoreRawDecimalRoundUp)(component.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString(),
                    maxAmountIn: (0, helper_1.restoreRawDecimalRoundUp)(component.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString(),
                    amountOut: (0, helper_1.restoreRawDecimalRoundUp)(component.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString(),
                });
            }
            else {
                const prevAmountIn = swapDataResult.find((swap) => swap.data.outputMint === component.mint.toBase58())?.data.inputAmount;
                const prevMaxAmountIn = swapDataResult.find((swap) => swap.data.outputMint === component.mint.toBase58())?.data.otherAmountThreshold;
                revisedSwapData.push({
                    mint: component.mint.toBase58(),
                    amountIn: prevAmountIn
                        ? Math.floor(Number(prevAmountIn) * multiplier).toString()
                        : "0",
                    maxAmountIn: prevMaxAmountIn
                        ? Math.floor(Number(prevMaxAmountIn) * multiplier).toString()
                        : "0",
                    amountOut: (0, helper_1.restoreRawDecimalRoundUp)(component.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString(),
                });
            }
        });
        // sort the revised swap data by the descending order of the amountIn
        revisedSwapData.sort((a, b) => Number(b.amountIn) - Number(a.amountIn));
        // @dev: debug
        console.log(JSON.stringify(revisedSwapData, null, 2));
        // calculate requred amount based on the revised swap data
        let i = 0;
        let preVaultBalance = 0;
        let requiredAmount = 0;
        while (i < revisedSwapData.length) {
            const result = (0, helper_1.processBuySwapData)(preVaultBalance, revisedSwapData[i], feePct);
            if (result.isEnough) {
                preVaultBalance = result.postVaultBalance;
                i++;
            }
            else {
                preVaultBalance += result.insufficientAmount;
                requiredAmount += result.insufficientAmount;
            }
        }
        let finalInputSolRequiredInLamports = Math.floor(Number(requiredAmount) * (1 + bufferPct / 100)).toString();
        // @dev: debug
        console.log({
            finalInputSolRequiredInLamports,
            finalBasketAmountInRawDecimal: finalBasketAmountInRawDecimal.toString(),
        });
        // if the finalInputSolRequiredInLamports still is greater than the userInputInLamports,
        // we need to adjust the multiplier and the swap data
        if (Number(finalInputSolRequiredInLamports) > Number(userInputInLamports)) {
            multiplier =
                Number(userInputInLamports) / Number(finalInputSolRequiredInLamports);
            finalInputSolRequiredInLamports = userInputInLamports;
            finalBasketAmountInRawDecimal = new anchor_1.BN(finalBasketAmountInRawDecimal.toNumber() * multiplier);
            revisedSwapData.forEach((swap) => {
                if (swap.mint === spl_token_1.NATIVE_MINT.toBase58()) {
                    swap.amountIn = (0, helper_1.restoreRawDecimalRoundUp)(basketConfigData.components
                        .find((component) => component.mint.toBase58() === swap.mint)
                        ?.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString();
                    swap.maxAmountIn = (0, helper_1.restoreRawDecimalRoundUp)(basketConfigData.components
                        .find((component) => component.mint.toBase58() === swap.mint)
                        ?.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString();
                    swap.amountOut = (0, helper_1.restoreRawDecimalRoundUp)(basketConfigData.components
                        .find((component) => component.mint.toBase58() === swap.mint)
                        ?.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString();
                }
                else {
                    swap.amountIn = Math.floor(Number(swap.amountIn) * multiplier).toString();
                    swap.maxAmountIn = Math.floor(Number(swap.maxAmountIn) * multiplier).toString();
                    swap.amountOut = (0, helper_1.restoreRawDecimalRoundUp)(basketConfigData.components
                        .find((component) => component.mint.toBase58() === swap.mint)
                        ?.quantityInSysDecimal.mul(finalBasketAmountInRawDecimal)).toString();
                }
            });
        }
        return {
            finalInputSolRequiredInLamports,
            revisedSwapData,
            highestPriceImpactPct,
            finalBasketAmountInRawDecimal: finalBasketAmountInRawDecimal.toString(),
        };
    }
    /**
     * Adds an event listener for the 'CreateBasket' event.
     * @param handler - The function to handle the event.
     */
    onCreateBasket(handler) {
        this.program.addEventListener("createBasket", handler);
    }
    /**
     * Adds an event listener for the 'DeleteRebalancer' event.
     * @param handler - The function to handle the event.
     */
    onDeleteRebalancer(handler) {
        this.program.addEventListener("updateRebalancer", handler);
    }
    /**
     * Adds an event listener for the 'TransferAdmin' event.
     * @param handler - The function to handle the event.
     */
    onTransferAdmin(handler) {
        this.program.addEventListener("transferAdmin", handler);
    }
    /**
     * Adds an event listener for the 'TransferBasket' event.
     * @param handler - The function to handle the event.
     */
    onTransferBasket(handler) {
        this.program.addEventListener("transferBasket", handler);
    }
    /**
     * Adds an event listener for the 'ExecuteRebalancing' event.
     * @param handler - The function to handle the event.
     */
    onExecuteRebalancing(handler) {
        this.program.addEventListener("executeRebalancing", handler);
    }
    /**
     * Adds an event listener for the 'StartRebalancing' event.
     * @param handler - The function to handle the event.
     */
    onStartRebalancing(handler) {
        this.program.addEventListener("startRebalancing", handler);
    }
    /**
     * Adds an event listener for the 'StopRebalancing' event.
     * @param handler - The function to handle the event.
     */
    onStopRebalancing(handler) {
        this.program.addEventListener("stopRebalancing", handler);
    }
    /**
     * Adds an event listener for the 'BuyComponent' event.
     * @param handler - The function to handle the event.
     */
    onBuyComponent(handler) {
        this.program.addEventListener("buyComponent", handler);
    }
    /**
     * Adds an event listener for the 'SellComponent' event.
     * @param handler - The function to handle the event.
     */
    onSellComponent(handler) {
        this.program.addEventListener("sellComponent", handler);
    }
    /**
     * Adds an event listener for the 'MintBasketToken' event.
     * @param handler - The function to handle the event.
     */
    onMintBasketToken(handler) {
        this.program.addEventListener("mintBasketToken", handler);
    }
    /**
     * Adds an event listener for the 'RedeemBasketToken' event.
     * @param handler - The function to handle the event.
     */
    onRedeemBasketToken(handler) {
        this.program.addEventListener("redeemBasketToken", handler);
    }
}
exports.PieProgram = PieProgram;
//# sourceMappingURL=pie-program.js.map