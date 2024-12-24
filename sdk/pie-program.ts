import {
  BN,
  Idl,
  IdlAccounts,
  IdlEvents,
  IdlTypes,
  Program,
} from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Pie } from "../target/types/pie";
import * as PieIDL from "../target/idl/pie.json";
import {
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getPdaExBitmapAccount,
  getPdaObservationId,
  MAX_SQRT_PRICE_X64,
  MIN_SQRT_PRICE_X64,
  Owner,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import {
  buildClmmRemainingAccounts,
  getOrCreateTokenAccountTx,
  unwrapSolIx,
  wrappedSOLInstruction,
} from "../tests/utils/helper";
import {
  addAddressesToTable,
  createLookupTable,
  findAddressesInTable,
} from "../tests/utils/lookupTable";
import { tokens } from "../tests/fixtures/devnet/token_test";

export type ProgramState = IdlAccounts<Pie>["programState"];
export type BasketConfig = IdlAccounts<Pie>["basketConfig"];
export type UserFund = IdlAccounts<Pie>["userFund"];

export type BasketComponent = IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = IdlTypes<Pie>["createBasketArgs"];

export type CreateBasketEvent = IdlEvents<Pie>["createBasketEvent"];
export type UpdateRebalancerEvent = IdlEvents<Pie>["updateRebalancerEvent"];
export type TransferAdminEvent = IdlEvents<Pie>["transferAdminEvent"];
export type TransferBasketEvent = IdlEvents<Pie>["transferBasketEvent"];
export type UpdateRebalanceMarginEvent =
  IdlEvents<Pie>["updateMaxRebalanceMarginEvent"];
export type ExecuteRebalancingEvent = IdlEvents<Pie>["executeRebalancingEvent"];
export type StartRebalancingEvent = IdlEvents<Pie>["startRebalancingEvent"];
export type StopRebalancingEvent = IdlEvents<Pie>["stopRebalancingEvent"];
export type BuyComponentEvent = IdlEvents<Pie>["buyComponentEvent"];
export type SellComponentEvent = IdlEvents<Pie>["sellComponentEvent"];
export type MintBasketTokenEvent = IdlEvents<Pie>["mintBasketTokenEvent"];
export type RedeemBasketTokenEvent = IdlEvents<Pie>["redeemBasketTokenEvent"];

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
      [Buffer.from(BASKET_CONFIG), basketId.toArrayLike(Buffer, "be", 8)],
      this.program.programId
    )[0];
  }

  basketMintPDA(basketId: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_MINT), basketId.toArrayLike(Buffer, "be", 8)],
      this.program.programId
    )[0];
  }

  userFundPDA(user: PublicKey, basketId: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(USER_FUND),
        user.toBuffer(),
        basketId.toArrayLike(Buffer, "be", 8),
      ],
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

  async getPlatformFeeTokenAccount(): Promise<PublicKey> {
    const programState = await this.getProgramState();
    const platformFeeTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      programState.platformFeeWallet
    );
    return platformFeeTokenAccount;
  }

  async getCreatorFeeTokenAccount(basketId: BN): Promise<PublicKey> {
    const basketConfig = await this.getBasketConfig(basketId);
    const creatorFeeTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketConfig.creator
    );
    return creatorFeeTokenAccount;
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

  async getTokenBalance(mint: PublicKey, owner: PublicKey): Promise<number> {
    const tokenAccount = getAssociatedTokenAddressSync(mint, owner, true);

    try {
      const balance = await this.connection.getTokenAccountBalance(
        tokenAccount
      );
      return Number(balance.value.amount);
    } catch (error) {
      // Return 0 if the token account doesn't exist
      return 0;
    }
  }

  async getBasketVaults(basketId: BN): Promise<
    {
      mint: PublicKey;
      balance: number;
    }[]
  > {
    const basketConfig = await this.getBasketConfig(basketId);

    const tokenMints = [];
    const tokenBalances: Promise<number>[] = [];

    tokenMints.push(NATIVE_MINT);
    tokenBalances.push(
      this.getTokenBalance(NATIVE_MINT, this.basketConfigPDA(basketId))
    );

    for (const component of basketConfig.components) {
      tokenMints.push(new PublicKey(component.mint));
      tokenBalances.push(
        this.getTokenBalance(
          new PublicKey(component.mint),
          this.basketConfigPDA(basketId)
        )
      );
    }

    const resolvedBalances = await Promise.all(tokenBalances);

    return tokenMints.map((mint, index) => ({
      mint,
      balance: resolvedBalances[index],
    }));
  }

  /**
   * Initializes the program.
   * @param admin - The admin account.
   * @returns A promise that resolves to a transaction.
   */
  async initialize(admin: PublicKey): Promise<Transaction> {
    const tx = await this.program.methods
      .initialize()
      .accounts({ admin })
      .transaction();
    return tx;
  }

  /**
   * Transfers the admin role to a new account.
   * @param admin - The current admin account.
   * @param newAdmin - The new admin account.
   * @returns A promise that resolves to a transaction.
   */
  async transferAdmin(
    admin: PublicKey,
    newAdmin: PublicKey
  ): Promise<Transaction> {
    return await this.program.methods
      .transferAdmin(newAdmin)
      .accounts({ admin })
      .transaction();
  }

  /**
   * Updates the rebalance margin.
   * @param admin - The admin account.
   * @param newMargin - The new margin.
   * @returns A promise that resolves to a transaction.
   */
  async updateRebalanceMargin(
    admin: PublicKey,
    newMargin: number
  ): Promise<Transaction> {
    return await this.program.methods
      .updateRebalanceMargin(new BN(newMargin))
      .accounts({ admin, programState: this.programStatePDA })
      .transaction();
  }

  /**
   * Updates the fee. 10000 = 100% => 1000 = 1%
   * @param admin - The admin account.
   * @param newCreatorFeePercentage - The new creator fee percentage.
   * @param newPlatformFeePercentage - The new platform fee percentage.
   * @returns A promise that resolves to a transaction.
   */
  async updateFee(
    admin: PublicKey,
    newCreatorFeePercentage: number,
    newPlatformFeePercentage: number
  ): Promise<Transaction> {
    return await this.program.methods
      .updateFee(
        new BN(newCreatorFeePercentage),
        new BN(newPlatformFeePercentage)
      )
      .accounts({ admin, programState: this.programStatePDA })
      .transaction();
  }

  /**
   * Updates the platform fee wallet.
   * @param admin - The admin account.
   * @param newPlatformFeeWallet - The new platform fee wallet.
   * @returns A promise that resolves to a transaction.
   */
  async updatePlatformFeeWallet(
    admin: PublicKey,
    newPlatformFeeWallet: PublicKey
  ): Promise<Transaction> {
    return await this.program.methods
      .updatePlatformFeeWallet(newPlatformFeeWallet)
      .accounts({ admin, programState: this.programStatePDA })
      .transaction();
  }

  /**
   * Creates vaults account for all basket.
   * @param creator - The creator account.
   * @param args - The basket arguments.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
  async createBasketVaultAccounts(
    creator: PublicKey,
    args: CreateBasketArgs,
    basketId: BN
  ): Promise<{ vaults: PublicKey[]; tx: Transaction }> {
    const basketConfig = this.basketConfigPDA(basketId);

    const tx = new Transaction();
    const vaults: PublicKey[] = [];

    for (let i = 0; i < args.components.length; i++) {
      const { tokenAccount: outputTokenAccount, tx: outputTx } =
        await getOrCreateTokenAccountTx(
          this.connection,
          new PublicKey(args.components[i].mint),
          creator,
          basketConfig
        );
      tx.add(outputTx);
      vaults.push(outputTokenAccount);
    }

    return { vaults, tx };
  }

  /**
   * Creates a basket.
   * @param creator - The creator account.
   * @param args - The basket arguments.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
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

  /**
   * Creates a basket.
   * @param creator - The creator account.
   * @param basketId - The basket ID.
   * @param newRebalancer - New rebalancer in the basket
   * @returns A promise that resolves to a transaction.
   */
  async updateRebalancer(
    creator: PublicKey,
    basketId: BN,
    newRebalancer: PublicKey
  ): Promise<Transaction> {
    return await this.program.methods
      .updateRebalancer(newRebalancer)
      .accountsPartial({
        creator,
        basketConfig: this.basketConfigPDA(basketId),
      })
      .transaction();
  }

  /**
   * Buys a component.
   * @param userSourceOwner - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param raydium - The Raydium instance.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponent({
    userSourceOwner,
    basketId,
    maxAmountIn,
    amountOut,
    raydium,
    ammId,
    unwrapSol = true,
  }: {
    userSourceOwner: PublicKey;
    basketId: BN;
    maxAmountIn: number;
    amountOut: number;
    raydium: Raydium;
    ammId: string;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const data = await raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const inputMint = NATIVE_MINT;
    const basketConfig = this.basketConfigPDA(basketId);

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
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount(basketId),
      })
      .transaction();

    tx.add(buyComponentTx);

    if (unwrapSol && inputMint === NATIVE_MINT) {
      tx.add(unwrapSolIx(inputTokenAccount, userSourceOwner, userSourceOwner));
    }
    return tx;
  }

  /**
   * Buys a component CPMM.
   * @param user - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param raydium - The Raydium instance.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponentCpmm(
    user: PublicKey,
    basketId: BN,
    maxAmountIn: number,
    amountOut: number,
    raydium: Raydium,
    poolId: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId);
    const basketConfig = this.basketConfigPDA(basketId);

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;
    const baseIn = NATIVE_MINT.toString() === poolKeys.mintA.address;

    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];

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
    const wrappedSolIx = await wrappedSOLInstruction(user, maxAmountIn);
    tx.add(...wrappedSolIx);
    const buyComponentTx = await this.program.methods
      .buyComponentCpmm(new BN(maxAmountIn), new BN(amountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        userFund: this.userFundPDA(user, basketId),
        mintOut: mintOut,
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        userTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        inputVault: new PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
        outputVault: new PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
        inputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintA" : "mintB"].programId ?? TOKEN_PROGRAM_ID
        ),
        outputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintB" : "mintA"].programId ?? TOKEN_PROGRAM_ID
        ),
        inputTokenMint: baseIn ? mintA : mintB,
        outputTokenMint: baseIn ? mintB : mintA,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount(basketId),
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();

    tx.add(buyComponentTx);
    return tx;
  }

  /**
   * Buys a component using CLMM from Raydium.
   * @param userSourceOwner - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param raydium - The Raydium instance.
   * @param poolId - The CLMM pool ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponentClmm(
    user: PublicKey,
    basketId: BN,
    maxAmountIn: BN,
    amountOut: BN,
    raydium: Raydium,
    outputMint: PublicKey,
    poolId: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA(basketId);

    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;
    const { remainingAccounts, ...res } = PoolUtils.computeAmountIn({
      poolInfo: clmmPoolInfo,
      tickArrayCache: tickCache[poolId],
      amountOut,
      baseMint: outputMint,
      slippage: 0.01,
      epochInfo: await raydium.fetchEpochInfo(),
    });

    let sqrtPriceLimitX64: BN;
    sqrtPriceLimitX64 =
      outputMint.toString() === poolInfo.mintB.address
        ? MIN_SQRT_PRICE_X64.add(new BN(1))
        : MAX_SQRT_PRICE_X64.sub(new BN(1));

    const [programId, id] = [
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
    ];

    const [mintAVault, mintBVault] = [
      new PublicKey(poolKeys.vault.A),
      new PublicKey(poolKeys.vault.B),
    ];
    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];
    const baseIn = NATIVE_MINT.toString() === poolKeys.mintA.address;
    const inputTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(NATIVE_MINT),
      user,
      false
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(baseIn ? mintB : mintA),
        user,
        basketConfig
      );

    tx.add(outputTx);
    const wrappedSolIx = await wrappedSOLInstruction(
      user,
      maxAmountIn.toNumber()
    );
    tx.add(...wrappedSolIx);
    const buyComponentTx = await this.program.methods
      .buyComponent(new BN(maxAmountIn), new BN(amountOut))
      .accountsPartial({
        user: user,
        userFund: this.userFundPDA(user, basketId),
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount(basketId),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolKeys.id),
        userTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
        inputVault: baseIn ? mintAVault : mintBVault,
        outputVault: baseIn ? mintBVault : mintAVault,
        observationState: new PublicKey(clmmPoolInfo.observationId),
        inputVaultMint: baseIn ? mintA : mintB,
        outputVaultMint: baseIn ? mintB : mintA,
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(programId, id).publicKey
        )
      )
      .transaction();

    tx.add(buyComponentTx);
    return tx;
  }

  /**
   * Sells a component.
   * @param user - The user account.
   * @param inputMint - The input mint.
   * @param basketId - The basket ID.
   * @param amountIn - The amount in.
   * @param minimumAmountOut - The minimum amount out.
   * @param raydium - The Raydium instance.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponent({
    user,
    inputMint,
    basketId,
    amountIn,
    minimumAmountOut,
    raydium,
    ammId,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    inputMint: PublicKey;
    basketId: BN;
    amountIn: number;
    minimumAmountOut: number;
    raydium: Raydium;
    ammId: string;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
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

    const { tokenAccount: outputTokenAccount, tx: createNativeMintATATx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        user
      );

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
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount(basketId),
      })
      .transaction();
    tx.add(sellComponentTx);

    if (createNativeMintATA) {
      tx.add(createNativeMintATATx);
    }
    return tx;
  }

  /**
   * Sell a component CPMM.
   * @param user - The user also payer.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param raydium - The Raydium instance.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponentCpmm(
    user: PublicKey,
    basketId: BN,
    inputMint: PublicKey,
    amountIn: number,
    minimumAmountOut: number,
    raydium: Raydium,
    poolId: string,
    unwrappedSol: boolean
  ): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA(basketId);
    const basketMint = this.basketMintPDA(basketId);

    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId);

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

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
    const wrappedSolIx = await wrappedSOLInstruction(user, amountIn);
    tx.add(...wrappedSolIx);
    const sellComponentTx = await this.program.methods
      .sellComponentCpmm(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        userFund: this.userFundPDA(user, basketId),
        mintOut: mintOut,
        basketMint: basketMint,
        authority: new PublicKey(poolKeys.authority),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        vaultTokenSource: inputTokenAccount,
        userTokenDestination: outputTokenAccount,
        inputVault: new PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
        outputVault: new PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
        inputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintA" : "mintB"].programId ?? TOKEN_PROGRAM_ID
        ),
        outputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintB" : "mintA"].programId ?? TOKEN_PROGRAM_ID
        ),
        inputTokenMint: baseIn ? mintA : mintB,
        outputTokenMint: baseIn ? mintB : mintA,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount(basketId),
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();

    tx.add(sellComponentTx);
    if (unwrappedSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }
    return tx;
  }

  /**
   * Sell a component CLMM.
   * @param user - The user also payer.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param raydium - The Raydium instance.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponentClmm(
    user: PublicKey,
    basketId: BN,
    amountIn: BN,
    raydium: Raydium,
    inputMint: PublicKey,
    poolId: string,
    unwrappedSol: boolean
  ): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA(basketId);

    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;
    const baseIn = inputMint.toString() === poolInfo.mintA.address;

    const { minAmountOut, remainingAccounts } =
      PoolUtils.computeAmountOutFormat({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountIn,
        tokenOut: poolInfo[baseIn ? "mintB" : "mintA"],
        slippage: 0.01,
        epochInfo: await raydium.fetchEpochInfo(),
      });

    let sqrtPriceLimitX64: BN;
    sqrtPriceLimitX64 = baseIn
      ? MIN_SQRT_PRICE_X64.add(new BN(1))
      : MAX_SQRT_PRICE_X64.sub(new BN(1));

    const [programId, id] = [
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
    ];

    const [mintAVault, mintBVault] = [
      new PublicKey(poolKeys.vault.A),
      new PublicKey(poolKeys.vault.B),
    ];
    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];
    const inputTokenAccount = getAssociatedTokenAddressSync(
      new PublicKey(inputMint),
      basketConfig,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(NATIVE_MINT),
        user,
        user
      );

    tx.add(outputTx);

    const sellComponentTx = await this.program.methods
      .sellComponentClmm(amountIn, minAmountOut.amount.raw, sqrtPriceLimitX64)
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        userFund: this.userFundPDA(user, basketId),
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount(basketId),
        basketMint: this.basketMintPDA(basketId),

        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        vaultTokenSource: inputTokenAccount,
        userTokenDestination: outputTokenAccount,
        inputVault: new PublicKey(poolKeys.vault[baseIn ? "A" : "B"]),
        outputVault: new PublicKey(poolKeys.vault[baseIn ? "B" : "A"]),
        inputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintA" : "mintB"].programId ?? TOKEN_PROGRAM_ID
        ),
        outputTokenProgram: new PublicKey(
          poolInfo[baseIn ? "mintB" : "mintA"].programId ?? TOKEN_PROGRAM_ID
        ),
        inputVaultMint: baseIn ? mintA : mintB,
        outputVaultMint: baseIn ? mintB : mintA,

        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(programId, id).publicKey
        )
      )
      .transaction();

    tx.add(sellComponentTx);
    if (unwrappedSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }
    return tx;
  }

  /**
   * Mints a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount.
   * @returns A promise that resolves to a transaction.
   */
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

  /**
   * Redeems a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount.
   * @returns A promise that resolves to a transaction.
   */
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

  /**
   * Starts rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
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

  /**
   * Stops rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param basketId - The basket ID.
   * @returns A promise that resolves to a transaction.
   */
  async stopRebalancing(
    rebalancer: PublicKey,
    basketId: BN
  ): Promise<Transaction> {
    const basketPDA = this.basketConfigPDA(basketId);
    const vaultWrappedSol = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketPDA,
      true
    );
    return await this.program.methods
      .stopRebalancing()
      .accountsPartial({
        rebalancer,
        rebalancerState: this.rebalancerStatePDA(rebalancer),
        basketConfig: basketPDA,
        vaultWrappedSol: vaultWrappedSol,
        wrappedSolMint: NATIVE_MINT,
      })
      .transaction();
  }

  /**
   * Executes rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param isBuy - Whether to buy or sell.
   * @param amountIn - The amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @param basketId - The basket ID.
   * @param tokenMint - The token mint.
   * @param raydium - The Raydium instance.
   * @returns A promise that resolves to a transaction or null.
   */
  async executeRebalancing(
    rebalancer: PublicKey,
    isBuy: boolean,
    amountIn: string,
    amountOut: string,
    ammId: string,
    basketId: BN,
    tokenMint: PublicKey,
    raydium: Raydium
  ): Promise<Transaction | null> {
    const tx = new Transaction();
    const data = await raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });

    const basketMint = this.basketMintPDA(basketId);
    const basketConfig = this.basketConfigPDA(basketId);
    const poolKeys = data.poolKeys;

    const inputMint = isBuy ? NATIVE_MINT : tokenMint;

    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    let inputTokenAccount: PublicKey;
    let outputTokenAccount: PublicKey;
    if (isBuy) {
      inputTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(mintIn),
        basketConfig,
        true
      );

      const { tokenAccount, tx: outputTx } = await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        rebalancer,
        basketConfig
      );
      outputTokenAccount = tokenAccount;
      tx.add(outputTx);
    } else {
      inputTokenAccount = getAssociatedTokenAddressSync(
        new PublicKey(mintIn),
        basketConfig,
        true
      );

      const { tokenAccount, tx: outputTx } = await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        rebalancer,
        basketConfig
      );

      outputTokenAccount = tokenAccount;
      tx.add(outputTx);
    }

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

  async buildRebalanceTx({
    basketId,
    rebalancer,
    swaps,
    raydium,
    withStartRebalance,
    withStopRebalance,
  }: {
    basketId: BN;
    rebalancer: Keypair;
    raydium: Raydium;
    swaps: {
      mint: PublicKey;
      isBuy: boolean;
      amountIn: number;
      amountOut: number;
    }[];
    withStartRebalance?: boolean;
    withStopRebalance?: boolean;
  }): Promise<Uint8Array[]> {
    const serializedTxs = [];
    const blockhash = await this.connection.getLatestBlockhash();

    for (let i = 0; i < swaps.length; i++) {
      const tx = new Transaction();

      if (i == 0 && withStartRebalance) {
        const startRebalanceTx = await this.startRebalancing(
          rebalancer.publicKey,
          basketId
        );
        tx.add(startRebalanceTx);
      }

      const swap = swaps[i];

      //@TODO for mainnet we can fetch the ammId from API
      const ammId = tokens.find((t) => t.mint === swap.mint.toBase58())?.ammId;

      const rebalanceTx = await this.executeRebalancing(
        rebalancer.publicKey,
        swap.isBuy,
        swap.amountIn.toString(),
        swap.amountOut.toString(),
        ammId,
        basketId,
        swap.mint,
        raydium
      );
      tx.add(rebalanceTx);

      if (i == swaps.length - 1 && withStopRebalance) {
        const stopRebalanceTx = await this.stopRebalancing(
          rebalancer.publicKey,
          basketId
        );
        tx.add(stopRebalanceTx);
      }

      tx.recentBlockhash = blockhash.blockhash;
      tx.feePayer = rebalancer.publicKey;
      tx.sign(rebalancer);
      serializedTxs.push(tx.serialize());
    }

    return serializedTxs;
  }

  async addBasketInfoToAddressLookupTable(
    raydium: Raydium,
    connection: Connection,
    signer: Keypair,
    ammId: string,
    basketId: BN,
    lookupTable?: PublicKey
  ) {
    const data = await raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const MAX_LOOKUP_TABLE_ADDRESS = 256;
    const basketMint = this.basketMintPDA(basketId);
    const basketConfig = this.basketConfigPDA(basketId);
    const poolKeys = data.poolKeys;

    const addressesKey = [
      basketMint,
      basketConfig,
      new PublicKey(poolKeys.mintA.address),
      new PublicKey(poolKeys.mintB.address),
      new PublicKey(ammId),
      new PublicKey(poolKeys.authority),
      new PublicKey(poolKeys.openOrders),
      new PublicKey(poolKeys.vault.A),
      new PublicKey(poolKeys.vault.B),
      new PublicKey(poolKeys.marketProgramId),
      new PublicKey(poolKeys.marketId),
      new PublicKey(poolKeys.marketBids),
      new PublicKey(poolKeys.marketAsks),
      new PublicKey(poolKeys.marketEventQueue),
      new PublicKey(poolKeys.marketBaseVault),
      new PublicKey(poolKeys.marketQuoteVault),
      new PublicKey(poolKeys.marketAuthority),
      new PublicKey(poolKeys.programId),
      TOKEN_PROGRAM_ID,
    ];

    if (lookupTable) {
      const addressesStored = await findAddressesInTable(
        connection,
        lookupTable
      );
      const addressToAdd = addressesKey.filter(
        (address) => !addressesStored.some((stored) => stored.equals(address))
      );
      if (
        addressToAdd.length + addressesStored.length >=
        MAX_LOOKUP_TABLE_ADDRESS
      ) {
        throw Error("Exceeds 256 addresses of lookup table");
      }
      await addAddressesToTable(connection, signer, lookupTable, addressToAdd);
    } else {
      const newLookupTable = await createLookupTable(connection, signer);
      await addAddressesToTable(
        connection,
        signer,
        newLookupTable,
        addressesKey
      );
      return newLookupTable;
    }

    return lookupTable;
  }

  /**
   * Adds an event listener for the 'CreateBasket' event.
   * @param handler - The function to handle the event.
   */
  onCreateBasket(handler: (event: CreateBasketEvent) => void) {
    this.program.addEventListener("createBasket", handler);
  }

  /**
   * Adds an event listener for the 'DeleteRebalancer' event.
   * @param handler - The function to handle the event.
   */
  onDeleteRebalancer(handler: (event: UpdateRebalancerEvent) => void) {
    this.program.addEventListener("updateRebalancer", handler);
  }

  /**
   * Adds an event listener for the 'TransferAdmin' event.
   * @param handler - The function to handle the event.
   */
  onTransferAdmin(handler: (event: TransferAdminEvent) => void) {
    this.program.addEventListener("transferAdmin", handler);
  }

  /**
   * Adds an event listener for the 'TransferBasket' event.
   * @param handler - The function to handle the event.
   */
  onTransferBasket(handler: (event: TransferBasketEvent) => void) {
    this.program.addEventListener("transferBasket", handler);
  }

  /**
   * Adds an event listener for the 'UpdateRebalanceMargin' event.
   * @param handler - The function to handle the event.
   */
  onUpdateRebalanceMargin(
    handler: (event: UpdateRebalanceMarginEvent) => void
  ) {
    this.program.addEventListener("updateMaxRebalanceMargin", handler);
  }

  /**
   * Adds an event listener for the 'ExecuteRebalancing' event.
   * @param handler - The function to handle the event.
   */
  onExecuteRebalancing(handler: (event: ExecuteRebalancingEvent) => void) {
    this.program.addEventListener("executeRebalancing", handler);
  }

  /**
   * Adds an event listener for the 'StartRebalancing' event.
   * @param handler - The function to handle the event.
   */
  onStartRebalancing(handler: (event: StartRebalancingEvent) => void) {
    this.program.addEventListener("startRebalancing", handler);
  }

  /**
   * Adds an event listener for the 'StopRebalancing' event.
   * @param handler - The function to handle the event.
   */
  onStopRebalancing(handler: (event: StopRebalancingEvent) => void) {
    this.program.addEventListener("stopRebalancing", handler);
  }

  /**
   * Adds an event listener for the 'BuyComponent' event.
   * @param handler - The function to handle the event.
   */
  onBuyComponent(handler: (event: BuyComponentEvent) => void) {
    this.program.addEventListener("buyComponent", handler);
  }

  /**
   * Adds an event listener for the 'SellComponent' event.
   * @param handler - The function to handle the event.
   */
  onSellComponent(handler: (event: SellComponentEvent) => void) {
    this.program.addEventListener("sellComponent", handler);
  }

  /**
   * Adds an event listener for the 'MintBasketToken' event.
   * @param handler - The function to handle the event.
   */
  onMintBasketToken(handler: (event: MintBasketTokenEvent) => void) {
    this.program.addEventListener("mintBasketToken", handler);
  }

  /**
   * Adds an event listener for the 'RedeemBasketToken' event.
   * @param handler - The function to handle the event.
   */
  onRedeemBasketToken(handler: (event: RedeemBasketTokenEvent) => void) {
    this.program.addEventListener("redeemBasketToken", handler);
  }
}
