import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function finalizeTransaction(
  connection: Connection,
  keyPair: Keypair,
  transaction: Transaction,
  lookupTables: any
) {
  let latestBlockhash = await connection.getLatestBlockhash("finalized");
  const messageV0 = new TransactionMessage({
    payerKey: keyPair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: transaction.instructions,
  }).compileToV0Message(lookupTables);

  const transactionV0 = new VersionedTransaction(messageV0);
  transactionV0.sign([keyPair]);

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
    console.log(
      `❌ Transaction Error at tx: https://explorer.solana.com/tx/${txid}?cluster=devnet`
    );
  } else {
    console.log(
      `🎉 Transaction Successfully Confirmed at tx: https://explorer.solana.com/tx/${txid}?cluster=devnet`
    );
  }
}

export async function createAndSendV0Tx(
  connection: Connection,
  signer: Keypair,
  txInstructions: TransactionInstruction[]
) {
  let latestBlockhash = await connection.getLatestBlockhash("finalized");
  const messageV0 = new TransactionMessage({
    payerKey: signer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: txInstructions,
  }).compileToV0Message([]);
  const transaction = new VersionedTransaction(messageV0);

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

export async function createLookupTable(
  connection: Connection,
  signer: Keypair
) {
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: signer.publicKey,
      payer: signer.publicKey,
      recentSlot: (await connection.getSlot()) - 1,
    });
  await createAndSendV0Tx(connection, signer, [lookupTableInst]);

  return lookupTableAddress;
}

export async function addAddressesToTable(
  connection: Connection,
  signer: Keypair,
  lookupTableAddress: PublicKey,
  addresses: PublicKey[]
) {
  const addAddressesInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: signer.publicKey,
    authority: signer.publicKey,
    lookupTable: lookupTableAddress,
    addresses: addresses,
  });
  await createAndSendV0Tx(connection, signer, [addAddressesInstruction]);
  console.log(
    `Add account to lookup table https://explorer.solana.com/address/${lookupTableAddress.toString()}?cluster=devnet`
  );
}

export async function findAddressesInTable(
  connection: Connection,
  lookupTableAddress: PublicKey
): Promise<PublicKey[]> {
  const lookupTableAccount = await connection.getAddressLookupTable(
    lookupTableAddress
  );
  if (!lookupTableAccount.value) {
    return [];
  }
  return lookupTableAccount.value.state.addresses;
}
