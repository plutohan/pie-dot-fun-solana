import {
  BN,
  Idl,
  IdlAccounts,
  IdlEvents,
  IdlTypes,
  Program,
} from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Pie } from "../target/types/pie";
import * as PieIDL from "../target/idl/pie.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMint,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
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

  basketConfigPDA(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_CONFIG), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  userFundPDA(user: PublicKey, basketConfig: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(USER_FUND), user.toBuffer(), basketConfig.toBuffer()],
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
      return this.accounts.rebalancerState.fetch(rebalancerStatePDA);
    } catch (error) {
      return null;
    }
  }

  async getBasketConfig(mint: PublicKey): Promise<BasketConfig | null> {
    const basketConfigPDA = this.basketConfigPDA(mint);
    try {
      return await this.accounts.basketConfig.fetch(basketConfigPDA);
    } catch (error) {
      return null;
    }
  }

  async getUserFund(
    user: PublicKey,
    basketConfig: PublicKey
  ): Promise<UserFund | null> {
    const userFundPDA = this.userFundPDA(user, basketConfig);
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
      .accounts({ admin })
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
    decimals: number
  ): Promise<{
    tx: Transaction;
    basketMint: Keypair;
  }> {
    const tx = new Transaction();
    const basketMint = Keypair.generate();

    const lamports = await getMinimumBalanceForRentExemptMint(this.connection);

    tx.add(
      SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: basketMint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(
        basketMint.publicKey,
        decimals,
        creator,
        creator,
        TOKEN_PROGRAM_ID
      )
    );

    const createIx = await this.program.methods
      .createBasket(args)
      .accountsPartial({
        creator,
        programState: this.programStatePDA,
        metadataAccount: this.metadataPDA(basketMint.publicKey),
        basketConfig: this.basketConfigPDA(basketMint.publicKey),
        basketMint: basketMint.publicKey,
      })
      .instruction();

    const blockHash = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockHash.blockhash;
    tx.feePayer = creator;
    tx.partialSign(basketMint);
    tx.add(createIx);

    return { tx, basketMint };
  }

  async buyComponent(
    userSourceOwner: PublicKey,
    basketConfig: PublicKey,
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
    console.log(
      "userPDA: ",
      this.userFundPDA(userSourceOwner, basketConfig).toString()
    );
    const buyComponentTx = await this.program.methods
      .buyComponent(new BN(maxAmountIn), new BN(amountOut))
      .accountsPartial({
        userSourceOwner: userSourceOwner,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        mintOut: mintOut,
        amm: new PublicKey(ammId),
        userFund: this.userFundPDA(userSourceOwner, basketConfig),
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
    basketConfig: PublicKey,
    amountIn: number,
    minimumAmountOut: number,
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
      user,
      false
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        basketConfig
      );

    tx.add(outputTx);
    const sellComponentTx = await this.program.methods
      .sellComponent(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        mintOut: mintOut,
        amm: new PublicKey(ammId),
        userFund: this.userFundPDA(user, basketConfig),
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

    tx.add(sellComponentTx);
    return tx;
  }

  async mintBasketToken(
    user: PublicKey,
    basketConfig: PublicKey,
    basketMint: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } =
      await getOrCreateTokenAccountTx(this.connection, basketMint, user, user);
    tx.add(userBasketTokenTx);
    const mintBasketTokenTx = await this.program.methods
      .mintBasketToken(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA,
        basketConfig,
        userFund: this.userFundPDA(user, basketConfig),
        basketMint,
        userBasketTokenAccount,
      })
      .transaction();
    tx.add(mintBasketTokenTx);
    return tx;
  }

  async burnBasketToken(
    user: PublicKey,
    basketConfig: PublicKey,
    basketMint: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const burnBasketTokenTx = await this.program.methods
      .burnBasketToken(new BN(amount))
      .accountsPartial({
        user,
        basketConfig,
        userFund: this.userFundPDA(user, basketConfig),
        basketMint,
      })
      .transaction();
    return burnBasketTokenTx;
  }
}
