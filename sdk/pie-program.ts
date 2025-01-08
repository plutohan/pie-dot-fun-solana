import {
  BN,
  Idl,
  IdlAccounts,
  IdlEvents,
  IdlTypes,
  Program,
} from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  Cluster,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
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
  CurveCalculator,
  getPdaExBitmapAccount,
  getPdaObservationId,
  MAX_SQRT_PRICE_X64,
  MIN_SQRT_PRICE_X64,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import {
  buildClmmRemainingAccounts,
  caculateTotalAmountWithFee,
  checkSwapDataError,
  getOrCreateNativeMintATA,
  getOrCreateTokenAccountTx,
  getSwapData,
  getTokenAccount,
  getTokenFromTokenInfo,
  isValidTransaction,
  SwapCompute,
  unwrapSolIx,
  wrappedSOLInstruction,
} from "./utils/helper";
import {
  addAddressesToTable,
  createLookupTable,
  findAddressesInTable,
} from "./utils/lookupTable";
import {
  getTipAccounts,
  serializeJitoTransaction,
  getTipInformation,
} from "../sdk/jito";
import { DepositOrWithdrawSolInfo, RebalanceInfo, TokenInfo } from "./types";

export type ProgramState = IdlAccounts<Pie>["programState"];
export type BasketConfig = IdlAccounts<Pie>["basketConfig"];
export type UserFund = IdlAccounts<Pie>["userFund"];

export type BasketComponent = IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = IdlTypes<Pie>["createBasketArgs"];

export type CreateBasketEvent = IdlEvents<Pie>["createBasketEvent"];
export type UpdateRebalancerEvent = IdlEvents<Pie>["updateRebalancerEvent"];
export type TransferAdminEvent = IdlEvents<Pie>["transferAdminEvent"];
export type TransferBasketEvent = IdlEvents<Pie>["transferBasketEvent"];
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

