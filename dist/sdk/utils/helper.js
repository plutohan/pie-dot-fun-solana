"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBuySwapData = exports.getTokenListFromSolanaClient = exports.restoreRawDecimalRoundUp = exports.restoreRawDecimal = void 0;
exports.createUserWithLamports = createUserWithLamports;
exports.createNewMint = createNewMint;
exports.mintTokenTo = mintTokenTo;
exports.sendTokenTo = sendTokenTo;
exports.sleep = sleep;
exports.createBasketComponents = createBasketComponents;
exports.getRaydiumPoolAccounts = getRaydiumPoolAccounts;
exports.getOrCreateTokenAccountIx = getOrCreateTokenAccountIx;
exports.buildClmmRemainingAccounts = buildClmmRemainingAccounts;
exports.wrapSOLInstruction = wrapSOLInstruction;
exports.showBasketConfigTable = showBasketConfigTable;
exports.showUserFundTable = showUserFundTable;
exports.showBasketVaultsTable = showBasketVaultsTable;
exports.getOrCreateTokenAccountTx = getOrCreateTokenAccountTx;
exports.getTokenAccount = getTokenAccount;
exports.isToken2022Mint = isToken2022Mint;
exports.unwrapSolIx = unwrapSolIx;
exports.getOrCreateNativeMintATA = getOrCreateNativeMintATA;
exports.getExplorerUrl = getExplorerUrl;
exports.getSwapData = getSwapData;
exports.checkSwapDataError = checkSwapDataError;
exports.checkAndReplaceSwapDataError = checkAndReplaceSwapDataError;
exports.isValidTransaction = isValidTransaction;
exports.caculateTotalAmountWithFee = caculateTotalAmountWithFee;
exports.getTokenFromTokenInfo = getTokenFromTokenInfo;
exports.simulateTransaction = simulateTransaction;
exports.findDepositAndRemoveInPlace = findDepositAndRemoveInPlace;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const anchor_1 = require("@coral-xyz/anchor");
const raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
const console_table_printer_1 = require("console-table-printer");
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../constants");
async function createUserWithLamports(connection, lamports) {
    const account = web3_js_1.Keypair.generate();
    const signature = await connection.requestAirdrop(account.publicKey, lamports * web3_js_1.LAMPORTS_PER_SOL);
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ ...block, signature });
    return account;
}
async function createNewMint(connection, creator, decimals) {
    const tokenMint = await (0, spl_token_1.createMint)(connection, creator, // payer
    creator.publicKey, // mintAuthority
    creator.publicKey, // freezeAuthority
    decimals // decimals
    );
    return tokenMint;
}
async function mintTokenTo(connection, tokenMint, mintAuthority, payer, to, amount) {
    const programId = (await isToken2022Mint(connection, tokenMint))
        ? spl_token_1.TOKEN_2022_PROGRAM_ID
        : spl_token_1.TOKEN_PROGRAM_ID;
    const userTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, payer, tokenMint, to, true, undefined, undefined, programId);
    const mintInfo = await (0, spl_token_1.getMint)(connection, tokenMint, undefined, programId);
    //mint for dever 3_000_000 tokens
    await (0, spl_token_1.mintTo)(connection, payer, tokenMint, userTokenAccount.address, mintAuthority, amount * 10 ** mintInfo.decimals);
    return userTokenAccount.address;
}
async function sendTokenTo(connection, tokenMint, owner, from, to, amount) {
    const programId = (await isToken2022Mint(connection, tokenMint))
        ? spl_token_1.TOKEN_2022_PROGRAM_ID
        : spl_token_1.TOKEN_PROGRAM_ID;
    const sourceTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenMint, from, true, programId);
    const destinationTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, owner, tokenMint, to, true, undefined, undefined, programId);
    const mintInfo = await (0, spl_token_1.getMint)(connection, tokenMint, undefined, programId);
    const tx = await (0, spl_token_1.transfer)(connection, owner, sourceTokenAccount, destinationTokenAccount.address, owner, amount * 10 ** mintInfo.decimals);
    return tx;
}
async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
async function createBasketComponents(connection, creator, ratios) {
    let components = [];
    const decimals = 6;
    for (let i = 0; i < ratios.length; i++) {
        const mint = await createNewMint(connection, creator, decimals);
        const component = {
            mint: mint,
            quantityInSysDecimal: new anchor_1.BN(ratios[i]),
        };
        components.push(component);
    }
    return components;
}
async function getRaydiumPoolAccounts(connection, raydium, ammId, inputMint, user, amountIn) {
    const txInstructions = [];
    const data = await raydium.liquidity.getPoolInfoFromRpc({
        poolId: ammId,
    });
    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;
    const [mintIn, mintOut] = baseIn
        ? [poolKeys.mintA.address, poolKeys.mintB.address]
        : [poolKeys.mintB.address, poolKeys.mintA.address];
    const inputTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(new web3_js_1.PublicKey(mintIn), user, false);
    const { tokenAccount: outputTokenAccount, ixs: outputIxs } = await getOrCreateTokenAccountIx(connection, new web3_js_1.PublicKey(mintOut), user, user);
    if (inputMint.equals(spl_token_1.NATIVE_MINT)) {
        const wrappedSolIx = wrapSOLInstruction(user, amountIn);
        outputIxs.push(...wrappedSolIx);
    }
    return { ixs: outputIxs, tokenAccount: outputTokenAccount };
}
async function getOrCreateTokenAccountIx(connection, mint, payer, owner) {
    const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner, true);
    let instructions = [];
    try {
        await (0, spl_token_1.getAccount)(connection, tokenAccount, "confirmed");
    }
    catch (error) {
        instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, tokenAccount, owner, mint, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID));
    }
    return { tokenAccount: tokenAccount, ixs: instructions };
}
async function buildClmmRemainingAccounts(tickArray, exTickArrayBitmap) {
    const remainingAccounts = [
        ...(exTickArrayBitmap
            ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }]
            : []),
        ...tickArray.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
    ];
    return remainingAccounts;
}
function wrapSOLInstruction(recipient, amount) {
    let ixs = [];
    const ata = (0, spl_token_1.getAssociatedTokenAddressSync)(spl_token_1.NATIVE_MINT, recipient);
    ixs.push(web3_js_1.SystemProgram.transfer({
        fromPubkey: recipient,
        toPubkey: ata,
        lamports: amount,
    }), (0, spl_token_1.createSyncNativeInstruction)(ata));
    return ixs;
}
async function showBasketConfigTable(connection, pieProgram, basketId) {
    const basketConfig = await pieProgram.getBasketConfig({ basketId });
    const basketMintInfo = await (0, spl_token_1.getMint)(connection, pieProgram.basketMintPDA({ basketId }));
    const table = new console_table_printer_1.Table({
        columns: [
            { name: "mint", alignment: "left", color: "cyan" },
            { name: "basketSupply", alignment: "left", color: "blue" },
            { name: "decimals", alignment: "left", color: "purple" },
            { name: "balance", alignment: "right", color: "green" },
            { name: "quantityInSysDecimal", alignment: "right", color: "yellow" },
        ],
    });
    for (let i = 0; i < basketConfig.components.length; i++) {
        const programId = (await isToken2022Mint(connection, basketConfig.components[i].mint))
            ? spl_token_1.TOKEN_2022_PROGRAM_ID
            : spl_token_1.TOKEN_PROGRAM_ID;
        const vaultTokenPDA = (0, spl_token_1.getAssociatedTokenAddressSync)(basketConfig.components[i].mint, pieProgram.basketConfigPDA({ basketId }), true, programId);
        const balance = await connection.getTokenAccountBalance(vaultTokenPDA);
        let component = basketConfig.components[i];
        table.addRow({
            mint: component.mint.toBase58(),
            basketSupply: basketMintInfo.supply,
            decimals: basketMintInfo.decimals,
            balance: balance.value.amount,
            quantityInSysDecimal: component.quantityInSysDecimal.toString(),
        });
    }
    return table;
}
async function showUserFundTable(pieProgram, userPubkey, basketId) {
    const userFund = await pieProgram.getUserFund({ user: userPubkey, basketId });
    if (!userFund) {
        console.log("User fund not found");
        return;
    }
    const table = new console_table_printer_1.Table({
        columns: [
            { name: "mint", alignment: "left", color: "cyan" },
            { name: "amount", alignment: "right", color: "green" },
        ],
    });
    for (let i = 0; i < userFund.components.length; i++) {
        let component = userFund.components[i];
        table.addRow({
            mint: component.mint.toBase58(),
            amount: component.amount.toString(),
        });
    }
    return table;
}
async function showBasketVaultsTable(basketVaults) {
    const table = new console_table_printer_1.Table({
        columns: [
            { name: "mint", alignment: "left", color: "cyan" },
            { name: "balance", alignment: "right", color: "green" },
        ],
    });
    for (let i = 0; i < basketVaults.length; i++) {
        const vault = basketVaults[i];
        table.addRow({
            mint: vault.mint.toBase58(),
            balance: vault.balance.toString(),
        });
    }
    return table;
}
async function getOrCreateTokenAccountTx(connection, mint, payer, owner) {
    const programId = (await isToken2022Mint(connection, mint))
        ? spl_token_1.TOKEN_2022_PROGRAM_ID
        : spl_token_1.TOKEN_PROGRAM_ID;
    const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner, true, programId);
    try {
        await (0, spl_token_1.getAccount)(connection, tokenAccount, "confirmed", programId);
        return { tokenAccount: tokenAccount, tx: null, tokenProgram: programId };
    }
    catch (error) {
        let transaction = new web3_js_1.Transaction();
        transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, tokenAccount, owner, mint, programId, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID));
        return {
            tokenAccount: tokenAccount,
            tx: transaction,
            tokenProgram: programId,
        };
    }
}
async function getTokenAccount(connection, mint, owner) {
    const programId = (await isToken2022Mint(connection, mint))
        ? spl_token_1.TOKEN_2022_PROGRAM_ID
        : spl_token_1.TOKEN_PROGRAM_ID;
    const tokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, owner, true, programId);
    return tokenAccount;
}
async function isToken2022Mint(connection, mint) {
    const accountInfo = await connection.getAccountInfo(mint);
    if (accountInfo.owner.toString() == spl_token_1.TOKEN_2022_PROGRAM_ID.toString()) {
        return true;
    }
    return false;
}
function unwrapSolIx(acc, destination, authority) {
    return (0, spl_token_1.createCloseAccountInstruction)(acc, destination, authority);
}
async function getOrCreateNativeMintATA(connection, payer, owner) {
    const { tokenAccount, tx } = await getOrCreateTokenAccountTx(connection, new web3_js_1.PublicKey(spl_token_1.NATIVE_MINT), payer, owner);
    return { tokenAccount, tx };
}
function getExplorerUrl(txid, endpoint) {
    const clusterParam = endpoint.includes("devnet") ? "?cluster=devnet" : "";
    return `https://solscan.io/tx/${txid}${clusterParam}`;
}
async function getSwapData({ isSwapBaseOut, inputMint, outputMint, amount, slippagePct, }) {
    const { data: swapResponse } = await axios_1.default.get(`${raydium_sdk_v2_1.API_URLS.SWAP_HOST}/compute/${isSwapBaseOut ? "swap-base-out" : "swap-base-in"}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippagePct * 100}&txVersion=V0`);
    return swapResponse;
}
function checkSwapDataError(swapData) {
    for (let i = 0; i < swapData.length; i++) {
        if (!swapData[i].success) {
            throw new Error(swapData[i].msg);
        }
    }
}
function checkAndReplaceSwapDataError(swapData, swapBackupData) {
    for (let i = 0; i < swapData.length; i++) {
        if (!swapData[i].success) {
            if (!swapBackupData[i].isSwapBaseOut) {
                swapData[i].data = {
                    ...swapBackupData[i],
                    otherAmountThreshold: "0",
                    outputAmount: "0",
                    swapType: "BaseIn",
                    inputAmount: swapBackupData[i].amount.toString(),
                    slippageBps: swapBackupData[i].slippagePct * 100,
                    priceImpactPct: 0,
                    routePlan: [],
                };
            }
            else {
                throw new Error(swapData[i].msg);
            }
        }
    }
}
function isValidTransaction(tx) {
    if (!tx)
        return false;
    if (!tx.instructions)
        return false;
    return tx.instructions.length > 0;
}
function caculateTotalAmountWithFee(amount, feePercentageInBasisPoints) {
    return Math.ceil(amount * (1 + feePercentageInBasisPoints / 10000));
}
function getTokenFromTokenInfo(tokenInfo, mint) {
    const token = tokenInfo.find((token) => token.mint === mint);
    if (!token) {
        throw new Error(`Token not found: ${mint}`);
    }
    return token;
}
async function simulateTransaction(connection, txInBase64) {
    const tx = web3_js_1.VersionedTransaction.deserialize(Buffer.from(txInBase64, "base64"));
    const simulateTx = await connection.simulateTransaction(tx, {
        replaceRecentBlockhash: true,
    });
    console.log(JSON.stringify(simulateTx));
    return simulateTx;
}
const restoreRawDecimal = (val) => {
    return val.div(new anchor_1.BN(constants_1.SYS_DECIMALS));
};
exports.restoreRawDecimal = restoreRawDecimal;
const restoreRawDecimalRoundUp = (val) => {
    if (val.mod(new anchor_1.BN(constants_1.SYS_DECIMALS)).isZero()) {
        return (0, exports.restoreRawDecimal)(val);
    }
    return (0, exports.restoreRawDecimal)(val).add(new anchor_1.BN(1));
};
exports.restoreRawDecimalRoundUp = restoreRawDecimalRoundUp;
const getTokenListFromSolanaClient = async () => {
    const { data } = await axios_1.default.get("https://pie-program-client-1032702417000.asia-east1.run.app/v1/pie-program/token-pools");
    return data.map((token) => ({
        name: token.name,
        mint: token.mint.toString(),
        poolId: token.poolId.toString(),
        lut: token.lookupTable.toString(),
        type: token.poolType === "POOL_TYPE_AMM"
            ? "amm"
            : token.poolType === "POOL_TYPE_CLMM"
                ? "clmm"
                : "cpmm",
    }));
};
exports.getTokenListFromSolanaClient = getTokenListFromSolanaClient;
const processBuySwapData = (preVaultBalance, swapData, feePct) => {
    if (preVaultBalance >= Number(swapData.maxAmountIn) * (1 + feePct / 100)) {
        return {
            isEnough: true,
            postVaultBalance: preVaultBalance - Number(swapData.amountIn) * (1 + feePct / 100),
        };
    }
    else {
        return {
            isEnough: false,
            insufficientAmount: Number(swapData.maxAmountIn) * (1 + feePct / 100) - preVaultBalance,
        };
    }
};
exports.processBuySwapData = processBuySwapData;
function findDepositAndRemoveInPlace(arr) {
    const index = arr.findIndex((item) => item.mint === spl_token_1.NATIVE_MINT.toBase58());
    if (index !== -1) {
        return arr.splice(index, 1)[0];
    }
    return null;
}
//# sourceMappingURL=helper.js.map