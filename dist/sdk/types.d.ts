export interface RebalanceInfo {
    name: string;
    mint: string;
    lut?: string;
    ammId?: string;
    isSwapBaseOut: boolean;
    amount: string;
}
export interface TokenInfo {
    name: string;
    mint: string;
    lut: string;
    ammId: string;
    type: "amm" | "clmm" | "cpmm";
}
//# sourceMappingURL=types.d.ts.map