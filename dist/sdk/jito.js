"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTipInformation = getTipInformation;
exports.getTipAccounts = getTipAccounts;
exports.sendBundle = sendBundle;
exports.getInflightBundleStatuses = getInflightBundleStatuses;
exports.simulateBundle = simulateBundle;
exports.serializeJitoTransaction = serializeJitoTransaction;
exports.signSerializedTransaction = signSerializedTransaction;
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const web3_js_3 = require("@solana/web3.js");
const constants_1 = require("./constants");
const axios_1 = __importDefault(require("axios"));
async function getTipInformation() {
    try {
        const res = await axios_1.default.get("https://bundles.jito.wtf/api/v1/bundles/tip_floor");
        return res.data[0];
    }
    catch (error) {
        console.log({ error });
    }
}
async function getTipAccounts() {
    const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
    });
    try {
        const res = await axios_1.default.post(constants_1.QUICKNODE_RPC_URL, body);
        return res.data.result;
    }
    catch (error) {
        console.log({ error });
        console.log(constants_1.JITO_RPC_URL + "/bundles");
        const res = await axios_1.default.post(constants_1.JITO_RPC_URL + "/bundles", body, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        console.log({ res });
        return res.data.result;
    }
}
async function sendBundle(transactions) {
    const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [transactions, { encoding: "base64" }],
    });
    try {
        const res = await axios_1.default.post(constants_1.QUICKNODE_RPC_URL, body);
        return res.data.result;
    }
    catch (error) {
        console.log({ error });
        const res = await axios_1.default.post(constants_1.JITO_RPC_URL + "/bundles", body, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return res.data.result;
    }
}
async function getInflightBundleStatuses(bundleId) {
    const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getInflightBundleStatuses",
        params: [bundleId],
    });
    try {
        const res = await axios_1.default.post(constants_1.QUICKNODE_RPC_URL, body);
        return res.data.result;
    }
    catch (error) {
        console.log({ error });
        const res = await axios_1.default.post(constants_1.JITO_RPC_URL + "/getInflightBundleStatuses", body, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return res.data.result;
    }
}
async function simulateBundle({ encodedTransactions, simulationBank, skipSigVerify, replaceRecentBlockhash, }) {
    const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateBundle",
        params: [
            {
                encodedTransactions: encodedTransactions,
                simulationBank,
                skipSigVerify,
                replaceRecentBlockhash,
            },
        ],
    });
    try {
        const res = await axios_1.default.post(constants_1.QUICKNODE_RPC_URL, body);
        if (res.data.error) {
            throw new Error(res.data.error.message);
        }
        return res.data.result;
    }
    catch (error) {
        console.log({ error });
        const res = await axios_1.default.post(constants_1.JITO_RPC_URL + "/bundles", body, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return res.data.result;
    }
}
function serializeJitoTransaction({ recentBlockhash, signer, transaction, lookupTables, jitoTipAccount, amountInLamports, }) {
    if (jitoTipAccount && amountInLamports) {
        const transferInstruction = web3_js_2.SystemProgram.transfer({
            fromPubkey: signer,
            toPubkey: new web3_js_3.PublicKey(jitoTipAccount),
            lamports: amountInLamports,
        });
        transaction.add(transferInstruction);
    }
    const messageV0 = new web3_js_1.TransactionMessage({
        payerKey: signer,
        recentBlockhash,
        instructions: transaction.instructions,
    }).compileToV0Message(lookupTables);
    const transactionV0 = new web3_js_1.VersionedTransaction(messageV0);
    const encoded = transactionV0.serialize();
    return Buffer.from(encoded).toString("base64");
}
function signSerializedTransaction(serializedTransaction, signer) {
    const transaction = web3_js_1.VersionedTransaction.deserialize(Buffer.from(serializedTransaction, "base64"));
    transaction.sign([signer]);
    const encoded = transaction.serialize();
    return Buffer.from(encoded).toString("base64");
}
//# sourceMappingURL=jito.js.map