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
const PROGRAM_STATE = "program_state";
const USER_FUND = "user_fund";
const BASKET_CONFIG = "basket_config";
const BASKET_MINT = "basket_mint";
const MPL_TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
class PieProgram {
    constructor(connection, cluster, programId = PieIDL.address, sharedLookupTable = "7RQsMxGtKjshYzcpsaG4d4dydiru67wPy8wzDS2cVY3f") {
        this.connection = connection;
        this.cluster = cluster;
        this.sharedLookupTable = sharedLookupTable;
        this.idl = Object.assign({}, PieIDL);
        this.idl.address = programId;
    }
    async init() {
        this.raydium = await raydium_sdk_v2_1.Raydium.load({
            connection: this.connection,
            cluster: this.cluster,
            disableFeatureCheck: true,
            blockhashCommitment: "finalized",
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
        const platformFeeTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_1.NATIVE_MINT, programState.platformFeeWallet);
        return platformFeeTokenAccount;
    }
    async getCreatorFeeTokenAccount({ basketId, }) {
        const basketConfig = await this.getBasketConfig({ basketId });
        const creatorFeeTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_1.NATIVE_MINT, basketConfig.creator);
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
    async getTokenBalance({ mint, owner, }) {
        const tokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, owner, true);
        try {
            const balance = await this.connection.getTokenAccountBalance(tokenAccount);
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
    async initialize({ initializer, admin, creator, }) {
        const tx = await this.program.methods
            .initialize(admin, creator)
            .accounts({ initializer })
            .transaction();
        return tx;
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
    async depositWsol({ user, basketId, amount, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, spl_token_1.NATIVE_MINT, user);
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
            userWsolAccount: inputTokenAccount,
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
            inputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
            outputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
            inputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintA" : "mintB"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            outputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintB" : "mintA"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            inputTokenMint: baseIn ? mintA : mintB,
            outputTokenMint: baseIn ? mintB : mintA,
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
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(baseIn ? mintB : mintA), user, basketConfig);
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
            vaultTokenDestination: outputTokenAccount,
            inputVault: baseIn ? mintAVault : mintBVault,
            outputVault: baseIn ? mintBVault : mintAVault,
            observationState: new web3_js_1.PublicKey(clmmPoolInfo.observationId),
            inputVaultMint: baseIn ? mintA : mintB,
            outputVaultMint: baseIn ? mintB : mintA,
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
            mintIn: new web3_js_1.PublicKey(mintIn),
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
            inputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
            outputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
            inputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintA" : "mintB"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            outputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintB" : "mintA"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            inputTokenMint: baseIn ? mintA : mintB,
            outputTokenMint: baseIn ? mintB : mintA,
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
            inputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
            outputVault: new web3_js_1.PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
            inputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintA" : "mintB"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            outputTokenProgram: new web3_js_1.PublicKey(poolInfo[baseIn ? "mintB" : "mintA"].programId ?? spl_token_1.TOKEN_PROGRAM_ID),
            inputVaultMint: baseIn ? mintA : mintB,
            outputVaultMint: baseIn ? mintB : mintA,
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
    async withdrawWsol({ user, basketId, amount, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const inputTokenAccount = await (0, helper_1.getTokenAccount)(this.connection, spl_token_1.NATIVE_MINT, user);
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
            userWsolAccount: inputTokenAccount,
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
        tx.add(userBasketTokenTx);
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
        const vaultWrappedSol = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_1.NATIVE_MINT, basketPDA, true);
        return await this.program.methods
            .stopRebalancing()
            .accountsPartial({
            rebalancer,
            basketConfig: basketPDA,
            vaultWrappedSol: vaultWrappedSol,
            wrappedSolMint: spl_token_1.NATIVE_MINT,
        })
            .transaction();
    }
    /**
     * Executes rebalancing.
     * @param rebalancer - The rebalancer account.
     * @param isSwapBaseOut - Whether to swap base out.
     * @param amountIn - The amount in.
     * @param amountOut - The amount out.
     * @param ammId - The AMM ID.
     * @param basketId - The basket ID.
     * @param inputMint - The input mint.
     * @param outputMint - The output mint.
     * @param createTokenAccount - Whether to create the output token account.
     * @returns A promise that resolves to a transaction or null.
     */
    async executeRebalancing({ rebalancer, isSwapBaseOut, amountIn, amountOut, ammId, basketId, inputMint, outputMint, createTokenAccount = true, }) {
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
        const executeRebalancingTx = await this.program.methods
            .executeRebalancing(isSwapBaseOut, new anchor_1.BN(amountIn), new anchor_1.BN(amountOut))
            .accountsPartial({
            rebalancer,
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint,
            vaultWrappedSol: spl_token_1.NATIVE_MINT,
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
        })
            .transaction();
        tx.add(executeRebalancingTx);
        return tx;
    }
    async executeRebalancingCpmm({ rebalancer, isSwapBaseOut, amountIn, amountOut, poolId, basketId, inputMint, outputMint, createTokenAccount = true, }) {
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
        const executeRebalancingTx = await this.program.methods
            .executeRebalancingCpmm(isSwapBaseOut, new anchor_1.BN(amountIn), new anchor_1.BN(amountOut))
            .accountsPartial({
            rebalancer,
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint,
            vaultWrappedSol: spl_token_1.NATIVE_MINT,
            authority: new web3_js_1.PublicKey(poolKeys.authority),
            ammConfig: new web3_js_1.PublicKey(poolKeys.config.id),
            poolState: new web3_js_1.PublicKey(poolInfo.id),
            inputVault,
            outputVault,
            inputTokenProgram,
            outputTokenProgram,
            inputTokenMint,
            outputTokenMint,
            observationState: (0, raydium_sdk_v2_1.getPdaObservationId)(new web3_js_1.PublicKey(poolInfo.programId), new web3_js_1.PublicKey(poolInfo.id)).publicKey,
            vaultTokenSource: inputTokenAccount,
            vaultTokenDestination: outputTokenAccount,
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
    async executeRebalancingClmm({ rebalancer, isSwapBaseOut, basketId, amount, slippage, poolId, inputMint, outputMint, createTokenAccount = true, }) {
        const tx = new web3_js_1.Transaction();
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
        const poolInfo = data.poolInfo;
        const poolKeys = data.poolKeys;
        const clmmPoolInfo = data.computePoolInfo;
        const tickCache = data.tickData;
        let remainingAccounts;
        let otherAmountThreshold;
        const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;
        const sqrtPriceLimitX64 = isInputMintA
            ? raydium_sdk_v2_1.MIN_SQRT_PRICE_X64.add(new anchor_1.BN(1))
            : raydium_sdk_v2_1.MAX_SQRT_PRICE_X64.sub(new anchor_1.BN(1));
        if (isSwapBaseOut) {
            const computed = raydium_sdk_v2_1.PoolUtils.computeAmountIn({
                poolInfo: clmmPoolInfo,
                tickArrayCache: tickCache[poolId],
                amountOut: amount,
                baseMint: outputMint,
                slippage,
                epochInfo: await this.raydium.fetchEpochInfo(),
            });
            remainingAccounts = computed.remainingAccounts;
            otherAmountThreshold = computed.maxAmountIn.amount;
        }
        else {
            const computed = raydium_sdk_v2_1.PoolUtils.computeAmountOut({
                poolInfo: clmmPoolInfo,
                tickArrayCache: tickCache[poolId],
                amountIn: amount,
                baseMint: inputMint,
                slippage,
                epochInfo: await this.raydium.fetchEpochInfo(),
                catchLiquidityInsufficient: true,
            });
            remainingAccounts = computed.remainingAccounts;
            // @TODO should be computed.minAmountOut.amount, but it's not working
            otherAmountThreshold = new anchor_1.BN(0);
        }
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, outputMint, rebalancer, basketConfigPDA);
        if (createTokenAccount && (0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const executeRabalancingClmmTx = await this.program.methods
            .executeRebalancingClmm(isSwapBaseOut, amount, otherAmountThreshold, sqrtPriceLimitX64)
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
            observationState: new web3_js_1.PublicKey(clmmPoolInfo.observationId),
            inputVaultMint: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.mintA.address)
                : new web3_js_1.PublicKey(poolKeys.mintB.address),
            outputVaultMint: isInputMintA
                ? new web3_js_1.PublicKey(poolKeys.mintB.address)
                : new web3_js_1.PublicKey(poolKeys.mintA.address),
            tokenMint: new web3_js_1.PublicKey(poolKeys.mintA.address),
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
            spl_token_1.TOKEN_PROGRAM_ID,
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
            spl_token_1.TOKEN_PROGRAM_ID,
            spl_token_1.TOKEN_2022_PROGRAM_ID,
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
            spl_token_1.TOKEN_PROGRAM_ID,
            spl_token_1.TOKEN_2022_PROGRAM_ID,
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
    async createBuyAndMintBundle({ user, basketId, slippage, mintAmount, swapsPerBundle, tokenInfo, feePercentageInBasisPoints, }) {
        const tipAccounts = await (0, jito_1.getTipAccounts)();
        const tipInformation = await (0, jito_1.getTipInformation)();
        const serializedTxs = [];
        let tx = new web3_js_1.Transaction();
        let addressLookupTablesAccount = await this.generateLookupTableAccount();
        const recentBlockhash = await this.connection.getLatestBlockhash("finalized");
        const basketConfigData = await this.getBasketConfig({ basketId });
        const swapData = [];
        let depositData;
        basketConfigData.components.forEach((component) => {
            if (component.mint.toBase58() === spl_token_1.NATIVE_MINT.toBase58()) {
                depositData = {
                    type: "deposit",
                    amount: component.quantityInSysDecimal
                        .mul(new anchor_1.BN(mintAmount))
                        .div(new anchor_1.BN(10 ** 6))
                        .toNumber(),
                };
            }
            else {
                swapData.push((0, helper_1.getSwapData)({
                    isSwapBaseOut: true,
                    inputMint: spl_token_1.NATIVE_MINT.toBase58(),
                    outputMint: component.mint.toBase58(),
                    amount: component.quantityInSysDecimal
                        .mul(new anchor_1.BN(mintAmount))
                        .div(new anchor_1.BN(10 ** 6))
                        .toNumber(),
                    slippage,
                }));
            }
        });
        const swapDataResult = await Promise.all(swapData);
        (0, helper_1.checkSwapDataError)(swapDataResult);
        //@TODO remove this when other pools are available
        // for (let i = 0; i < swapDataResult.length; i++) {
        //   if (swapDataResult[i].data.routePlan[0].poolId !== tokenInfo[i].poolId) {
        //     console.log(
        //       `${tokenInfo[i].name}'s AMM has little liquidity, increase slippage`
        //     );
        //     swapDataResult[i].data.otherAmountThreshold = String(
        //       Number(swapDataResult[i].data.otherAmountThreshold) * 10
        //     );
        //   }
        // }
        // Calculate total amount needed
        const totalAmountIn = swapDataResult.reduce((acc, curr) => acc + Number(curr.data.otherAmountThreshold), 0) + depositData?.amount;
        // Create WSOL account and wrap SOL
        const { tokenAccount: wsolAccount, tx: createWsolAtaTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), user, user);
        if ((0, helper_1.isValidTransaction)(createWsolAtaTx)) {
            tx.add(createWsolAtaTx);
        }
        const wrappedSolIx = await (0, helper_1.wrappedSOLInstruction)(user, (0, helper_1.caculateTotalAmountWithFee)(totalAmountIn, feePercentageInBasisPoints));
        tx.add(...wrappedSolIx);
        if (depositData) {
            const depositIx = await this.depositWsol({
                user,
                basketId,
                amount: depositData.amount,
            });
            tx.add(depositIx);
            tx.add(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1500000 }));
        }
        // Process each component
        for (let i = 0; i < swapDataResult.length; i++) {
            if (i > 0 && i % swapsPerBundle === 0) {
                const serializedTx = await (0, jito_1.serializeJitoTransaction)({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: user,
                });
                serializedTxs.push(serializedTx);
                tx = new web3_js_1.Transaction();
                addressLookupTablesAccount = await this.generateLookupTableAccount();
            }
            const token = (0, helper_1.getTokenFromTokenInfo)(tokenInfo, swapDataResult[i].data.outputMint);
            let buyComponentTx;
            switch (token.type) {
                case "amm":
                    buyComponentTx = await this.buyComponent({
                        userSourceOwner: user,
                        basketId,
                        maxAmountIn: Number(swapDataResult[i].data.otherAmountThreshold),
                        amountOut: Number(swapDataResult[i].data.outputAmount),
                        ammId: token.poolId,
                        unwrapSol: false,
                    });
                    break;
                case "clmm":
                    buyComponentTx = await this.buyComponentClmm({
                        user,
                        basketId,
                        amountOut: new anchor_1.BN(swapDataResult[i].data.outputAmount),
                        outputMint: new web3_js_1.PublicKey(token.mint),
                        poolId: token.poolId,
                        slippage,
                    });
                    break;
                case "cpmm":
                    buyComponentTx = await this.buyComponentCpmm({
                        user,
                        basketId,
                        amountOut: Number(swapDataResult[i].data.outputAmount),
                        poolId: token.poolId,
                    });
                    break;
            }
            tx.add(buyComponentTx);
            const lut = (await this.connection.getAddressLookupTable(new web3_js_1.PublicKey(token.lut))).value;
            addressLookupTablesAccount.push(lut);
            // Handle final transaction in bundle
            if (i === swapData.length - 1) {
                const mintBasketTokenTx = await this.mintBasketToken({
                    user,
                    basketId,
                    amount: mintAmount,
                });
                tx.add(mintBasketTokenTx);
                tx.add((0, spl_token_1.createCloseAccountInstruction)(wsolAccount, user, user));
                const serializedTx = await (0, jito_1.serializeJitoTransaction)({
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
        const tipAccounts = await (0, jito_1.getTipAccounts)();
        const tipInformation = await (0, jito_1.getTipInformation)();
        const serializedTxs = [];
        let tx = new web3_js_1.Transaction();
        let addressLookupTablesAccount = await this.generateLookupTableAccount();
        const recentBlockhash = await this.connection.getLatestBlockhash("finalized");
        const swapData = [];
        const basketConfigData = await this.getBasketConfig({ basketId });
        let withdrawData;
        basketConfigData.components.forEach((component) => {
            if (component.mint.toBase58() === spl_token_1.NATIVE_MINT.toBase58()) {
                withdrawData = {
                    type: "withdraw",
                    amount: component.quantityInSysDecimal
                        .mul(new anchor_1.BN(redeemAmount))
                        .div(new anchor_1.BN(10 ** 6))
                        .toNumber(),
                };
            }
            else {
                swapData.push((0, helper_1.getSwapData)({
                    isSwapBaseOut: false,
                    inputMint: component.mint.toBase58(),
                    outputMint: spl_token_1.NATIVE_MINT.toBase58(),
                    amount: component.quantityInSysDecimal
                        .mul(new anchor_1.BN(redeemAmount))
                        .div(new anchor_1.BN(10 ** 6))
                        .toNumber(),
                    slippage,
                }));
            }
        });
        const swapDataResult = await Promise.all(swapData);
        (0, helper_1.checkSwapDataError)(swapDataResult);
        //@TODO remove this when other pools are available
        // for (let i = 0; i < swapDataResult.length; i++) {
        //   if (swapDataResult[i].data.routePlan[0].poolId !== tokenInfo[i].poolId) {
        //     console.log(
        //       `${tokenInfo[i].name}'s AMM has little liquidity, increase slippage`
        //     );
        //     swapDataResult[i].data.otherAmountThreshold =
        //       swapDataResult[i].data.otherAmountThreshold / 10;
        //   }
        // }
        // Create native mint ATA
        const { tokenAccount: nativeMintAta, tx: createNativeMintATATx } = await (0, helper_1.getOrCreateNativeMintATA)(this.connection, user, user);
        if ((0, helper_1.isValidTransaction)(createNativeMintATATx)) {
            tx.add(createNativeMintATATx);
        }
        for (let i = 0; i < swapDataResult.length; i++) {
            if (i === 0) {
                tx.add(await this.redeemBasketToken({ user, basketId, amount: redeemAmount }));
            }
            else if (i % swapsPerBundle === 0) {
                const serializedTx = await (0, jito_1.serializeJitoTransaction)({
                    recentBlockhash: recentBlockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: user,
                });
                serializedTxs.push(serializedTx);
                tx = new web3_js_1.Transaction();
                addressLookupTablesAccount = await this.generateLookupTableAccount();
            }
            let sellComponentTx;
            switch (tokenInfo[i].type) {
                case "amm":
                    sellComponentTx = await this.sellComponent({
                        user,
                        inputMint: new web3_js_1.PublicKey(swapDataResult[i].data.inputMint),
                        basketId,
                        amountIn: Number(swapDataResult[i].data.inputAmount),
                        minimumAmountOut: Number(swapDataResult[i].data.otherAmountThreshold),
                        ammId: tokenInfo[i].poolId,
                    });
                    break;
                case "clmm":
                    sellComponentTx = await this.sellComponentClmm({
                        user,
                        basketId,
                        amountIn: new anchor_1.BN(swapDataResult[i].data.inputAmount),
                        inputMint: new web3_js_1.PublicKey(swapDataResult[i].data.inputMint),
                        poolId: tokenInfo[i].poolId,
                        slippage,
                    });
                    break;
                case "cpmm":
                    sellComponentTx = await this.sellComponentCpmm({
                        user,
                        basketId,
                        inputMint: new web3_js_1.PublicKey(swapDataResult[i].data.inputMint),
                        amountIn: Number(swapDataResult[i].data.inputAmount),
                        minimumAmountOut: Number(swapDataResult[i].data.otherAmountThreshold),
                        poolId: tokenInfo[i].poolId,
                    });
                    break;
            }
            tx.add(sellComponentTx);
            const lut = (await this.connection.getAddressLookupTable(new web3_js_1.PublicKey(tokenInfo[i].lut))).value;
            addressLookupTablesAccount.push(lut);
            if (i === swapDataResult.length - 1) {
                if (withdrawData) {
                    tx.add(await this.withdrawWsol({
                        user,
                        basketId,
                        amount: withdrawData.amount,
                    }));
                }
                tx.add((0, helper_1.unwrapSolIx)(nativeMintAta, user, user));
                const serializedTx = await (0, jito_1.serializeJitoTransaction)({
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
        const tipAccounts = await (0, jito_1.getTipAccounts)();
        const tipInformation = await (0, jito_1.getTipInformation)();
        const serializedTxs = [];
        let tx = new web3_js_1.Transaction();
        let addressLookupTablesAccount = await this.generateLookupTableAccount();
        const swapData = [];
        rebalanceInfo.forEach((rebalance) => {
            swapData.push((0, helper_1.getSwapData)({
                isSwapBaseOut: rebalance.isSwapBaseOut,
                inputMint: rebalance.inputMint,
                outputMint: rebalance.outputMint,
                amount: Number(rebalance.amount),
                slippage,
            }));
        });
        const swapDataResult = await Promise.all(swapData);
        (0, helper_1.checkSwapDataError)(swapDataResult);
        const blockhash = await this.connection.getLatestBlockhash();
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
                const serializedTx = await (0, jito_1.serializeJitoTransaction)({
                    recentBlockhash: blockhash.blockhash,
                    transaction: tx,
                    lookupTables: addressLookupTablesAccount,
                    signer: rebalancer,
                });
                serializedTxs.push(serializedTx);
                tx = new web3_js_1.Transaction();
                addressLookupTablesAccount = await this.generateLookupTableAccount();
            }
            let rebalanceTx;
            switch (rebalanceInfo[i].type) {
                case "amm":
                    rebalanceTx = await this.executeRebalancing({
                        rebalancer,
                        isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
                        amountIn: rebalanceInfo[i].isSwapBaseOut
                            ? swapDataResult[i].data.otherAmountThreshold
                            : swapDataResult[i].data.inputAmount,
                        amountOut: rebalanceInfo[i].isSwapBaseOut
                            ? swapDataResult[i].data.outputAmount
                            : swapDataResult[i].data.otherAmountThreshold,
                        ammId: rebalanceInfo[i].poolId,
                        basketId,
                        inputMint: new web3_js_1.PublicKey(rebalanceInfo[i].inputMint),
                        outputMint: new web3_js_1.PublicKey(rebalanceInfo[i].outputMint),
                        // do not create token account for native mint because it is already created in the startRebalanceTx
                        createTokenAccount: rebalanceInfo[i].outputMint === spl_token_1.NATIVE_MINT.toBase58()
                            ? false
                            : true,
                    });
                    tx.add(rebalanceTx);
                    break;
                case "clmm":
                    rebalanceTx = await this.executeRebalancingClmm({
                        rebalancer,
                        basketId,
                        isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
                        inputMint: new web3_js_1.PublicKey(rebalanceInfo[i].inputMint),
                        outputMint: new web3_js_1.PublicKey(rebalanceInfo[i].outputMint),
                        amount: new anchor_1.BN(rebalanceInfo[i].amount),
                        poolId: rebalanceInfo[i].poolId,
                        slippage,
                        createTokenAccount: rebalanceInfo[i].outputMint === spl_token_1.NATIVE_MINT.toBase58()
                            ? false
                            : true,
                    });
                    tx.add(rebalanceTx);
                    break;
                case "cpmm":
                    rebalanceTx = await this.executeRebalancingCpmm({
                        rebalancer,
                        basketId,
                        isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
                        amountIn: rebalanceInfo[i].isSwapBaseOut
                            ? swapDataResult[i].data.otherAmountThreshold
                            : swapDataResult[i].data.inputAmount,
                        amountOut: rebalanceInfo[i].isSwapBaseOut
                            ? swapDataResult[i].data.outputAmount
                            : swapDataResult[i].data.otherAmountThreshold,
                        poolId: rebalanceInfo[i].poolId,
                        inputMint: new web3_js_1.PublicKey(rebalanceInfo[i].inputMint),
                        outputMint: new web3_js_1.PublicKey(rebalanceInfo[i].outputMint),
                        createTokenAccount: rebalanceInfo[i].outputMint === spl_token_1.NATIVE_MINT.toBase58()
                            ? false
                            : true,
                    });
                    tx.add(rebalanceTx);
                    break;
            }
            const lut = (await this.connection.getAddressLookupTable(new web3_js_1.PublicKey(rebalanceInfo[i].lut))).value;
            addressLookupTablesAccount.push(lut);
            if (i == rebalanceInfo.length - 1) {
                if (withStopRebalance) {
                    const stopRebalanceTx = await this.stopRebalancing({
                        rebalancer,
                        basketId,
                    });
                    tx.add(stopRebalanceTx);
                }
                const serializedTx = await (0, jito_1.serializeJitoTransaction)({
                    recentBlockhash: blockhash.blockhash,
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