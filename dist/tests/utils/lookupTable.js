"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeTransaction = finalizeTransaction;
exports.createAndSendV0Tx = createAndSendV0Tx;
exports.createLookupTable = createLookupTable;
exports.addAddressesToTable = addAddressesToTable;
exports.findAddressesInTable = findAddressesInTable;
const web3_js_1 = require("@solana/web3.js");
const helper_1 = require("./helper");
async function finalizeTransaction(connection, keyPair, transaction, lookupTables) {
    let latestBlockhash = await connection.getLatestBlockhash("finalized");
    const messageV0 = new web3_js_1.TransactionMessage({
        payerKey: keyPair.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: transaction.instructions,
    }).compileToV0Message(lookupTables);
    const transactionV0 = new web3_js_1.VersionedTransaction(messageV0);
    transactionV0.sign([keyPair]);
    console.log('tx len', transactionV0.serialize().length);
    const txid = await connection.sendTransaction(transactionV0, {
        maxRetries: 5,
        skipPreflight: true,
    });
    const confirmation = await connection.confirmTransaction({
        signature: txid,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    if (confirmation.value.err) {
        console.log(`❌ Transaction Error at tx: ${(0, helper_1.getExplorerUrl)(txid, connection.rpcEndpoint)}`);
    }
    else {
        console.log(`🎉 Transaction Successfully Confirmed at tx: ${(0, helper_1.getExplorerUrl)(txid, connection.rpcEndpoint)}`);
    }
}
async function createAndSendV0Tx(connection, signer, txInstructions) {
    let latestBlockhash = await connection.getLatestBlockhash("finalized");
    const messageV0 = new web3_js_1.TransactionMessage({
        payerKey: signer.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: txInstructions,
    }).compileToV0Message([]);
    const transaction = new web3_js_1.VersionedTransaction(messageV0);
    transaction.sign([signer]);
    const txid = await connection.sendTransaction(transaction, {
        maxRetries: 5,
    });
    const confirmation = await connection.confirmTransaction({
        signature: txid,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    if (confirmation.value.err) {
        throw new Error("❌ - Transaction not confirmed.");
    }
}
async function createLookupTable(connection, signer) {
    const [lookupTableInst, lookupTableAddress] = web3_js_1.AddressLookupTableProgram.createLookupTable({
        authority: signer.publicKey,
        payer: signer.publicKey,
        recentSlot: (await connection.getSlot()) - 1,
    });
    await createAndSendV0Tx(connection, signer, [lookupTableInst]);
    return lookupTableAddress;
}
async function addAddressesToTable(connection, signer, lookupTableAddress, addresses) {
    if (addresses.length === 0) {
        return;
    }
    console.log(`adding ${addresses.length} addresses to lookup table`);
    const addAddressesInstruction = web3_js_1.AddressLookupTableProgram.extendLookupTable({
        payer: signer.publicKey,
        authority: signer.publicKey,
        lookupTable: lookupTableAddress,
        addresses: addresses,
    });
    await createAndSendV0Tx(connection, signer, [addAddressesInstruction]);
    console.log(`Add account to lookup table ${(0, helper_1.getExplorerUrl)(lookupTableAddress.toString(), connection.rpcEndpoint)}`);
}
async function findAddressesInTable(connection, lookupTableAddress) {
    const lookupTableAccount = await connection.getAddressLookupTable(lookupTableAddress);
    if (!lookupTableAccount.value) {
        return [];
    }
    return lookupTableAccount.value.state.addresses;
}
//# sourceMappingURL=lookupTable.js.map