"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminInstructions = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const helper_1 = require("../../utils/helper");
const spl_token_1 = require("@solana/spl-token");
const state_1 = require("../state");
/**
 * Class for handling admin-related instructions
 */
class AdminInstructions extends state_1.ProgramStateManager {
    constructor(connection, programId) {
        super(programId, connection);
        this.connection = connection;
        this.programId = programId;
    }
    /**
     * Initializes the program.
     * @param admin - The admin account.
     * @returns A promise that resolves to a transaction.
     */
    async initialize({ initializer, admin, platformFeeWallet, platformFeePercentage, basketCreationFee, }) {
        const tx = await this.program.methods
            .initialize(admin, platformFeeWallet, platformFeePercentage, basketCreationFee)
            .accounts({ initializer })
            .transaction();
        const { tx: createPlatformFeeTokenAccountTx } = await (0, helper_1.getOrCreateTokenAccountTx)(this.connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), initializer, platformFeeWallet);
        if ((0, helper_1.isValidTransaction)(createPlatformFeeTokenAccountTx)) {
            tx.add(createPlatformFeeTokenAccountTx);
        }
        return tx;
    }
    /**
     * Update admin account
     */
    async updateAdmin({ admin, newAdmin, }) {
        return await this.program.methods
            .updateAdmin(newAdmin)
            .accounts({ admin })
            .transaction();
    }
    /**
     * Updates the fee. 10000 = 100% => 1000 = 1%
     * @param admin - The admin account.
     * @param newBasketCreationFee - The new basket creation fee in lamports.
     * @param newPlatformFeeBp - The new platform fee in basis points.
     * @returns A promise that resolves to a transaction.
     */
    async updateFee({ admin, newBasketCreationFee, newPlatformFeeBp, }) {
        return await this.program.methods
            .updateFee(new anchor_1.BN(newBasketCreationFee), new anchor_1.BN(newPlatformFeeBp))
            .accountsPartial({
            admin,
            programState: this.programStatePDA(),
        })
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
            .accountsPartial({ admin, programState: this.programStatePDA() })
            .transaction();
    }
    /**
     * Migrates a basket to a new version.
     * @param admin - The admin account.
     * @param basketId - The basket ID to migrate.
     * @returns A promise that resolves to a transaction.
     */
    async migrateBasket({ admin, basketId, }) {
        return this.program.methods
            .migrateBasket()
            .accountsPartial({
            admin,
            programState: this.programStatePDA(),
            basketConfig: this.basketConfigPDA({ basketId }),
        })
            .transaction();
    }
}
exports.AdminInstructions = AdminInstructions;
//# sourceMappingURL=admin-instructions.js.map