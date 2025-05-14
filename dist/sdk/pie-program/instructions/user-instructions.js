"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInstructions = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const state_1 = require("../state");
const helper_1 = require("../../utils/helper");
const spl_token_1 = require("@solana/spl-token");
const helper_2 = require("../../utils/helper");
const jupiter_1 = require("../../utils/jupiter");
const constants_1 = require("../../constants");
/**
 * Class for handling buy-related instructions
 */
class UserInstructions extends state_1.ProgramStateManager {
    constructor(connection, programId) {
        super(programId, connection);
        this.connection = connection;
        this.programId = programId;
    }
    /**
     * Initializes the user balance.
     * @param user - The user account.
     * @returns A promise that resolves to a transaction.
     */
    async initializeUserBalance({ user, }) {
        const tx = new web3_js_1.Transaction();
        const initializeUserBalanceTx = await this.program.methods
            .initializeUserBalance()
            .accountsPartial({ user })
            .transaction();
        tx.add(initializeUserBalanceTx);
        return tx;
    }
    /**
     * Deposits WSOL into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of WSOL to deposit.
     * @returns A promise that resolves to a transaction.
     */
    async depositWsol({ user, basketId, amount, }) {
        const programState = await this.getProgramState();
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        const basketConfig = await this.getBasketConfig({ basketId });
        const tx = new web3_js_1.Transaction();
        const { tokenAccount: userWsolAccount, tx: createUserWsolAccountTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, user);
        if ((0, helper_1.isValidTransaction)(createUserWsolAccountTx)) {
            tx.add(createUserWsolAccountTx);
        }
        tx.add(...(0, helper_1.wrapSOLIx)(user, amount));
        const { tokenAccount: creatorFeeTokenAccount, tx: creatorFeeTokenAccountCreationTx, } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, basketConfig.creator);
        if ((0, helper_1.isValidTransaction)(creatorFeeTokenAccountCreationTx)) {
            tx.add(creatorFeeTokenAccountCreationTx);
        }
        const { tokenAccount: platformFeeTokenAccount, tx: platformFeeTokenAccountCreationTx, } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, programState.platformFeeWallet);
        if ((0, helper_1.isValidTransaction)(platformFeeTokenAccountCreationTx)) {
            tx.add(platformFeeTokenAccountCreationTx);
        }
        const { tokenAccount: vaultWsolAccount, tx: createVaultWsolAccountTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, basketConfigPDA);
        if ((0, helper_1.isValidTransaction)(createVaultWsolAccountTx)) {
            tx.add(createVaultWsolAccountTx);
        }
        const depositWsolTx = await this.program.methods
            .depositWsol(new anchor_1.BN(amount))
            .accountsPartial({
            user,
            programState: this.programStatePDA(),
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfigPDA,
            userWsolAccount,
            vaultWsolAccount,
            creatorFeeTokenAccount,
            platformFeeTokenAccount,
        })
            .transaction();
        tx.add(depositWsolTx);
        return tx;
    }
    /**
     * Buys a component using Jupiter.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of component to buy.
     * @returns A promise that resolves to a transaction.
     */
    async buyComponentJupiter({ user, basketId, outputMint, amount, swapMode, maxAccounts, slippageBps, dynamicSlippage, }) {
        const tx = new web3_js_1.Transaction();
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        const { swapInstructions, addressLookupTableAccounts } = await (0, jupiter_1.createJupiterSwapIx)({
            connection: this.connection,
            inputMint: spl_token_1.NATIVE_MINT,
            outputMint,
            amount,
            fromAccount: basketConfigPDA,
            swapMode,
            maxAccounts,
            slippageBps,
            dynamicSlippage,
        });
        const { tokenAccount: vaultTokenDestination, tx: createVaultTokenDestinationTx, tokenProgram: outputTokenProgram, } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, outputMint, user, basketConfigPDA);
        if ((0, helper_1.isValidTransaction)(createVaultTokenDestinationTx)) {
            tx.add(createVaultTokenDestinationTx);
        }
        const buyComponentJupiterTx = await this.program.methods
            .buyComponentJupiter(Buffer.from(swapInstructions.swapInstruction.data, "base64"))
            .accountsPartial({
            user,
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfigPDA,
            vaultTokenDestination: vaultTokenDestination,
            outputTokenProgram,
            jupiterProgram: new web3_js_1.PublicKey(constants_1.JUPITER_PROGRAM_ID),
        })
            .remainingAccounts(swapInstructions.swapInstruction.accounts.map((acc) => ({
            pubkey: new web3_js_1.PublicKey(acc.pubkey),
            isSigner: false,
            isWritable: acc.isWritable,
        })))
            .instruction();
        tx.add(buyComponentJupiterTx);
        // calculate tx length
        const message = new web3_js_1.TransactionMessage({
            payerKey: user,
            recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
            instructions: [buyComponentJupiterTx],
        }).compileToV0Message(addressLookupTableAccounts);
        const versionedTx = new web3_js_1.VersionedTransaction(message);
        const serializedTx = versionedTx.serialize();
        return {
            buyComponentJupiterTx: tx,
            addressLookupTableAccounts,
            txLength: serializedTx.length,
        };
    }
    /**
     * Mints a basket token.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async mintBasketToken({ user, basketId, }) {
        const tx = new web3_js_1.Transaction();
        const basketMint = this.basketMintPDA({ basketId });
        const basketConfig = this.basketConfigPDA({ basketId });
        const userFund = this.userFundPDA({ user, basketId });
        const userBalance = await this.getUserBalance({ user });
        if (!userBalance) {
            tx.add(await this.initializeUserBalance({
                user,
            }));
        }
        const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, basketMint, user, user);
        if ((0, helper_1.isValidTransaction)(userBasketTokenTx)) {
            tx.add(userBasketTokenTx);
        }
        const mintBasketTokenTx = await this.program.methods
            .mintBasketToken()
            .accountsPartial({
            user,
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
     * Withdraws a WSOL from the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @returns A promise that resolves to a transaction.
     */
    async withdrawWsol({ user, basketId, }) {
        const basketConfigPDA = this.basketConfigPDA({ basketId });
        const basketConfig = await this.getBasketConfig({ basketId });
        const tx = new web3_js_1.Transaction();
        const { tokenAccount: userWsolAccount, tx: createUserWsolAccountTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, user);
        if ((0, helper_1.isValidTransaction)(createUserWsolAccountTx)) {
            tx.add(createUserWsolAccountTx);
        }
        const { tokenAccount: creatorFeeTokenAccount, tx: creatorFeeTokenAccountCreationTx, } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, spl_token_1.NATIVE_MINT, user, basketConfig.creator);
        if ((0, helper_1.isValidTransaction)(creatorFeeTokenAccountCreationTx)) {
            tx.add(creatorFeeTokenAccountCreationTx);
        }
        const withdrawWsolTx = await this.program.methods
            .withdrawWsol()
            .accountsPartial({
            user,
            programState: this.programStatePDA(),
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfigPDA,
            userWsolAccount,
            platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
            creatorFeeTokenAccount,
        })
            .transaction();
        tx.add(withdrawWsolTx);
        tx.add((0, helper_1.unwrapSolIx)(userWsolAccount, user, user));
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
            programState: this.programStatePDA(),
            user,
            basketConfig,
            userFund: this.userFundPDA({ user, basketId }),
            basketMint,
            userBasketTokenAccount: userBasketTokenAccount,
        })
            .transaction();
        return burnBasketTokenTx;
    }
    ///////////////////////////////
    //       DEPRECATED          //
    ///////////////////////////////
    /**
     * Deposits a component into the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of component to deposit.
     * @param mint - The mint of the component.
     * @returns A promise that resolves to a transaction.
     */
    async depositComponent({ user, basketId, amount, mint, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const { tokenAccount: userTokenAccount } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, mint, user, user);
        const { tokenAccount: outputTokenAccount, tx: outputTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, mint, user, basketConfig);
        if ((0, helper_1.isValidTransaction)(outputTx)) {
            tx.add(outputTx);
        }
        const depositComponentTx = await this.program.methods
            .depositComponent(new anchor_1.BN(amount))
            .accountsPartial({
            user,
            programState: this.programStatePDA(),
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfig,
            userTokenAccount,
            vaultTokenAccount: outputTokenAccount,
        })
            .transaction();
        tx.add(depositComponentTx);
        return tx;
    }
    /**
     * Withdraws a component from the basket.
     * @param user - The user account.
     * @param basketId - The basket ID.
     * @param amount - The amount of component to withdraw.
     * @param mint - The mint of the component.
     * @returns A promise that resolves to a transaction.
     */
    async withdrawComponent({ user, basketId, amount, mint, }) {
        const basketConfig = this.basketConfigPDA({ basketId });
        const tx = new web3_js_1.Transaction();
        const { tokenAccount: vaultTokenAccount } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, mint, user, basketConfig);
        const { tokenAccount: userTokenAccount, tx: createUserTokenAccountTx } = await (0, helper_2.getOrCreateTokenAccountTx)(this.connection, mint, user, user);
        if ((0, helper_1.isValidTransaction)(createUserTokenAccountTx)) {
            tx.add(createUserTokenAccountTx);
        }
        const withdrawComponentTx = await this.program.methods
            .withdrawComponent(new anchor_1.BN(amount))
            .accountsPartial({
            user,
            programState: this.programStatePDA(),
            userFund: this.userFundPDA({ user, basketId }),
            basketConfig: basketConfig,
            userTokenAccount,
            vaultTokenAccount,
        })
            .transaction();
        tx.add(withdrawComponentTx);
        return tx;
    }
}
exports.UserInstructions = UserInstructions;
//# sourceMappingURL=user-instructions.js.map