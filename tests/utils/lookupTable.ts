import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

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
) {
  const lookupTableAccount = await connection.getAddressLookupTable(
    lookupTableAddress
  );
  console.log(
    `Successfully found lookup table: `,
    lookupTableAccount.value?.key.toString()
  );

  if (!lookupTableAccount.value) return;

  for (let i = 0; i < lookupTableAccount.value.state.addresses.length; i++) {
    const address = lookupTableAccount.value.state.addresses[i];
    console.log(`   Address ${i + 1}: ${address.toBase58()}`);
  }
}
