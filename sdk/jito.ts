import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { QUICKNODE_RPC_URL } from "./constants";
import axios from "axios";

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
  postExecutionAccounts:
    | null
    | {
        lamports: number;
        owner: string;
        data: string;
        executable: boolean;
        rentEpoch: number;
      }[];
  preExecutionAccounts:
    | null
    | {
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
    number[], // byte array
    string // error message
  ];
};

type FailedTransaction = {
  error: {
    TransactionFailure: [number[], string];
  };
  tx_signature: string;
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

export async function getTipInformation(): Promise<TipInformationResponse | null> {
  try {
    const res = await axios.get(
      "https://bundles.jito.wtf/api/v1/bundles/tip_floor"
    );
    return res.data[0];
  } catch (error) {
    console.log({ error });
  }
}

export async function getTipAccounts(): Promise<TipAccountsResponse | null> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTipAccounts",
    params: [],
  });

  try {
    const res = await axios.post(QUICKNODE_RPC_URL, body);
    return res.data.result;
  } catch (error) {
    console.log({ error });
  }
}

export async function sendBundle(
  transactions: string[]
): Promise<SendBundleResponse | null> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [transactions, { encoding: "base64" }],
  });

  try {
    const res = await axios.post(QUICKNODE_RPC_URL, body);
    return res.data.result;
  } catch (error) {
    console.log({ error });
  }
}

export async function getInflightBundleStatuses(
  bundleId: string[]
): Promise<InflightBundleStatusesResponse | null> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getInflightBundleStatuses",
    params: [bundleId],
  });

  try {
    const res = await axios.post(QUICKNODE_RPC_URL, body);
    return res.data.result;
  } catch (error) {
    console.log({ error });
  }
}

export async function simulateBundle({
  encodedTransactions,
  simulationBank,
  skipSigVerify,
  replaceRecentBlockhash,
}: {
  encodedTransactions: string[];
  simulationBank?: string;
  skipSigVerify?: boolean;
  replaceRecentBlockhash?: boolean;
}): Promise<SimulateBundleResponse | null> {
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
    const res = await axios.post(QUICKNODE_RPC_URL, body);
    if (res.data.error) {
      throw new Error(res.data.error.message);
    }

    return res.data.result;
  } catch (error) {
    console.log({ error });
  }
}

export async function serializeJitoTransaction(
  recentBlockhash: string,
  keyPair: Keypair,
  transaction: Transaction,
  lookupTables: any,
  jitoTipAccount?: PublicKey,
  amountInLamports?: number
) {
  if (jitoTipAccount && amountInLamports) {
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: keyPair.publicKey,
      toPubkey: new PublicKey(jitoTipAccount),
      lamports: amountInLamports,
    });
    transaction.add(transferInstruction);
  }

  const messageV0 = new TransactionMessage({
    payerKey: keyPair.publicKey,
    recentBlockhash,
    instructions: transaction.instructions,
  }).compileToV0Message(lookupTables);

  const transactionV0 = new VersionedTransaction(messageV0);

  transactionV0.sign([keyPair]);

  const encoded = transactionV0.serialize();

  return Buffer.from(encoded).toString("base64");
}
