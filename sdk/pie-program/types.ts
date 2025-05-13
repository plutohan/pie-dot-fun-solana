import { BN } from "@coral-xyz/anchor";
import { IdlAccounts, IdlEvents, IdlTypes } from "@coral-xyz/anchor";
import { Pie } from "../../target/types/pie";
import { PublicKey } from "@solana/web3.js";

// Account Types
export type ProgramState = IdlAccounts<Pie>["programState"];
export type BasketConfig = IdlAccounts<Pie>["basketConfig"];
export type UserFund = IdlAccounts<Pie>["userFund"];
export type UserBalance = IdlAccounts<Pie>["userBalance"];

// Instruction Types
export type BasketComponent = IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = IdlTypes<Pie>["createBasketArgs"];

// Enum Types
export type BasketState = IdlTypes<Pie>["basketState"];
export type RebalanceType = IdlTypes<Pie>["rebalanceType"];

// Event Types
export type CreateBasketEvent = IdlEvents<Pie>["createBasketEvent"];
export type UpdateRebalancerEvent = IdlEvents<Pie>["updateRebalancerEvent"];
export type UpdateAdminEvent = IdlEvents<Pie>["updateAdminEvent"];
export type TransferBasketEvent = IdlEvents<Pie>["transferBasketEvent"];
export type ExecuteRebalancingEvent = IdlEvents<Pie>["executeRebalancingEvent"];
export type StartRebalancingEvent = IdlEvents<Pie>["startRebalancingEvent"];
export type StopRebalancingEvent = IdlEvents<Pie>["stopRebalancingEvent"];
export type BuyComponentEvent = IdlEvents<Pie>["buyComponentEvent"];
export type SellComponentEvent = IdlEvents<Pie>["sellComponentEvent"];
export type MintBasketTokenEvent = IdlEvents<Pie>["mintBasketTokenEvent"];
export type RedeemBasketTokenEvent = IdlEvents<Pie>["redeemBasketTokenEvent"];

// Custom Types
export interface RebalanceInfo {
  name?: string;
  inputMint: string;
  outputMint: string;
  lut: string;
  poolId: string;
  isSwapBaseOut: boolean;
  amount: string;
  otherAmountThreshold?: string;
  type: "cpmm" | "clmm" | "amm";
}

export interface TokenInfo {
  name: string;
  mint: string;
  lut: string;
  poolId: string;
  type: "amm" | "clmm" | "cpmm";
}

export interface DepositOrWithdrawSolInfo {
  type: "deposit" | "withdraw";
  amount: string;
}

export interface BuySwapData {
  mint: string;
  amountIn: string;
  maxAmountIn: string;
  amountOut: string;
}

export interface TokenBalance {
  mint: PublicKey;
  owner: PublicKey;
  pubkey: PublicKey;
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
}
