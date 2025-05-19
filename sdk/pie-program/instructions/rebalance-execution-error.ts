import { VersionedTransaction } from "@solana/web3.js";

interface SerializedErrorData {
  errorType: string;
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedErrorData;
}

interface SerializedSendTransactionErrorData extends SerializedErrorData {
  serializedTx?: string;
}

interface SerializedBatchTransactionProcessingErrorData extends SerializedErrorData {
  innerErrors: SerializedErrorData[];
}

export function deserializeErrorFromString(serializedErrorString: string): Error {
  const errorData = JSON.parse(serializedErrorString) as SerializedErrorData;
  return RebalanceExecutionError.parseErrorDataRecursive(errorData);
}

export class RebalanceExecutionError extends Error {
  public readonly cause?: Error;
  public readonly errorType: string = "RebalanceExecutionError";

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public serializeData(): SerializedErrorData {
    return {
      errorType: this.errorType,
      name: this.name,
      message: this.message,
      stack: this.stack,
      cause: this.cause
        ? this.cause instanceof RebalanceExecutionError
          ? this.cause.serializeData()
          : { 
              errorType: "GenericError",
              name: this.cause.name,
              message: this.cause.message,
              stack: this.cause.stack,
            }
        : undefined,
    };
  }

  public serialize(): string {
    return JSON.stringify(this.serializeData());
  }

  public static parseErrorDataRecursive(errorData: SerializedErrorData): Error {
    let causeInstance: Error | undefined = undefined;
    if (errorData.cause) {
      causeInstance = this.parseErrorDataRecursive(errorData.cause);
    }

    let err: Error;

    switch (errorData.errorType) {
      case "RebalanceSendTransactionError":
        let tx: VersionedTransaction | undefined = undefined;
        if ((errorData as SerializedSendTransactionErrorData).serializedTx) {
          tx = VersionedTransaction.deserialize(Buffer.from((errorData as SerializedSendTransactionErrorData).serializedTx!, "base64"));
        }
        err = new RebalanceSendTransactionError(errorData.message, causeInstance, tx);
        break;
      case "RebalanceControlTxBuildError":
        err = new RebalanceControlTxBuildError(errorData.message, causeInstance);
        break;
      case "RebalanceSwapTxBuildError":
        err = new RebalanceSwapTxBuildError(errorData.message, causeInstance);
        break;
      case "BatchTransactionProcessingError":
        const castedErrorData = errorData as SerializedBatchTransactionProcessingErrorData;
        const innerErrors = (castedErrorData.innerErrors || []).map(innerErrorData =>
          RebalanceExecutionError.parseErrorDataRecursive(innerErrorData)
        );
        const batchError = new BatchTransactionProcessingError(
          errorData.message,
          innerErrors as RebalanceExecutionError[],
          causeInstance
        );
        err = batchError;
        break;
      case "RebalanceExecutionError":
        err = new RebalanceExecutionError(errorData.message, causeInstance);
        break;
      case "GenericError":
      default:
        err = new Error(errorData.message);
        if (causeInstance) {
          Object.defineProperty(err, 'cause', { value: causeInstance, configurable: true, writable: true });
        }
        break;
    }

    err.name = errorData.name;
    err.stack = errorData.stack;
    return err;
  }
}

export class RebalanceSendTransactionError extends RebalanceExecutionError {
  public readonly tx?: VersionedTransaction;
  public override readonly errorType: string = "RebalanceSendTransactionError";

  constructor(message: string, cause?: Error, tx?: VersionedTransaction) {
    super(message, cause);
    this.tx = tx;
    Object.setPrototypeOf(this, RebalanceSendTransactionError.prototype);
  }

  public override serializeData(): SerializedSendTransactionErrorData {
    const baseSerialized = super.serializeData();
    return {
      ...baseSerialized,
      errorType: this.errorType,
      serializedTx: this.tx
        ? Buffer.from(this.tx.serialize()).toString("base64")
        : undefined,
    };
  }
}

export class RebalanceControlTxBuildError extends RebalanceExecutionError {
  public override readonly errorType: string = "RebalanceControlTxBuildError";

  constructor(message: string, cause?: Error) {
    super(message, cause);
    Object.setPrototypeOf(this, RebalanceControlTxBuildError.prototype);
  }
}

export class RebalanceSwapTxBuildError extends RebalanceExecutionError {
  public override readonly errorType: string = "RebalanceSwapTxBuildError";

  constructor(message: string, cause?: Error) {
    super(message, cause);
    Object.setPrototypeOf(this, RebalanceSwapTxBuildError.prototype);
  }
}

export class BatchTransactionProcessingError extends RebalanceExecutionError {
  public override readonly errorType: string = "BatchTransactionProcessingError";
  public readonly innerErrors: RebalanceExecutionError[];

  constructor(message: string, innerErrors: RebalanceExecutionError[], cause?: Error) {
    super(message, cause);
    this.innerErrors = innerErrors;
    Object.setPrototypeOf(this, BatchTransactionProcessingError.prototype);
  }

  public override serializeData(): SerializedBatchTransactionProcessingErrorData {
    const baseSerialized = super.serializeData();
    return {
      ...baseSerialized,
      errorType: this.errorType,
      innerErrors: this.innerErrors.map(err => {
        return err.serializeData();
      }),
    };
  }
} 
