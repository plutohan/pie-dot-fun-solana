import { BN, BorshCoder, EventParser, Idl, Program } from "@coral-xyz/anchor";
import {
  Cluster,
  Commitment,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { PDAs } from "./pda";
import * as PieIDL from "../../target/idl/pie.json";
import { Pie } from "../../target/types/pie";
import {
  AdminInstructions,
  BasketInstructions,
  ComponentInstructions,
  RebalanceInstructions,
  TokenInstructions,
} from "./instructions";
import { AccountQueries } from "./queries/account-queries";
import { TokenQueries } from "./queries/token-queries";
import { EventHandler } from "./events/event-handler";
import { Jito } from "../jito";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { NATIVE_MINT, getAssociatedTokenAddressSync } from "@solana/spl-token";

/**
 * Main PieProgram class that serves as the entry point to the SDK
 */
export class PieProgram {
  private idl = Object.assign({}, PieIDL);
  raydium: Raydium;
  eventParser: EventParser;
  jito: Jito;
  events: EventHandler;

  private pda: PDAs;
  private queries: {
    accounts: AccountQueries;
    tokens: TokenQueries;
  };
  private instructions: {
    admin: AdminInstructions;
    basket: BasketInstructions;
    component: ComponentInstructions;
    rebalance: RebalanceInstructions;
    token: TokenInstructions;
  };

  // Query methods
  getProgramState: (() => Promise<any>) | null = null;
  getBasketConfig: ((params: { basketId: BN }) => Promise<any>) | null = null;
  getUserFund:
    | ((params: { user: PublicKey; basketId: BN }) => Promise<any>)
    | null = null;
  getTokenBalance:
    | ((params: {
        mint: PublicKey;
        owner: PublicKey;
        commitment?: Commitment;
      }) => Promise<number>)
    | null = null;
  getAllTokenAccountWithBalance:
    | ((params: { owner: PublicKey }) => Promise<any>)
    | null = null;

  // Instruction methods
  initialize:
    | ((params: {
        initializer: PublicKey;
        admin: PublicKey;
        creator: PublicKey;
        platformFeeWallet: PublicKey;
        platformFeePercentage: BN;
      }) => Promise<Transaction>)
    | null = null;

  transferAdmin:
    | ((params: {
        admin: PublicKey;
        newAdmin: PublicKey;
      }) => Promise<Transaction>)
    | null = null;
  updateRebalanceMargin:
    | ((params: {
        admin: PublicKey;
        newMargin: number;
      }) => Promise<Transaction>)
    | null = null;
  updateFee:
    | ((params: {
        admin: PublicKey;
        newCreatorFeePercentage: number;
        newPlatformFeePercentage: number;
      }) => Promise<Transaction>)
    | null = null;

  updatePlatformFeeWallet:
    | ((params: {
        admin: PublicKey;
        newPlatformFeeWallet: PublicKey;
      }) => Promise<Transaction>)
    | null = null;
  updateWhitelistedCreators:
    | ((params: {
        admin: PublicKey;
        newWhitelistedCreators: PublicKey[];
      }) => Promise<Transaction>)
    | null = null;

  createBasket:
    | ((params: {
        creator: PublicKey;
        args: {
          components: { mint: PublicKey; quantityInSysDecimal: BN }[];
          name: string;
          symbol: string;
          uri: string;
          rebalancer: PublicKey;
        };
        basketId: BN;
      }) => Promise<Transaction>)
    | null = null;

  updateRebalancer:
    | ((params: {
        creator: PublicKey;
        basketId: BN;
        newRebalancer: PublicKey;
      }) => Promise<Transaction>)
    | null = null;
  startRebalancing:
    | ((params: {
        rebalancer: PublicKey;
        basketId: BN;
      }) => Promise<Transaction>)
    | null = null;
  stopRebalancing:
    | ((params: {
        rebalancer: PublicKey;
        basketId: BN;
      }) => Promise<Transaction>)
    | null = null;

  depositComponent:
    | ((params: {
        user: PublicKey;
        basketId: BN;
        amount: string;
        mint: PublicKey;
      }) => Promise<Transaction>)
    | null = null;
  withdrawComponent:
    | ((params: {
        user: PublicKey;
        basketId: BN;
        amount: string;
        mint: PublicKey;
      }) => Promise<Transaction>)
    | null = null;
  buyComponent:
    | ((params: {
        userSourceOwner: PublicKey;
        basketId: BN;
        maxAmountIn: number;
        amountOut: number;
        ammId: string;
        unwrapSol?: boolean;
      }) => Promise<Transaction>)
    | null = null;

  sellComponent:
    | ((params: {
        user: PublicKey;
        inputMint: PublicKey;
        basketId: BN;
        amountIn: number;
        minimumAmountOut: number;
        ammId: string;
        createNativeMintATA?: boolean;
        unwrapSol?: boolean;
      }) => Promise<Transaction>)
    | null = null;

  executeRebalancing:
    | ((params: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        amount: string;
        otherAmountThreshold: string;
        ammId: string;
        basketId: BN;
        inputMint: PublicKey;
        outputMint: PublicKey;
        createTokenAccount?: boolean;
      }) => Promise<Transaction | null>)
    | null = null;

  executeRebalancingCpmm:
    | ((params: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        amount: string;
        otherAmountThreshold: string;
        poolId: string;
        basketId: BN;
        inputMint: PublicKey;
        outputMint: PublicKey;
        createTokenAccount?: boolean;
      }) => Promise<Transaction | null>)
    | null = null;

  executeRebalancingClmm:
    | ((params: {
        rebalancer: PublicKey;
        isSwapBaseOut: boolean;
        basketId: BN;
        amount: string;
        otherAmountThreshold: string;
        slippage: number;
        poolId: string;
        inputMint: PublicKey;
        outputMint: PublicKey;
        createTokenAccount?: boolean;
      }) => Promise<Transaction>)
    | null = null;

  mintBasketToken:
    | ((params: {
        user: PublicKey;
        basketId: BN;
        amount: string;
      }) => Promise<Transaction>)
    | null = null;
  redeemBasketToken:
    | ((params: {
        user: PublicKey;
        basketId: BN;
        amount: number;
      }) => Promise<Transaction>)
    | null = null;

  /**
   * Constructor to initialize the PieProgram
   */
  constructor(
    public readonly connection: Connection,
    public readonly cluster: Cluster,
    public readonly jitoRpcUrl: string,
    programId: string = PieIDL.address,
    public sharedLookupTable: string = "2ZWHWfumGv3cC4My3xzgQXMWNEnmYGVGnURhpgW6SL7m"
  ) {
    this.idl.address = programId;
    this.jito = new Jito(jitoRpcUrl);
    this.eventParser = new EventParser(
      new PublicKey(programId),
      new BorshCoder(PieIDL as Idl)
    );

    const program = new Program(this.idl as any, {
      connection: this.connection,
    }) as unknown as Program<Pie>;

    this.pda = new PDAs(new PublicKey(programId));

    this.queries = {
      accounts: new AccountQueries(program, this.pda),
      tokens: new TokenQueries(this.connection),
    };

    this.instructions = {
      admin: new AdminInstructions(program, this.pda),
      basket: new BasketInstructions(program, this.pda),
      component: new ComponentInstructions(program, this.pda),
      rebalance: new RebalanceInstructions(program, this.pda),
      token: new TokenInstructions(program, this.pda),
    };

    // Assign query methods
    this.getProgramState = this.queries.accounts.getProgramState.bind(
      this.queries.accounts
    );
    this.getBasketConfig = this.queries.accounts.getBasketConfig.bind(
      this.queries.accounts
    );
    this.getUserFund = this.queries.accounts.getUserFund.bind(
      this.queries.accounts
    );
    this.getTokenBalance = this.queries.tokens.getTokenBalance.bind(
      this.queries.tokens
    );
    this.getAllTokenAccountWithBalance =
      this.queries.tokens.getAllTokenAccountWithBalance.bind(
        this.queries.tokens
      );

    // Assign instruction methods
    this.initialize = this.instructions.admin.initialize.bind(
      this.instructions.admin
    );
    this.transferAdmin = this.instructions.admin.transferAdmin.bind(
      this.instructions.admin
    );
    this.updateFee = this.instructions.admin.updateFee.bind(
      this.instructions.admin
    );
    this.updatePlatformFeeWallet =
      this.instructions.admin.updatePlatformFeeWallet.bind(
        this.instructions.admin
      );
    this.updateWhitelistedCreators =
      this.instructions.admin.updateWhitelistedCreators.bind(
        this.instructions.admin
      );

    this.createBasket = this.instructions.basket.createBasket.bind(
      this.instructions.basket
    );
    this.updateRebalancer = this.instructions.basket.updateRebalancer.bind(
      this.instructions.basket
    );
    this.startRebalancing = this.instructions.basket.startRebalancing.bind(
      this.instructions.basket
    );
    this.stopRebalancing = this.instructions.basket.stopRebalancing.bind(
      this.instructions.basket
    );

    this.depositComponent = this.instructions.component.depositComponent.bind(
      this.instructions.component
    );
    this.withdrawComponent = this.instructions.component.withdrawComponent.bind(
      this.instructions.component
    );
    this.buyComponent = this.instructions.component.buyComponent.bind(
      this.instructions.component
    );
    this.sellComponent = this.instructions.component.sellComponent.bind(
      this.instructions.component
    );

    this.executeRebalancing =
      this.instructions.rebalance.executeRebalancing.bind(
        this.instructions.rebalance
      );
    this.executeRebalancingCpmm =
      this.instructions.rebalance.executeRebalancingCpmm.bind(
        this.instructions.rebalance
      );
    this.executeRebalancingClmm =
      this.instructions.rebalance.executeRebalancingClmm.bind(
        this.instructions.rebalance
      );

    this.mintBasketToken = this.instructions.token.mintBasketToken.bind(
      this.instructions.token
    );
    this.redeemBasketToken = this.instructions.token.redeemBasketToken.bind(
      this.instructions.token
    );

    // Add this line to initialize the EventHandler
    this.events = new EventHandler(new PublicKey(programId), program);
  }

  /**
   * Initialize Raydium
   */
  async init() {
    this.raydium = await Raydium.load({
      connection: this.connection as any,
      cluster: this.cluster as any,
      disableFeatureCheck: true,
      blockhashCommitment: "confirmed",
    });
  }

  /**
   * Get the underlying Anchor program
   */
  get program() {
    return new Program(this.idl as any, {
      connection: this.connection,
    }) as unknown as Program<Pie>;
  }

  /**
   * Helper for basket config PDA
   */
  basketConfigPDA({ basketId }: { basketId: BN }): PublicKey {
    return this.pda.basketConfig({ basketId });
  }

  /**
   * Helper for basket mint PDA
   */
  basketMintPDA({ basketId }: { basketId: BN }): PublicKey {
    return this.pda.basketMint({ basketId });
  }

  /**
   * Helper for user fund PDA
   */
  userFundPDA({
    user,
    basketId,
  }: {
    user: PublicKey;
    basketId: BN;
  }): PublicKey {
    return this.pda.userFund({ user, basketId });
  }

  /**
   * Helper to get platform fee token account
   */
  async getPlatformFeeTokenAccount(): Promise<PublicKey> {
    const programState = await this.getProgramState();
    if (!programState) {
      throw new Error("Program state not found");
    }
    return getAssociatedTokenAddressSync(
      NATIVE_MINT,
      programState.platformFeeWallet,
      true
    );
  }

  /**
   * Helper to get creator fee token account
   */
  async getCreatorFeeTokenAccount({
    basketId,
  }: {
    basketId: BN;
  }): Promise<PublicKey> {
    const basketConfig = await this.getBasketConfig({ basketId });
    if (!basketConfig) {
      throw new Error("Basket config not found");
    }
    return getAssociatedTokenAddressSync(
      NATIVE_MINT,
      basketConfig.creator,
      true
    );
  }
}
