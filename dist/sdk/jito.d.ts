import { Transaction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
type TipAccountsResponse = string[];
type SendBundleResponse = string;
type InflightBundleStatusesResponse = {
    context: {
        slot: number;
    };
    value: {
        bundle_id: string;
        status: "Invalid" | "Pending" | "Failed" | "Landed";
        landed_slot: number | null;
    }[];
};
type TipInformationResponse = {
    time: string;
    landed_tips_25th_percentile: number;
    landed_tips_50th_percentile: number;
    landed_tips_75th_percentile: number;
    landed_tips_95th_percentile: number;
    landed_tips_99th_percentile: number;
    ema_landed_tips_50th_percentile: number;
};
type SimulateBundleResponse = {
    context: SimulationContext;
    value: SuccessSimulationValue | FailedSimulationValue;
};
type SimulationContext = {
    apiVersion: string;
    slot: number;
};
type TransactionResult = {
    err: null | any;
    logs: string[] | null;
    postExecutionAccounts: null | {
        lamports: number;
        owner: string;
        data: string;
        executable: boolean;
        rentEpoch: number;
    }[];
    preExecutionAccounts: null | {
        lamports: number;
        owner: string;
        data: string;
        executable: boolean;
        rentEpoch: number;
    }[];
    returnData: null | any;
    unitsConsumed: number;
};
type FailedTransactionError = {
    TransactionFailure: [
        number[],
        string
    ];
};
type SuccessSimulationValue = {
    summary: "succeeded";
    transactionResults: TransactionResult[];
};
type FailedSimulationValue = {
    summary: {
        failed: {
            error: FailedTransactionError;
            tx_signature: string;
        };
    };
    transactionResults: TransactionResult[];
};
export declare function getTipInformation(): Promise<TipInformationResponse | null>;
export declare function getTipAccounts(): Promise<TipAccountsResponse | null>;
export declare function sendBundle(transactions: string[]): Promise<SendBundleResponse | null>;
export declare function getInflightBundleStatuses(bundleId: string[]): Promise<InflightBundleStatusesResponse | null>;
export declare function simulateBundle({ encodedTransactions, simulationBank, skipSigVerify, replaceRecentBlockhash, }: {
    encodedTransactions: string[];
    simulationBank?: string;
    skipSigVerify?: boolean;
    replaceRecentBlockhash?: boolean;
}): Promise<SimulateBundleResponse | null>;
export declare function serializeJitoTransaction({ recentBlockhash, signer, transaction, lookupTables, jitoTipAccount, amountInLamports, }: {
    recentBlockhash: string;
    signer: PublicKey;
    transaction: Transaction;
    lookupTables: any;
    jitoTipAccount?: PublicKey;
    amountInLamports?: number;
}): string;
export declare function signSerializedTransaction(serializedTransaction: string, signer: Keypair): string;
export {};
//# sourceMappingURL=jito.d.ts.map