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
