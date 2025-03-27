"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Jito = void 0;
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const web3_js_3 = require("@solana/web3.js");
const constants_1 = require("./constants");
const axios_1 = __importDefault(require("axios"));
class Jito {
    constructor(rpcUrl) {
        this.rpcUrl = rpcUrl;
    }
    async getTipInformation() {
        try {
            const res = await axios_1.default.get(constants_1.JITO_TIP_FLOOR_URL);
            return res.data[0];
        }
        catch (error) {
            console.log({ error });
        }
    }
    async getTipAccounts() {
        const body = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTipAccounts",
            params: [],
        });
        try {
            const res = await axios_1.default.post(this.rpcUrl, body);
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
    async sendBundle(transactions) {
        const body = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [transactions, { encoding: "base64" }],
        });
        try {
            const res = await axios_1.default.post(this.rpcUrl, body);
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
    async getInflightBundleStatuses(bundleId) {
        const body = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getInflightBundleStatuses",
            params: [bundleId],
        });
        try {
            const res = await axios_1.default.post(this.rpcUrl, body);
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
    async simulateBundle({ encodedTransactions, simulationBank, skipSigVerify, replaceRecentBlockhash, }) {
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
            const res = await axios_1.default.post(this.rpcUrl, body);
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
    serializeJitoTransaction({ recentBlockhash, signer, transaction, lookupTables, jitoTipAccount, amountInLamports, }) {
        if (jitoTipAccount) {
            const transferInstruction = web3_js_2.SystemProgram.transfer({
                fromPubkey: signer,
                toPubkey: new web3_js_3.PublicKey(jitoTipAccount),
                lamports: amountInLamports || constants_1.JITO_TIP_AMOUNT,
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
    signSerializedTransaction(serializedTransaction, signer) {
        const transaction = web3_js_1.VersionedTransaction.deserialize(Buffer.from(serializedTransaction, "base64"));
        transaction.sign([signer]);
        const encoded = transaction.serialize();
        return Buffer.from(encoded).toString("base64");
    }
}
exports.Jito = Jito;
//# sourceMappingURL=jito.js.map