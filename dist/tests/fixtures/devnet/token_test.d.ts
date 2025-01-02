import { PublicKey } from "@solana/web3.js";
export interface TokenInfo {
    name: string;
    mint: string;
    ammId?: string;
    poolId?: string;
    lut?: PublicKey;
}
export declare const tokens: TokenInfo[];
export declare const tokensCpmm: TokenInfo[];
export declare const tokensClmm: TokenInfo[];
//# sourceMappingURL=token_test.d.ts.map