const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export class PieProgram {
  private idl = Object.assign({}, PieIDL);
  raydium: Raydium;

  constructor(
    public readonly connection: Connection,
    public readonly cluster: Cluster,
    programId: string = PieIDL.address,
    public sharedLookupTable: string = "2ZWHWfumGv3cC4My3xzgQXMWNEnmYGVGnURhpgW6SL7m"
  ) {
    this.idl.address = programId;
  }

  async init() {
    this.raydium = await Raydium.load({
      connection: this.connection as any,
      cluster: this.cluster as any,
      disableFeatureCheck: true,
      blockhashCommitment: "finalized",
    });
  }

  get program() {
    return new Program(this.idl as Idl, { connection: this.connection });
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

  basketConfigPDA({ basketId }: { basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_CONFIG), basketId.toArrayLike(Buffer, "be", 8)],
      this.program.programId
    )[0];
  }

  basketMintPDA({ basketId }: { basketId: BN }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BASKET_MINT), basketId.toArrayLike(Buffer, "be", 8)],
      this.program.programId
    )[0];
  }

  userFundPDA({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(USER_FUND),
        user.toBuffer(),
        basketId.toArrayLike(Buffer, "be", 8),
      ],
      this.program.programId
    )[0];
  }

  metadataPDA({ mint }: { mint: PublicKey }): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
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

  async getCreatorFeeTokenAccount({
    basketId,
  }: {
    basketId: BN;
  }): Promise<PublicKey> {
    const basketConfig = await this.getBasketConfig({ basketId });
    const creatorFeeTokenAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketConfig.creator
    );
    return creatorFeeTokenAccount;
  }

  async getBasketConfig({
    basketId,
  }: {
    basketId: BN;
  }): Promise<BasketConfig | null> {
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    try {
      return await this.accounts.basketConfig.fetch(basketConfigPDA);
    } catch (error) {
      return null;
    }
  }

  async getUserFund({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): Promise<UserFund | null> {
    const userFundPDA = this.userFundPDA({ user, basketId });
    try {
      return await this.accounts.userFund.fetch(userFundPDA);
    } catch (error) {
      return null;
    }
  }

  async getTokenBalance({
    mint,
    owner,
  }: {
    mint: PublicKey;
    owner: PublicKey;
  }): Promise<number> {
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

  async getAllTokenAccountWithBalance({ owner }: { owner: PublicKey }): Promise<
    {
      mint: PublicKey;
      owner: PublicKey;
      pubkey: PublicKey;
      tokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number;
        uiAmountString: string;
      };
    }[]
  > {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      owner,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    return tokenAccounts.value.map((tokenAccount) => ({
      mint: tokenAccount.account.data.parsed.info.mint,
      owner: tokenAccount.account.data.parsed.info.owner,
      pubkey: tokenAccount.pubkey,
      tokenAmount: tokenAccount.account.data.parsed.info.tokenAmount,
    }));
  }

  async getBasketVaults({ basketId }: { basketId: BN }): Promise<
    {
      mint: PublicKey;
      balance: number;
    }[]
  > {
    const basketConfig = await this.getBasketConfig({ basketId });

    const tokenMints = [];
    const tokenBalances: Promise<number>[] = [];

    for (const component of basketConfig.components) {
      tokenMints.push(new PublicKey(component.mint));
      tokenBalances.push(
        this.getTokenBalance({
          mint: new PublicKey(component.mint),
          owner: this.basketConfigPDA({ basketId }),
        })
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
  async initialize({
    initializer,
    admin,
    creator,
  }: {
    initializer: PublicKey;
    admin: PublicKey;
    creator: PublicKey;
  }): Promise<Transaction> {
    const tx = await this.program.methods
      .initialize(admin, creator)
      .accounts({ initializer })
      .transaction();
    return tx;
  }

  async addBaksetToSharedLookupTable({
    basketId,
    admin,
  }: {
    basketId: BN;
    admin: Keypair;
  }): Promise<void> {
    const basketConfigPDA = this.basketConfigPDA({ basketId });
    const basketMintPDA = this.basketMintPDA({ basketId });
    const creatorFeeTokenAccount = await this.getCreatorFeeTokenAccount({
      basketId,
    });
    const basketWsolAccount = await getTokenAccount(
      this.connection,
      NATIVE_MINT,
      basketConfigPDA
    );
    await addAddressesToTable(
      this.connection,
      admin,
      new PublicKey(this.sharedLookupTable),
      [
        basketConfigPDA,
        basketMintPDA,
        creatorFeeTokenAccount,
        basketWsolAccount,
      ]
    );
  }

  /**
   * Transfers the admin role to a new account.
   * @param admin - The current admin account.
   * @param newAdmin - The new admin account.
   * @returns A promise that resolves to a transaction.
   */
  async transferAdmin({
    admin,
    newAdmin,
  }: {
    admin: PublicKey;
    newAdmin: PublicKey;
  }): Promise<Transaction> {
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
  async updateRebalanceMargin({
    admin,
    newMargin,
  }: {
    admin: PublicKey;
    newMargin: number;
  }): Promise<Transaction> {
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
  async updateFee({
    admin,
    newCreatorFeePercentage,
    newPlatformFeePercentage,
  }: {
    admin: PublicKey;
    newCreatorFeePercentage: number;
    newPlatformFeePercentage: number;
  }): Promise<Transaction> {
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
  async updatePlatformFeeWallet({
    admin,
    newPlatformFeeWallet,
  }: {
    admin: PublicKey;
    newPlatformFeeWallet: PublicKey;
  }): Promise<Transaction> {
    return await this.program.methods
      .updatePlatformFeeWallet(newPlatformFeeWallet)
      .accounts({ admin, programState: this.programStatePDA })
      .transaction();
  }

  async updateWhitelistedCreators({
    admin,
    newWhitelistedCreators,
  }: {
    admin: PublicKey;
    newWhitelistedCreators: PublicKey[];
  }): Promise<Transaction> {
    return await this.program.methods
      .updateWhitelistedCreators(newWhitelistedCreators)
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
  async createBasketVaultAccounts({
    creator,
    args,
    basketId,
  }: {
    creator: PublicKey;
    args: CreateBasketArgs;
    basketId: BN;
  }): Promise<{ vaults: PublicKey[]; tx: Transaction }> {
    const basketConfig = this.basketConfigPDA({ basketId });

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
  async createBasket({
    creator,
    args,
    basketId,
  }: {
    creator: PublicKey;
    args: CreateBasketArgs;
    basketId: BN;
  }): Promise<Transaction> {
    const basketMint = this.basketMintPDA({ basketId });

    const createBasketTx = await this.program.methods
      .createBasket(args)
      .accountsPartial({
        creator,
        programState: this.programStatePDA,
        metadataAccount: this.metadataPDA({ mint: basketMint }),
        basketConfig: this.basketConfigPDA({ basketId }),
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
  async updateRebalancer({
    creator,
    basketId,
    newRebalancer,
  }: {
    creator: PublicKey;
    basketId: BN;
    newRebalancer: PublicKey;
  }): Promise<Transaction> {
    return await this.program.methods
      .updateRebalancer(newRebalancer)
      .accountsPartial({
        creator,
        basketConfig: this.basketConfigPDA({ basketId }),
      })
      .transaction();
  }

  /**
   * Deposits WSOL into the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of WSOL to deposit.
   * @returns A promise that resolves to a transaction.
   */
  async depositWsol({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({ basketId });
    const tx = new Transaction();
    const inputTokenAccount = await getTokenAccount(
      this.connection,
      NATIVE_MINT,
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        NATIVE_MINT,
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const depositWsolTx = await this.program.methods
      .depositWsol(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA,
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userWsolAccount: inputTokenAccount,
        vaultWsolAccount: outputTokenAccount,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
      })
      .transaction();

    tx.add(depositWsolTx);

    return tx;
  }

  /**
   * Buys a component.
   * @param userSourceOwner - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponent({
    userSourceOwner,
    basketId,
    maxAmountIn,
    amountOut,
    ammId,
    unwrapSol = true,
  }: {
    userSourceOwner: PublicKey;
    basketId: BN;
    maxAmountIn: number;
    amountOut: number;
    ammId: string;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const inputMint = NATIVE_MINT;
    const basketConfig = this.basketConfigPDA({ basketId });

    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      userSourceOwner
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        userSourceOwner,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const buyComponentTx = await this.program.methods
      .buyComponent(new BN(maxAmountIn), new BN(amountOut))
      .accountsPartial({
        userSourceOwner: userSourceOwner,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        amm: new PublicKey(ammId),
        userFund: this.userFundPDA({ user: userSourceOwner, basketId }),
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
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
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
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponentCpmm({
    user,
    basketId,
    amountOut,
    poolId,
  }: {
    user: PublicKey;
    basketId: BN;
    amountOut: number;
    poolId: string;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
    const basketConfig = this.basketConfigPDA({ basketId });

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;
    const rpcData = data.rpcData;

    const baseIn = NATIVE_MINT.toString() === poolKeys.mintA.address;

    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const swapResult = CurveCalculator.swapBaseOut({
      poolMintA: poolInfo.mintA,
      poolMintB: poolInfo.mintB,
      tradeFeeRate: rpcData.configInfo!.tradeFeeRate,
      baseReserve: rpcData.baseReserve,
      quoteReserve: rpcData.quoteReserve,
      outputMint: mintOut,
      outputAmount: new BN(amountOut),
    });

    const buyComponentCpmmTx = await this.program.methods
      .buyComponentCpmm(swapResult.amountIn, new BN(amountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        authority: new PublicKey(poolKeys.authority),
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
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();

    tx.add(buyComponentCpmmTx);
    return tx;
  }

  /**
   * Buys a component using CLMM from Raydium.
   * @param user - The user source owner account.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param poolId - The CLMM pool ID.
   * @returns A promise that resolves to a transaction.
   */
  async buyComponentClmm({
    user,
    basketId,
    amountOut,
    outputMint,
    poolId,
    slippage,
  }: {
    user: PublicKey;
    basketId: BN;
    amountOut: BN;
    outputMint: PublicKey;
    poolId: string;
    slippage: number;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA({ basketId });

    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;
    const { remainingAccounts, ...res } = PoolUtils.computeAmountIn({
      poolInfo: clmmPoolInfo,
      tickArrayCache: tickCache[poolId],
      amountOut,
      baseMint: outputMint,
      slippage,
      epochInfo: await this.raydium.fetchEpochInfo(),
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

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(NATIVE_MINT),
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(baseIn ? mintB : mintA),
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const buyComponentTx = await this.program.methods
      .buyComponentClmm(
        new BN(amountOut),
        res.maxAmountIn.amount,
        sqrtPriceLimitX64
      )
      .accountsPartial({
        user: user,
        userFund: this.userFundPDA({ user, basketId }),
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
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
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponent({
    user,
    inputMint,
    basketId,
    amountIn,
    minimumAmountOut,
    ammId,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    inputMint: PublicKey;
    basketId: BN;
    amountIn: number;
    minimumAmountOut: number;
    ammId: string;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketMint = this.basketMintPDA({ basketId });
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });

    const poolKeys = data.poolKeys;
    const baseIn = inputMint.toString() === poolKeys.mintA.address;

    const [mintIn, mintOut] = baseIn
      ? [poolKeys.mintA.address, poolKeys.mintB.address]
      : [poolKeys.mintB.address, poolKeys.mintA.address];

    const basketConfig = this.basketConfigPDA({ basketId });

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: createNativeMintATATx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        user
      );

    if (createNativeMintATA && isValidTransaction(createNativeMintATATx)) {
      tx.add(createNativeMintATATx);
    }

    const sellComponentTx = await this.program.methods
      .sellComponent(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        basketMint: basketMint,
        amm: new PublicKey(ammId),
        mintIn: new PublicKey(mintIn),
        userFund: this.userFundPDA({ user, basketId }),
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
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
      })
      .transaction();
    tx.add(sellComponentTx);

    if (unwrapSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }

    return tx;
  }

  /**
   * Sell a component CPMM.
   * @param user - The user also payer.
   * @param basketId - The basket ID.
   * @param maxAmountIn - The maximum amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponentCpmm({
    user,
    basketId,
    inputMint,
    amountIn,
    minimumAmountOut,
    poolId,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    basketId: BN;
    inputMint: PublicKey;
    amountIn: number;
    minimumAmountOut: number;
    poolId: string;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA({ basketId });
    const basketMint = this.basketMintPDA({ basketId });

    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);

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

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(mintIn),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(mintOut),
        user,
        user
      );

    if (createNativeMintATA && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const sellComponentTx = await this.program.methods
      .sellComponentCpmm(new BN(amountIn), new BN(minimumAmountOut))
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        basketMint: basketMint,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),

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
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
      })
      .transaction();

    tx.add(sellComponentTx);

    if (unwrapSol) {
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
   * @param ammId - The AMM ID.
   * @returns A promise that resolves to a transaction.
   */
  async sellComponentClmm({
    user,
    basketId,
    amountIn,
    inputMint,
    poolId,
    slippage,
    createNativeMintATA,
    unwrapSol,
  }: {
    user: PublicKey;
    basketId: BN;
    amountIn: BN;
    inputMint: PublicKey;
    poolId: string;
    slippage: number;
    createNativeMintATA?: boolean;
    unwrapSol?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfig = this.basketConfigPDA({ basketId });

    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
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
        slippage,
        epochInfo: await this.raydium.fetchEpochInfo(),
      });

    let sqrtPriceLimitX64: BN;
    sqrtPriceLimitX64 = baseIn
      ? MIN_SQRT_PRICE_X64.add(new BN(1))
      : MAX_SQRT_PRICE_X64.sub(new BN(1));

    const [programId, id] = [
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
    ];

    // const [mintAVault, mintBVault] = [
    //   new PublicKey(poolKeys.vault.A),
    //   new PublicKey(poolKeys.vault.B),
    // ];
    const [mintA, mintB] = [
      new PublicKey(poolInfo.mintA.address),
      new PublicKey(poolInfo.mintB.address),
    ];

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(inputMint),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(NATIVE_MINT),
        user,
        user
      );

    if (createNativeMintATA && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    // @TODO should be minAmountOut.amount.raw but I get negative value
    const otherAmountThreshold = new BN(0);

    const sellComponentTx = await this.program.methods
      .sellComponentClmm(amountIn, otherAmountThreshold, sqrtPriceLimitX64)
      .accountsPartial({
        user: user,
        programState: this.programStatePDA,
        basketConfig: basketConfig,
        userFund: this.userFundPDA({ user, basketId }),
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
        basketMint: this.basketMintPDA({ basketId }),

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
        observationState: new PublicKey(clmmPoolInfo.observationId),
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(programId, id).publicKey
        )
      )
      .transaction();

    tx.add(sellComponentTx);

    if (unwrapSol) {
      tx.add(createCloseAccountInstruction(outputTokenAccount, user, user));
    }
    return tx;
  }

  /**
   * Deposits WSOL into the basket.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount of WSOL to deposit.
   * @returns A promise that resolves to a transaction.
   */
  async withdrawWsol({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const basketConfig = this.basketConfigPDA({ basketId });
    const tx = new Transaction();
    const inputTokenAccount = await getTokenAccount(
      this.connection,
      NATIVE_MINT,
      user
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        NATIVE_MINT,
        user,
        basketConfig
      );

    if (isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const withdrawWsolTx = await this.program.methods
      .withdrawWsol(new BN(amount))
      .accountsPartial({
        user,
        programState: this.programStatePDA,
        userFund: this.userFundPDA({ user, basketId }),
        basketConfig: basketConfig,
        userWsolAccount: inputTokenAccount,
        vaultWsolAccount: outputTokenAccount,
        platformFeeTokenAccount: await this.getPlatformFeeTokenAccount(),
        creatorTokenAccount: await this.getCreatorFeeTokenAccount({ basketId }),
      })
      .transaction();

    tx.add(withdrawWsolTx);

    return tx;
  }
  /**
   * Mints a basket token.
   * @param user - The user account.
   * @param basketId - The basket ID.
   * @param amount - The amount.
   * @returns A promise that resolves to a transaction.
   */
  async mintBasketToken({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    const userFund = this.userFundPDA({ user, basketId });
    const { tokenAccount: userBasketTokenAccount, tx: userBasketTokenTx } =
      await getOrCreateTokenAccountTx(this.connection, basketMint, user, user);
    if (isValidTransaction(userBasketTokenTx)) {
      tx.add(userBasketTokenTx);
    }
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
  async redeemBasketToken({
    user,
    basketId,
    amount,
  }: {
    user: PublicKey;
    basketId: BN;
    amount: number;
  }): Promise<Transaction> {
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
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
        userFund: this.userFundPDA({ user, basketId }),
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
  async startRebalancing({
    rebalancer,
    basketId,
  }: {
    rebalancer: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    const basketConfigData = await this.getBasketConfig({ basketId });
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
            basketConfig: this.basketConfigPDA({ basketId }),
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
  async stopRebalancing({
    rebalancer,
    basketId,
  }: {
    rebalancer: PublicKey;
    basketId: BN;
  }): Promise<Transaction> {
    const basketPDA = this.basketConfigPDA({ basketId });
    const vaultWrappedSol = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketPDA,
      true
    );
    return await this.program.methods
      .stopRebalancing()
      .accountsPartial({
        rebalancer,
        basketConfig: basketPDA,
        vaultWrappedSol: vaultWrappedSol,
        wrappedSolMint: NATIVE_MINT,
      })
      .transaction();
  }

  /**
   * Executes rebalancing.
   * @param rebalancer - The rebalancer account.
   * @param isSwapBaseOut - Whether to swap base out.
   * @param amountIn - The amount in.
   * @param amountOut - The amount out.
   * @param ammId - The AMM ID.
   * @param basketId - The basket ID.
   * @param inputMint - The input mint.
   * @param outputMint - The output mint.
   * @param createTokenAccount - Whether to create the output token account.
   * @returns A promise that resolves to a transaction or null.
   */
  async executeRebalancing({
    rebalancer,
    isSwapBaseOut,
    amountIn,
    amountOut,
    ammId,
    basketId,
    inputMint,
    outputMint,
    createTokenAccount = true,
  }: {
    rebalancer: PublicKey;
    isSwapBaseOut: boolean;
    amountIn: string;
    amountOut: string;
    ammId: string;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    createTokenAccount?: boolean;
  }): Promise<Transaction | null> {
    const tx = new Transaction();
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });

    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });
    const poolKeys = data.poolKeys;

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(inputMint),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(outputMint),
        rebalancer,
        basketConfig
      );

    if (createTokenAccount && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const executeRebalancingTx = await this.program.methods
      .executeRebalancing(isSwapBaseOut, new BN(amountIn), new BN(amountOut))
      .accountsPartial({
        rebalancer,
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint,
        vaultWrappedSol: NATIVE_MINT,
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
      })
      .transaction();
    tx.add(executeRebalancingTx);
    return tx;
  }

  async executeRebalancingCpmm({
    rebalancer,
    isSwapBaseOut,
    amountIn,
    amountOut,
    poolId,
    basketId,
    inputMint,
    outputMint,
    createTokenAccount = true,
  }: {
    rebalancer: PublicKey;
    isSwapBaseOut: boolean;
    amountIn: string;
    amountOut: string;
    poolId: string;
    basketId: BN;
    inputMint: PublicKey;
    outputMint: PublicKey;
    createTokenAccount?: boolean;
  }): Promise<Transaction | null> {
    const tx = new Transaction();
    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
    const basketMint = this.basketMintPDA({ basketId });
    const basketConfig = this.basketConfigPDA({ basketId });

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;

    const inputTokenAccount = await getTokenAccount(
      this.connection,
      new PublicKey(inputMint),
      basketConfig
    );

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(outputMint),
        rebalancer,
        basketConfig
      );

    if (createTokenAccount && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;

    let inputVault;
    let outputVault;
    let inputTokenProgram;
    let outputTokenProgram;
    let inputTokenMint;
    let outputTokenMint;

    if (isInputMintA) {
      inputVault = new PublicKey(poolKeys.vault.A);
      outputVault = new PublicKey(poolKeys.vault.B);
      inputTokenProgram = new PublicKey(poolKeys.mintA.programId);
      outputTokenProgram = new PublicKey(poolKeys.mintB.programId);
      inputTokenMint = new PublicKey(poolKeys.mintA.address);
      outputTokenMint = new PublicKey(poolKeys.mintB.address);
    } else {
      inputVault = new PublicKey(poolKeys.vault.B);
      outputVault = new PublicKey(poolKeys.vault.A);
      inputTokenProgram = new PublicKey(poolKeys.mintB.programId);
      outputTokenProgram = new PublicKey(poolKeys.mintA.programId);
      inputTokenMint = new PublicKey(poolKeys.mintB.address);
      outputTokenMint = new PublicKey(poolKeys.mintA.address);
    }

    const executeRebalancingTx = await this.program.methods
      .executeRebalancingCpmm(
        isSwapBaseOut,
        new BN(amountIn),
        new BN(amountOut)
      )
      .accountsPartial({
        rebalancer,
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint,
        vaultWrappedSol: NATIVE_MINT,
        authority: new PublicKey(poolKeys.authority),
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolInfo.id),
        inputVault,
        outputVault,
        inputTokenProgram,
        outputTokenProgram,
        inputTokenMint,
        outputTokenMint,
        observationState: getPdaObservationId(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.id)
        ).publicKey,
        vaultTokenSource: inputTokenAccount,
        vaultTokenDestination: outputTokenAccount,
      })
      .transaction();
    tx.add(executeRebalancingTx);
    return tx;
  }

  /**
   * Execute rebalancing using Raydium CLMM (Concentrated Liquidity Market Maker) pool
   * @param rebalancer - The rebalancer's public key who has permission to rebalance
   * @param isSwapBaseOut - Whether this is a swap where amount specified is the output amount
   * @param basketId - The ID of the basket being rebalanced
   * @param amount - The amount to swap (either input or output amount depending on isSwapBaseOut)
   * @param slippage - Slippage in basis points
   * @param poolId - The Raydium CLMM pool ID to execute the swap on
   * @param inputMint - The mint address of the input token
   * @param outputMint - The mint address of the output token
   */
  async executeRebalancingClmm({
    rebalancer,
    isSwapBaseOut,
    basketId,
    amount,
    slippage,
    poolId,
    inputMint,
    outputMint,
    createTokenAccount = true,
  }: {
    rebalancer: PublicKey;
    isSwapBaseOut: boolean;
    basketId: BN;
    amount: BN;
    slippage: number;
    poolId: string;
    inputMint: PublicKey;
    outputMint: PublicKey;
    createTokenAccount?: boolean;
  }): Promise<Transaction> {
    const tx = new Transaction();
    const basketConfigPDA = this.basketConfigPDA({ basketId });

    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
    const poolInfo = data.poolInfo;
    const poolKeys = data.poolKeys;
    const clmmPoolInfo = data.computePoolInfo;
    const tickCache = data.tickData;

    let remainingAccounts;
    let otherAmountThreshold;
    const isInputMintA = inputMint.toBase58() === poolKeys.mintA.address;
    const sqrtPriceLimitX64 = isInputMintA
      ? MIN_SQRT_PRICE_X64.add(new BN(1))
      : MAX_SQRT_PRICE_X64.sub(new BN(1));
    if (isSwapBaseOut) {
      const computed = PoolUtils.computeAmountIn({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountOut: amount,
        baseMint: outputMint,
        slippage,
        epochInfo: await this.raydium.fetchEpochInfo(),
      });
      remainingAccounts = computed.remainingAccounts;
      otherAmountThreshold = computed.maxAmountIn.amount;
    } else {
      const computed = PoolUtils.computeAmountOut({
        poolInfo: clmmPoolInfo,
        tickArrayCache: tickCache[poolId],
        amountIn: amount,
        baseMint: inputMint,
        slippage,
        epochInfo: await this.raydium.fetchEpochInfo(),
        catchLiquidityInsufficient: true,
      });

      remainingAccounts = computed.remainingAccounts;
      // @TODO should be computed.minAmountOut.amount, but it's not working
      otherAmountThreshold = new BN(0);
    }

    const { tokenAccount: outputTokenAccount, tx: outputTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        outputMint,
        rebalancer,
        basketConfigPDA
      );

    if (createTokenAccount && isValidTransaction(outputTx)) {
      tx.add(outputTx);
    }

    const executeRabalancingClmmTx = await this.program.methods
      .executeRebalancingClmm(
        isSwapBaseOut,
        amount,
        otherAmountThreshold,
        sqrtPriceLimitX64
      )
      .accountsPartial({
        rebalancer,
        basketConfig: this.basketConfigPDA({ basketId }),
        basketMint: this.basketMintPDA({ basketId }),
        vaultWrappedSol: NATIVE_MINT,
        ammConfig: new PublicKey(poolKeys.config.id),
        poolState: new PublicKey(poolKeys.id),
        vaultTokenSource: await getTokenAccount(
          this.connection,
          inputMint,
          basketConfigPDA
        ),
        vaultTokenDestination: outputTokenAccount,
        inputVault: isInputMintA
          ? new PublicKey(poolKeys.vault.A)
          : new PublicKey(poolKeys.vault.B),
        outputVault: isInputMintA
          ? new PublicKey(poolKeys.vault.B)
          : new PublicKey(poolKeys.vault.A),
        observationState: new PublicKey(clmmPoolInfo.observationId),
        inputVaultMint: isInputMintA
          ? new PublicKey(poolKeys.mintA.address)
          : new PublicKey(poolKeys.mintB.address),
        outputVaultMint: isInputMintA
          ? new PublicKey(poolKeys.mintB.address)
          : new PublicKey(poolKeys.mintA.address),
        tokenMint: new PublicKey(poolKeys.mintA.address),
      })
      .remainingAccounts(
        await buildClmmRemainingAccounts(
          remainingAccounts,
          getPdaExBitmapAccount(
            new PublicKey(poolInfo.programId),
            new PublicKey(poolInfo.id)
          ).publicKey
        )
      )
      .transaction();

    tx.add(executeRabalancingClmmTx);
    return tx;
  }

  async addRaydiumAmmToAddressLookupTable({
    connection,
    signer,
    ammId,
    lookupTable,
  }: {
    connection: Connection;
    signer: Keypair;
    ammId: string;
    lookupTable?: PublicKey;
  }) {
    const data = await this.raydium.liquidity.getPoolInfoFromRpc({
      poolId: ammId,
    });
    const MAX_LOOKUP_TABLE_ADDRESS = 256;
    const poolKeys = data.poolKeys;

    const addressesKey = [
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

  async addRaydiumCpmmToAddressLookupTable({
    connection,
    signer,
    poolId,
    lookupTable,
  }: {
    connection: Connection;
    signer: Keypair;
    poolId: string;
    lookupTable?: PublicKey;
  }) {
    const data = await this.raydium.cpmm.getPoolInfoFromRpc(poolId);
    const MAX_LOOKUP_TABLE_ADDRESS = 256;

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;

    const addressesKey = [
      new PublicKey(poolKeys.mintA.address),
      new PublicKey(poolKeys.mintB.address),
      new PublicKey(poolId),
      new PublicKey(poolKeys.authority),
      new PublicKey(poolKeys.config.id),
      new PublicKey(poolInfo.id),
      new PublicKey(poolKeys.vault.A),
      new PublicKey(poolKeys.vault.B),
      TOKEN_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID,
      new PublicKey(poolKeys.programId),
      getPdaObservationId(
        new PublicKey(poolInfo.programId),
        new PublicKey(poolInfo.id)
      ).publicKey,
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

  async addRaydiumClmmToAddressLookupTable({
    connection,
    signer,
    poolId,
    lookupTable,
  }: {
    connection: Connection;
    signer: Keypair;
    poolId: string;
    lookupTable?: PublicKey;
  }) {
    const data = await this.raydium.clmm.getPoolInfoFromRpc(poolId);
    const MAX_LOOKUP_TABLE_ADDRESS = 256;

    const poolKeys = data.poolKeys;
    const poolInfo = data.poolInfo;

    const addressesKey = [
      new PublicKey(poolKeys.mintA.address),
      new PublicKey(poolKeys.mintB.address),
      new PublicKey(poolId),
      new PublicKey(poolKeys.vault.A),
      new PublicKey(poolKeys.vault.B),
      new PublicKey(poolKeys.config.id),
      TOKEN_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID,
      new PublicKey(poolKeys.programId),
      getPdaObservationId(
        new PublicKey(poolInfo.programId),
        new PublicKey(poolInfo.id)
      ).publicKey,
      new PublicKey(poolKeys.exBitmapAccount),
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

  async generateLookupTableAccount(): Promise<AddressLookupTableAccount[]> {
    const lut = (
      await this.connection.getAddressLookupTable(
        new PublicKey(this.sharedLookupTable)
      )
    ).value;
    return [lut];
  }

  /**
   * Creates a bundle of transactions for buying components and minting basket tokens
   * @param params Bundle creation parameters
   * @returns Array of serialized transactions
   */
  async createBuyAndMintBundle({
    user,
    basketId,
    slippage,
    mintAmount,
    swapsPerBundle,
    tokenInfo,
    feePercentageInBasisPoints,
  }: {
    user: PublicKey;
    basketId: BN;
    slippage: number;
    mintAmount: number;
    swapsPerBundle: number;
    tokenInfo: TokenInfo[];
    feePercentageInBasisPoints: number;
  }): Promise<string[]> {
    const tipAccounts = await getTipAccounts();
    const tipInformation = await getTipInformation();
    const serializedTxs: string[] = [];
    let tx = new Transaction();
    let addressLookupTablesAccount: AddressLookupTableAccount[] =
      await this.generateLookupTableAccount();
    const recentBlockhash = await this.connection.getLatestBlockhash(
      "finalized"
    );
    const basketConfigData = await this.getBasketConfig({ basketId });
    const swapData: Promise<SwapCompute>[] = [];
    let depositData: DepositOrWithdrawSolInfo | undefined;
    basketConfigData.components.forEach((component) => {
      if (component.mint.toBase58() === NATIVE_MINT.toBase58()) {
        depositData = {
          type: "deposit",
          amount: component.quantityInSysDecimal
            .mul(new BN(mintAmount))
            .div(new BN(10 ** 6))
            .toNumber(),
        };
      } else {
        swapData.push(
          getSwapData({
            isSwapBaseOut: true,
            inputMint: NATIVE_MINT.toBase58(),
            outputMint: component.mint.toBase58(),
            amount: component.quantityInSysDecimal
              .mul(new BN(mintAmount))
              .div(new BN(10 ** 6))
              .toNumber(),
            slippage,
          })
        );
      }
    });

    const swapDataResult = await Promise.all(swapData);
    checkSwapDataError(swapDataResult);

    //@TODO remove this when other pools are available
    // for (let i = 0; i < swapDataResult.length; i++) {
    //   if (swapDataResult[i].data.routePlan[0].poolId !== tokenInfo[i].poolId) {
    //     console.log(
    //       `${tokenInfo[i].name}'s AMM has little liquidity, increase slippage`
    //     );
    //     swapDataResult[i].data.otherAmountThreshold = String(
    //       Number(swapDataResult[i].data.otherAmountThreshold) * 10
    //     );
    //   }
    // }

    // Calculate total amount needed
    const totalAmountIn =
      swapDataResult.reduce(
        (acc, curr) => acc + Number(curr.data.otherAmountThreshold),
        0
      ) + depositData?.amount;

    // Create WSOL account and wrap SOL
    const { tokenAccount: wsolAccount, tx: createWsolAtaTx } =
      await getOrCreateTokenAccountTx(
        this.connection,
        new PublicKey(NATIVE_MINT),
        user,
        user
      );

    if (isValidTransaction(createWsolAtaTx)) {
      tx.add(createWsolAtaTx);
    }

    const wrappedSolIx = await wrappedSOLInstruction(
      user,
      caculateTotalAmountWithFee(totalAmountIn, feePercentageInBasisPoints)
    );
    tx.add(...wrappedSolIx);

    if (depositData) {
      const depositIx = await this.depositWsol({
        user,
        basketId,
        amount: depositData.amount,
      });
      tx.add(depositIx);
      tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1500000 })
      );
    }

    // Process each component
    for (let i = 0; i < swapDataResult.length; i++) {
      if (i > 0 && i % swapsPerBundle === 0) {
        const serializedTx = await serializeJitoTransaction({
          recentBlockhash: recentBlockhash.blockhash,
          transaction: tx,
          lookupTables: addressLookupTablesAccount,
          signer: user,
        });
        serializedTxs.push(serializedTx);

        tx = new Transaction();
        addressLookupTablesAccount = await this.generateLookupTableAccount();
      }

      const token = getTokenFromTokenInfo(
        tokenInfo,
        swapDataResult[i].data.outputMint
      );

      let buyComponentTx;
      switch (token.type) {
        case "amm":
          buyComponentTx = await this.buyComponent({
            userSourceOwner: user,
            basketId,
            maxAmountIn: Number(swapDataResult[i].data.otherAmountThreshold),
            amountOut: Number(swapDataResult[i].data.outputAmount),
            ammId: token.poolId,
            unwrapSol: false,
          });
          break;
        case "clmm":
          buyComponentTx = await this.buyComponentClmm({
            user,
            basketId,
            amountOut: new BN(swapDataResult[i].data.outputAmount),
            outputMint: new PublicKey(token.mint),
            poolId: token.poolId,
            slippage,
          });
          break;
        case "cpmm":
          buyComponentTx = await this.buyComponentCpmm({
            user,
            basketId,
            amountOut: Number(swapDataResult[i].data.outputAmount),
            poolId: token.poolId,
          });
          break;
      }
      tx.add(buyComponentTx);

      const lut = (
        await this.connection.getAddressLookupTable(new PublicKey(token.lut))
      ).value;
      addressLookupTablesAccount.push(lut);

      // Handle final transaction in bundle
      if (i === swapData.length - 1) {
        const mintBasketTokenTx = await this.mintBasketToken({
          user,
          basketId,
          amount: mintAmount,
        });
        tx.add(mintBasketTokenTx);

        tx.add(createCloseAccountInstruction(wsolAccount, user, user));

        const serializedTx = await serializeJitoTransaction({
          recentBlockhash: recentBlockhash.blockhash,
          transaction: tx,
          lookupTables: addressLookupTablesAccount,
          signer: user,
          jitoTipAccount: new PublicKey(
            tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
          ),
          amountInLamports: Math.floor(
            tipInformation?.landed_tips_50th_percentile * LAMPORTS_PER_SOL
          ),
        });
        serializedTxs.push(serializedTx);
      }
    }

    return serializedTxs;
  }

  /**
   * Creates a bundle of transactions for redeeming basket tokens and selling components
   * @param params Bundle creation parameters
   * @returns Array of serialized transactions
   */
  async createRedeemAndSellBundle({
    user,
    basketId,
    slippage,
    redeemAmount,
    swapsPerBundle,
    tokenInfo,
  }: {
    user: PublicKey;
    basketId: BN;
    slippage: number;
    redeemAmount: number;
    swapsPerBundle: number;
    tokenInfo: TokenInfo[];
  }): Promise<string[]> {
    const tipAccounts = await getTipAccounts();
    const tipInformation = await getTipInformation();
    const serializedTxs: string[] = [];
    let tx = new Transaction();
    let addressLookupTablesAccount: AddressLookupTableAccount[] =
      await this.generateLookupTableAccount();
    const recentBlockhash = await this.connection.getLatestBlockhash(
      "finalized"
    );
    const swapData = [];
    const basketConfigData = await this.getBasketConfig({ basketId });
    let withdrawData: DepositOrWithdrawSolInfo | undefined;
    basketConfigData.components.forEach((component) => {
      if (component.mint.toBase58() === NATIVE_MINT.toBase58()) {
        withdrawData = {
          type: "withdraw",
          amount: component.quantityInSysDecimal
            .mul(new BN(redeemAmount))
            .div(new BN(10 ** 6))
            .toNumber(),
        };
      } else {
        swapData.push(
          getSwapData({
            isSwapBaseOut: false,
            inputMint: component.mint.toBase58(),
            outputMint: NATIVE_MINT.toBase58(),
            amount: component.quantityInSysDecimal
              .mul(new BN(redeemAmount))
              .div(new BN(10 ** 6))
              .toNumber(),
            slippage,
          })
        );
      }
    });

    const swapDataResult = await Promise.all(swapData);
    checkSwapDataError(swapDataResult);

    //@TODO remove this when other pools are available
    // for (let i = 0; i < swapDataResult.length; i++) {
    //   if (swapDataResult[i].data.routePlan[0].poolId !== tokenInfo[i].poolId) {
    //     console.log(
    //       `${tokenInfo[i].name}'s AMM has little liquidity, increase slippage`
    //     );
    //     swapDataResult[i].data.otherAmountThreshold =
    //       swapDataResult[i].data.otherAmountThreshold / 10;
    //   }
    // }

    // Create native mint ATA
    const { tokenAccount: nativeMintAta, tx: createNativeMintATATx } =
      await getOrCreateNativeMintATA(this.connection, user, user);

    if (isValidTransaction(createNativeMintATATx)) {
      tx.add(createNativeMintATATx);
    }

    for (let i = 0; i < swapDataResult.length; i++) {
      if (i === 0) {
        tx.add(
          await this.redeemBasketToken({ user, basketId, amount: redeemAmount })
        );
      } else if (i % swapsPerBundle === 0) {
        const serializedTx = await serializeJitoTransaction({
          recentBlockhash: recentBlockhash.blockhash,
          transaction: tx,
          lookupTables: addressLookupTablesAccount,
          signer: user,
        });
        serializedTxs.push(serializedTx);

        tx = new Transaction();
        addressLookupTablesAccount = await this.generateLookupTableAccount();
      }

      let sellComponentTx;
      switch (tokenInfo[i].type) {
        case "amm":
          sellComponentTx = await this.sellComponent({
            user,
            inputMint: new PublicKey(swapDataResult[i].data.inputMint),
            basketId,
            amountIn: Number(swapDataResult[i].data.inputAmount),
            minimumAmountOut: Number(
              swapDataResult[i].data.otherAmountThreshold
            ),
            ammId: tokenInfo[i].poolId,
          });
          break;
        case "clmm":
          sellComponentTx = await this.sellComponentClmm({
            user,
            basketId,
            amountIn: new BN(swapDataResult[i].data.inputAmount),
            inputMint: new PublicKey(swapDataResult[i].data.inputMint),
            poolId: tokenInfo[i].poolId,
            slippage,
          });
          break;
        case "cpmm":
          sellComponentTx = await this.sellComponentCpmm({
            user,
            basketId,
            inputMint: new PublicKey(swapDataResult[i].data.inputMint),
            amountIn: Number(swapDataResult[i].data.inputAmount),
            minimumAmountOut: Number(
              swapDataResult[i].data.otherAmountThreshold
            ),
            poolId: tokenInfo[i].poolId,
          });
          break;
      }
      tx.add(sellComponentTx);

      const lut = (
        await this.connection.getAddressLookupTable(
          new PublicKey(tokenInfo[i].lut)
        )
      ).value;
      addressLookupTablesAccount.push(lut);

      if (i === swapDataResult.length - 1) {
        if (withdrawData) {
          tx.add(
            await this.withdrawWsol({
              user,
              basketId,
              amount: withdrawData.amount,
            })
          );
        }
        tx.add(unwrapSolIx(nativeMintAta, user, user));

        const serializedTx = await serializeJitoTransaction({
          recentBlockhash: recentBlockhash.blockhash,
          transaction: tx,
          lookupTables: addressLookupTablesAccount,
          signer: user,
          jitoTipAccount: new PublicKey(
            tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
          ),
          amountInLamports: Math.floor(
            tipInformation?.landed_tips_50th_percentile * LAMPORTS_PER_SOL
          ),
        });
        serializedTxs.push(serializedTx);
      }
    }

    return serializedTxs;
  }

  async createRebalanceBundle({
    basketId,
    rebalancer,
    slippage,
    swapsPerBundle,
    rebalanceInfo,
    withStartRebalance,
    withStopRebalance,
  }: {
    rebalancer: PublicKey;
    basketId: BN;
    slippage: number;
    swapsPerBundle: number;
    rebalanceInfo: RebalanceInfo[];
    withStartRebalance?: boolean;
    withStopRebalance?: boolean;
  }): Promise<string[]> {
    const tipAccounts = await getTipAccounts();
    const tipInformation = await getTipInformation();
    const serializedTxs: string[] = [];
    let tx = new Transaction();

    let addressLookupTablesAccount: AddressLookupTableAccount[] =
      await this.generateLookupTableAccount();
    const swapData: Promise<SwapCompute>[] = [];
    rebalanceInfo.forEach((rebalance) => {
      swapData.push(
        getSwapData({
          isSwapBaseOut: rebalance.isSwapBaseOut,
          inputMint: rebalance.inputMint,
          outputMint: rebalance.outputMint,
          amount: Number(rebalance.amount),
          slippage,
        })
      );
    });

    const swapDataResult = await Promise.all(swapData);
    checkSwapDataError(swapDataResult);

    const blockhash = await this.connection.getLatestBlockhash();

    for (let i = 0; i < rebalanceInfo.length; i++) {
      if (i === 0) {
        if (withStartRebalance) {
          const startRebalanceTx = await this.startRebalancing({
            rebalancer,
            basketId,
          });
          if (isValidTransaction(startRebalanceTx)) {
            tx.add(startRebalanceTx);
          }
        }

        const { tx: createNativeMintATATx } = await getOrCreateNativeMintATA(
          this.connection,
          rebalancer,
          this.basketConfigPDA({ basketId })
        );

        if (isValidTransaction(createNativeMintATATx)) {
          tx.add(createNativeMintATATx);
        }
      } else if (i % swapsPerBundle === 0) {
        const serializedTx = await serializeJitoTransaction({
          recentBlockhash: blockhash.blockhash,
          transaction: tx,
          lookupTables: addressLookupTablesAccount,
          signer: rebalancer,
        });
        serializedTxs.push(serializedTx);

        tx = new Transaction();

        addressLookupTablesAccount = await this.generateLookupTableAccount();
      }

      let rebalanceTx;
      switch (rebalanceInfo[i].type) {
        case "amm":
          rebalanceTx = await this.executeRebalancing({
            rebalancer,
            isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
            amountIn: rebalanceInfo[i].isSwapBaseOut
              ? swapDataResult[i].data.otherAmountThreshold
              : swapDataResult[i].data.inputAmount,
            amountOut: rebalanceInfo[i].isSwapBaseOut
              ? swapDataResult[i].data.outputAmount
              : swapDataResult[i].data.otherAmountThreshold,
            ammId: rebalanceInfo[i].poolId,
            basketId,
            inputMint: new PublicKey(rebalanceInfo[i].inputMint),
            outputMint: new PublicKey(rebalanceInfo[i].outputMint),
            // do not create token account for native mint because it is already created in the startRebalanceTx
            createTokenAccount:
              rebalanceInfo[i].outputMint === NATIVE_MINT.toBase58()
                ? false
                : true,
          });
          tx.add(rebalanceTx);
          break;
        case "clmm":
          rebalanceTx = await this.executeRebalancingClmm({
            rebalancer,
            basketId,
            isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
            inputMint: new PublicKey(rebalanceInfo[i].inputMint),
            outputMint: new PublicKey(rebalanceInfo[i].outputMint),
            amount: new BN(rebalanceInfo[i].amount),
            poolId: rebalanceInfo[i].poolId,
            slippage,
            createTokenAccount:
              rebalanceInfo[i].outputMint === NATIVE_MINT.toBase58()
                ? false
                : true,
          });
          tx.add(rebalanceTx);

          break;
        case "cpmm":
          rebalanceTx = await this.executeRebalancingCpmm({
            rebalancer,
            basketId,
            isSwapBaseOut: rebalanceInfo[i].isSwapBaseOut,
            amountIn: rebalanceInfo[i].isSwapBaseOut
              ? swapDataResult[i].data.otherAmountThreshold
              : swapDataResult[i].data.inputAmount,
            amountOut: rebalanceInfo[i].isSwapBaseOut
              ? swapDataResult[i].data.outputAmount
              : swapDataResult[i].data.otherAmountThreshold,
            poolId: rebalanceInfo[i].poolId,
            inputMint: new PublicKey(rebalanceInfo[i].inputMint),
            outputMint: new PublicKey(rebalanceInfo[i].outputMint),
            createTokenAccount:
              rebalanceInfo[i].outputMint === NATIVE_MINT.toBase58()
                ? false
                : true,
          });
          tx.add(rebalanceTx);
          break;
      }

      const lut = (
        await this.connection.getAddressLookupTable(
          new PublicKey(rebalanceInfo[i].lut)
        )
      ).value;
      addressLookupTablesAccount.push(lut);

      if (i == rebalanceInfo.length - 1) {
        if (withStopRebalance) {
          const stopRebalanceTx = await this.stopRebalancing({
            rebalancer,
            basketId,
          });
          tx.add(stopRebalanceTx);
        }

        const serializedTx = await serializeJitoTransaction({
          recentBlockhash: blockhash.blockhash,
          transaction: tx,
          lookupTables: addressLookupTablesAccount,
          signer: rebalancer,
          jitoTipAccount: new PublicKey(
            tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
          ),
          amountInLamports: Math.floor(
            tipInformation?.landed_tips_50th_percentile * LAMPORTS_PER_SOL
          ),
        });
        serializedTxs.push(serializedTx);
      }
    }

    return serializedTxs;
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
