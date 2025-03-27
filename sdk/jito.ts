import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { JITO_RPC_URL, JITO_TIP_FLOOR_URL, JITO_TIP_AMOUNT } from "./constants";
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

export class Jito {
  constructor(private readonly rpcUrl: string) {}

  async getTipInformation(): Promise<TipInformationResponse | null> {
    try {
      const res = await axios.get(JITO_TIP_FLOOR_URL);
      return res.data[0];
    } catch (error) {
      console.log({ error });
    }
  }

  async getTipAccounts(): Promise<TipAccountsResponse | null> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTipAccounts",
      params: [],
    });
    try {
      const res = await axios.post(this.rpcUrl, body);
      return res.data.result;
    } catch (error) {
      console.log({ error });
      console.log(JITO_RPC_URL + "/bundles");
      const res = await axios.post(JITO_RPC_URL + "/bundles", body, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log({ res });
      return res.data.result;
    }
  }

  async sendBundle(transactions: string[]): Promise<SendBundleResponse | null> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [transactions, { encoding: "base64" }],
    });

    try {
      const res = await axios.post(this.rpcUrl, body);
      return res.data.result;
    } catch (error) {
      console.log({ error });
      const res = await axios.post(JITO_RPC_URL + "/bundles", body, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return res.data.result;
    }
  }

  async getInflightBundleStatuses(
    bundleId: string[]
  ): Promise<InflightBundleStatusesResponse | null> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getInflightBundleStatuses",
      params: [bundleId],
    });

    try {
      const res = await axios.post(this.rpcUrl, body);
      return res.data.result;
    } catch (error) {
      console.log({ error });
      const res = await axios.post(
        JITO_RPC_URL + "/getInflightBundleStatuses",
        body,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return res.data.result;
    }
  }

  async simulateBundle({
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
      const res = await axios.post(this.rpcUrl, body);
      if (res.data.error) {
        throw new Error(res.data.error.message);
      }
      return res.data.result;
    } catch (error) {
      console.log({ error });
      const res = await axios.post(JITO_RPC_URL + "/bundles", body, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return res.data.result;
    }
  }

  serializeJitoTransaction({
    recentBlockhash,
    signer,
    transaction,
    lookupTables,
    jitoTipAccount,
    amountInLamports,
  }: {
    recentBlockhash: string;
    signer: PublicKey;
    transaction: Transaction;
    lookupTables: any;
    jitoTipAccount?: PublicKey;
    amountInLamports?: number;
  }) {
    if (jitoTipAccount) {
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: signer,
        toPubkey: new PublicKey(jitoTipAccount),
        lamports: amountInLamports || JITO_TIP_AMOUNT,
      });
      transaction.add(transferInstruction);
    }

    const messageV0 = new TransactionMessage({
      payerKey: signer,
      recentBlockhash,
      instructions: transaction.instructions,
    }).compileToV0Message(lookupTables);

    const transactionV0 = new VersionedTransaction(messageV0);

    const encoded = transactionV0.serialize();

    return Buffer.from(encoded).toString("base64");
  }

  signSerializedTransaction(serializedTransaction: string, signer: Keypair) {
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(serializedTransaction, "base64")
    );
    transaction.sign([signer]);
    const encoded = transaction.serialize();

    return Buffer.from(encoded).toString("base64");
  }
}
