"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatorInstructions = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const state_1 = require("../state");
const helper_1 = require("../../utils/helper");
const helper_2 = require("../../utils/helper");
const spl_token_1 = require("@solana/spl-token");
const constants_1 = require("../../constants");
/**
 * Class for handling creator-related instructions
 */
class CreatorInstructions extends state_1.ProgramStateManager {
    constructor(connection, programId) {
        super(programId, connection);
        this.connection = connection;
        this.programId = programId;
    }
    /**
     * Creates a basket.
     * @param creator - The creator account.
     * @param args - The basket arguments.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async createBasket({ creator, args, basketId, }) {
        const programState = await this.getProgramState();
        const basketMint = this.basketMintPDA({ basketId });
        const createBasketTx = await this.program.methods
            .createBasket(args)
            .accountsPartial({
            creator,
            programState: this.programStatePDA(),
            metadataAccount: this.metadataPDA({ mint: basketMint }),
            basketConfig: this.basketConfigPDA({ basketId }),
            basketMint: basketMint,
            platformFeeWallet: programState.platformFeeWallet,
        })
            .transaction();
        const { tx: createPlatformFeeTokenAccountTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), creator, creator);
        if ((0, helper_1.isValidTransaction)(createPlatformFeeTokenAccountTx)) {
            createBasketTx.add(createPlatformFeeTokenAccountTx);
        }
        return createBasketTx;
    }
    /**
     * Creates a basket with token weights
     * @param creator - The creator account.
     * @param args - CreateBasketWithTokenWeightsArgs
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async createBasketWithTokenWeights({ creator, args, targetBasketTokenPriceInLamports = new anchor_1.BN(0.1 * web3_js_1.LAMPORTS_PER_SOL), }) {
        const programState = await this.getProgramState();
        const basketId = programState.basketCounter;
        const totalWeightInBp = args.tokenWeights.reduce((acc, weight) => acc + weight.weightInBp, 0);
        if (totalWeightInBp !== 10000) {
            throw new Error("Total weight in basis points must be 10000");
        }
        const tokenPriceAndDecimals = await Promise.all(args.tokenWeights.map(async (weight) => {
            return (0, helper_1.getTokenPriceAndDecimals)({
                mint: weight.mint,
                connection: this.connection,
            });
        }));
        const components = [];
        for (let i = 0; i < args.tokenWeights.length; i++) {
            const { price, decimals } = tokenPriceAndDecimals[i];
            const quantityInSysDecimal = targetBasketTokenPriceInLamports
                .mul(new anchor_1.BN(args.tokenWeights[i].weightInBp))
                .div(new anchor_1.BN(constants_1.BASIS_POINTS))
                .mul(new anchor_1.BN(10 ** decimals))
                // .mul(new BN(SYS_DECIMALS))
                .div(new anchor_1.BN(price.rawAmount));
            components.push({
                mint: args.tokenWeights[i].mint,
                quantityInSysDecimal,
            });
        }
        console.log({ components });
        const createBasketTx = await this.createBasket({
            creator,
            args: { ...args, components },
            basketId,
        });
        return createBasketTx;
    }
    /**
     * Update the rebalancer for a basket
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
     * Inactivate a basket
     */
    async inactivateBasket({ creator, basketId, }) {
        return await this.program.methods
            .inactivateBasket()
            .accountsPartial({
            creator,
            basketConfig: this.basketConfigPDA({ basketId }),
        })
            .transaction();
    }
}
exports.CreatorInstructions = CreatorInstructions;
//# sourceMappingURL=creator-instructions.js.map