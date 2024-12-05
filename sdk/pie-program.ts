import {
  BN,
  Idl,
  IdlAccounts,
  IdlEvents,
  IdlTypes,
  Program,
} from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Pie } from "../target/types/pie";
import * as PieIDL from "../target/idl/pie.json";
import { NATIVE_MINT, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { wrappedSOLInstruction } from "../tests/utils/helper";
import { getOrCreateTokenAccountTx } from "../tests/utils/helper";

export type ProgramState = IdlAccounts<Pie>["programState"];
export type RebalancerState = IdlAccounts<Pie>["rebalancerState"];
export type BasketConfig = IdlAccounts<Pie>["basketConfig"];
export type UserFund = IdlAccounts<Pie>["userFund"];

export type BasketComponent = IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = IdlTypes<Pie>["createBasketArgs"];

const PROGRAM_STATE = "program_state";
const USER_FUND = "user_fund";
const BASKET_CONFIG = "basket_config";
const BASKET_MINT = "basket_mint";
const REBALANCER_STATE = "rebalancer_state";

const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export class PieProgram {
  constructor(public readonly connection: Connection) {}

  get program() {
    return new Program(PieIDL as Idl, { connection: this.connection });
  }

  get accounts(): any {
    return this.program.account;
  }

  get programStatePDA(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PROGRAM_STATE)],
      this.program.programId
    )[0];
  }

  basketConfigPDA(basketId: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_CONFIG), basketId.toBuffer("le", 8)],
      this.program.programId
    )[0];
  }

  basketMintPDA(basketId: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_MINT), basketId.toBuffer("le", 8)],
      this.program.programId
    )[0];
  }

  userFundPDA(user: PublicKey, basketId: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(USER_FUND), user.toBuffer(), basketId.toBuffer("le", 8)],
      this.program.programId
    )[0];
  }

  metadataPDA(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
    )[0];
  }

  rebalancerStatePDA(rebalancer: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(REBALANCER_STATE), rebalancer.toBuffer()],
      this.program.programId
    )[0];
  }

  async getProgramState(): Promise<ProgramState | null> {
    try {
      return await this.accounts.programState.fetch(this.programStatePDA);
    } catch (error) {
      return null;
    }
  }

  async getRebalancerState(
    rebalancer: PublicKey
  ): Promise<RebalancerState | null> {
    try {
      const rebalancerStatePDA = this.rebalancerStatePDA(rebalancer);
      return await this.accounts.rebalancerState.fetch(rebalancerStatePDA);
    } catch (error) {
      return null;
    }
  }

  async getBasketConfig(basketId: BN): Promise<BasketConfig | null> {
    const basketConfigPDA = this.basketConfigPDA(basketId);
    try {
      return await this.accounts.basketConfig.fetch(basketConfigPDA);
    } catch (error) {
      return null;
    }
  }

  async getUserFund(user: PublicKey, basketId: BN): Promise<UserFund | null> {
    const userFundPDA = this.userFundPDA(user, basketId);
    try {
      return await this.accounts.userFund.fetch(userFundPDA);
    } catch (error) {
      return null;
    }
  }

  async initialize(admin: PublicKey): Promise<Transaction> {
    const tx = await this.program.methods
      .initialize()
      .accounts({ admin })
      .transaction();
    return tx;
  }

  async transferAdmin(
    admin: PublicKey,
    newAdmin: PublicKey
  ): Promise<Transaction> {
    return await this.program.methods
      .transferAdmin(newAdmin)
      .accounts({ admin })
      .transaction();
  }

  async addRebalancer(
    admin: PublicKey,
    rebalancer: PublicKey
  ): Promise<Transaction> {
    return await this.program.methods
      .addRebalancer(rebalancer)
      .accounts({ admin, rebalancerState: this.rebalancerStatePDA(rebalancer) })
      .transaction();
  }

  async deleteRebalancer(
    admin: PublicKey,
    rebalancer: PublicKey
  ): Promise<Transaction> {
    return await this.program.methods
      .deleteRebalancer(rebalancer)
      .accounts({ admin })
      .transaction();
  }

  async createBasket(
    creator: PublicKey,
    args: CreateBasketArgs,
    basketId: BN
  ): Promise<Transaction> {
    const basketMint = this.basketMintPDA(basketId);

    const createBasketTx = await this.program.methods
      .createBasket(args)
      .accountsPartial({
        creator,
        programState: this.programStatePDA,
        metadataAccount: this.metadataPDA(basketMint),
        basketConfig: this.basketConfigPDA(basketId),
        basketMint: basketMint,
      })
      .transaction();

    return createBasketTx;
  }

  async buyComponent(
    userSourceOwner: PublicKey,
    basketId: BN,
    maxAmountIn: number,
    amountOut: number,
    raydium: Raydium,
    ammId: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const data = await raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const inputMint = NATIVE_MINT;

    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const inputTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(mintIn),
      userSourceOwner,
      false
    );

    const basketConfig = this.basketConfigPDA(basketId);
    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        userSourceOwner,
        basketConfig
      );

    tx.add(outputTx);
    const wrappedSolIx = await wrappedSOLInstruction(
      this.connection,
      userSourceOwner,
      maxAmountIn
    );
    tx.add(wrappedSolIx);
    const buyComponentTx = await this.program.methods
      .buyComponent(new BN(maxAmountIn), new BN(amountOut))
      .accountsPartial({
        userSourceOwner: userSourceOwner,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        mintOut: mintOut,
        amm: new PublicKey(ammId),
        userFund: this.userFundPDA(userSourceOwner, basketId),
        ammAuthority: new PublicKey(poolKeys.authority),
        ammOpenOrders: new PublicKey(poolKeys.openOrders),
        ammCoinVault: new PublicKey(poolKeys.vault.A),
        ammPcVault: new PublicKey(poolKeys.vault.B),
        marketProgram: new PublicKey(poolKeys.marketProgramId),
        market: new PublicKey(poolKeys.marketId),
        marketBids: new PublicKey(poolKeys.marketBids),
        marketAsks: new PublicKey(poolKeys.marketAsks),
        marketEventQueue: new PublicKey(poolKeys.marketEventQueue),
        marketCoinVault: new PublicKey(poolKeys.marketBaseVault),
        marketPcVault: new PublicKey(poolKeys.marketQuoteVault),
        marketVaultSigner: new PublicKey(poolKeys.marketAuthority),
        ammProgram: new PublicKey(poolKeys.programId),
        userTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
      })
      .transaction();

    tx.add(buyComponentTx);
    return tx;
  }

  async sellComponent(
    user: PublicKey,
    inputMint: PublicKey,
    basketId: BN,
    amountIn: number,
    minimumAmountOut: number,
    raydium: Raydium,
    ammId: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const basketMint = this.basketMintPDA(basketId);
    const data = await raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });

    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const basketConfig = this.basketConfigPDA(basketId);
    const inputTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(mintIn),
      basketConfig,
      true
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        user
      );

    tx.add(outputTx);
    const sellComponentTx = await this.program.methods
      .sellComponent(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        basketMint: basketMint,
        amm: new PublicKey(ammId),
        mintIn: new PublicKey(mintIn),
        userFund: this.userFundPDA(user, basketId),
        ammAuthority: new PublicKey(poolKeys.authority),
        ammOpenOrders: new PublicKey(poolKeys.openOrders),
        ammCoinVault: new PublicKey(poolKeys.vault.A),
        ammPcVault: new PublicKey(poolKeys.vault.B),
        marketProgram: new PublicKey(poolKeys.marketProgramId),
        market: new PublicKey(poolKeys.marketId),
        marketBids: new PublicKey(poolKeys.marketBids),
        marketAsks: new PublicKey(poolKeys.marketAsks),
        marketEventQueue: new PublicKey(poolKeys.marketEventQueue),
        marketCoinVault: new PublicKey(poolKeys.marketBaseVault),
        marketPcVault: new PublicKey(poolKeys.marketQuoteVault),
        marketVaultSigner: new PublicKey(poolKeys.marketAuthority),
        ammProgram: new PublicKey(poolKeys.programId),
        userTokenDestination: outputTokenAccount,
        vaultTokenSource: inputTokenAccount,
      })
      .transaction();

    tx.add(sellComponentTx);
    return tx;
  }

  async mintBasketToken(
    user: PublicKey,
    basketId: BN,
    amount: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    const basketMint = this.basketMintPDA(basketId);
    const basketConfig = this.basketConfigPDA(basketId);
    const userFund = this.userFundPDA(user, basketId);
    const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } =
      await getOrCreateTokenAccountTx(this.connection, basketMint, user, user);
    tx.add(userBasketTokenTx);
    const mintBasketTokenTx = await this.program.methods
      .mintBasketToken(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA,
        basketConfig,
        userFund,
        basketMint,
        userBasketTokenAccount,
      })
      .transaction();
    tx.add(mintBasketTokenTx);
    return tx;
  }

  async redeemBasketToken(
    user: PublicKey,
    basketId: BN,
    amount: number
  ): Promise<Transaction> {
    const basketMint = this.basketMintPDA(basketId);
    const basketConfig = this.basketConfigPDA(basketId);
    const userBasketTokenAccount = getAssociatedTokenAddressSync(
      basketMint,
      user,
      false
    );
    const burnBasketTokenTx = await this.program.methods
      .redeemBasketToken(new BN(amount))
      .accountsPartial({
        programState: this.programStatePDA,
        user,
        basketConfig,
        userFund: this.userFundPDA(user, basketId),
        basketMint,
        userBasketTokenAccount: userBasketTokenAccount,
      })
      .transaction();
    return burnBasketTokenTx;
  }

  async startRebalancing(
    rebalancer: PublicKey,
    basketId: BN
  ): Promise<Transaction> {
    const basketConfigData = await this.getBasketConfig(basketId);
    if (!basketConfigData) {
      return null;
    } else {
      if (basketConfigData.isRebalancing) {
        return null;
      } else {
        return await this.program.methods
          .startRebalancing()
          .accountsPartial({
            rebalancer,
            rebalancerState: this.rebalancerStatePDA(rebalancer),
            basketConfig: this.basketConfigPDA(basketId),
          })
          .transaction();
      }
    }
  }

  async stopRebalancing(
    rebalancer: PublicKey,
    basketId: BN
  ): Promise<Transaction> {
    return await this.program.methods
      .stopRebalancing()
      .accountsPartial({
        rebalancer,
        rebalancerState: this.rebalancerStatePDA(rebalancer),
        basketConfig: this.basketConfigPDA(basketId),
        wrappedSolMint: NATIVE_MINT,
      })
      .transaction();
  }

  async executeRebalancing(
    rebalancer: PublicKey,
    isBuy: boolean,
    amountIn: number,
    amountOut: number,
    ammId: string,
    basketId: BN,
    tokenMint: PublicKey,
    raydium: Raydium
  ): Promise<Transaction | null> {
    const tx = new Transaction();
    const data = await raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const poolKeys = data.poolKeys;

    const basketMint = this.basketMintPDA(basketId);
    const basketConfig = this.basketConfigPDA(basketId);

    const inputTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      basketConfig,
      true
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        NATIVE_MINT,
        rebalancer,
        basketConfig
      );
    tx.add(outputTx);

    const executeRebalancingTx = await this.program.methods
      .executeRebalancing(isBuy, new BN(amountIn), new BN(amountOut))
      .accountsPartial({
        rebalancer,
        rebalancerState: this.rebalancerStatePDA(rebalancer),
        basketConfig: this.basketConfigPDA(basketId),
        tokenMint,
        basketMint,
        amm: new PublicKey(ammId),
        ammAuthority: new PublicKey(poolKeys.authority),
        ammOpenOrders: new PublicKey(poolKeys.openOrders),
        ammCoinVault: new PublicKey(poolKeys.vault.A),
        ammPcVault: new PublicKey(poolKeys.vault.B),
        marketProgram: new PublicKey(poolKeys.marketProgramId),
        market: new PublicKey(poolKeys.marketId),
        marketBids: new PublicKey(poolKeys.marketBids),
        marketAsks: new PublicKey(poolKeys.marketAsks),
        marketEventQueue: new PublicKey(poolKeys.marketEventQueue),
        marketCoinVault: new PublicKey(poolKeys.marketBaseVault),
        marketPcVault: new PublicKey(poolKeys.marketQuoteVault),
        marketVaultSigner: new PublicKey(poolKeys.marketAuthority),
        ammProgram: new PublicKey(poolKeys.programId),
        vaultTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        vaultWrappedSol: NATIVE_MINT,
      })
      .transaction();
    tx.add(executeRebalancingTx);
    return tx;
  }
}
