export interface RebalanceInfo {
  name?: string;
  inputMint: string;
  outputMint: string;
  lut: string;
  poolId: string;
  isSwapBaseOut: boolean;
  amount: string;
  type: "cpmm" | "clmm" | "amm";
}
export interface TokenInfo {
  name: string;
  mint: string;
  lut: string;
  poolId: string;
  type: "amm" | "clmm" | "cpmm";
}
