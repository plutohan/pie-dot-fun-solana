import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
export declare function finalizeTransaction(connection: Connection, keyPair: Keypair, transaction: Transaction, lookupTables: any): Promise<void>;
export declare function createAndSendV0Tx(connection: Connection, signer: Keypair, txInstructions: TransactionInstruction[]): Promise<void>;
export declare function createLookupTable(connection: Connection, signer: Keypair): Promise<PublicKey>;
export declare function addAddressesToTable(connection: Connection, signer: Keypair, lookupTableAddress: PublicKey, addresses: PublicKey[]): Promise<void>;
export declare function findAddressesInTable(connection: Connection, lookupTableAddress: PublicKey): Promise<PublicKey[]>;
//# sourceMappingURL=lookupTable.d.ts.map