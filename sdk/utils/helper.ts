import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createMint,
  createSyncNativeInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  transfer,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { Raydium, API_URLS } from "@raydium-io/raydium-sdk-v2";
import { BasketComponent, PieProgram } from "../pie-program";
import { Table } from "console-table-printer";
import axios from "axios";
import { BuySwapData, TokenInfo } from "../types";
import { SYS_DECIMALS } from "../constants";

export async function createUserWithLamports(
  connection: Connection,
  lamports: number
): Promise<Signer> {
  const account = Keypair.generate();
  const signature = await connection.requestAirdrop(
    account.publicKey,
    lamports * LAMPORTS_PER_SOL
  );
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ ...block, signature });
  return account;
}

export async function createNewMint(
  connection: Connection,
  creator: Signer,
  decimals: number
): Promise<PublicKey> {
  const tokenMint = await createMint(
    connection,
    creator, // payer
    creator.publicKey, // mintAuthority
    creator.publicKey, // freezeAuthority
    decimals // decimals
  );
  return tokenMint;
}

export async function mintTokenTo(
  connection: Connection,
  tokenMint: PublicKey,
  mintAuthority: Signer,
  payer: Signer,
  to: PublicKey,
  amount: number
): Promise<PublicKey> {
  const programId = (await isToken2022Mint(connection, tokenMint))
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    to,
    true,
    undefined,
    undefined,
    programId
  );

  const mintInfo = await getMint(connection, tokenMint, undefined, programId);

  //mint for dever 3_000_000 tokens
  await mintTo(
    connection,
    payer,
    tokenMint,
    userTokenAccount.address,
    mintAuthority,
    amount * 10 ** mintInfo.decimals
  );

  return userTokenAccount.address;
}

export async function sendTokenTo(
  connection: Connection,
  tokenMint: PublicKey,
  owner: Signer,
  from: PublicKey,
  to: PublicKey,
  amount: number
): Promise<String> {
  const programId = (await isToken2022Mint(connection, tokenMint))
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  const sourceTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    from,
    true,
    programId
  );

  const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
    tokenMint,
    to,
    true,
    undefined,
    undefined,
    programId
  );

  const mintInfo = await getMint(connection, tokenMint, undefined, programId);

  const tx = await transfer(
    connection,
    owner,
    sourceTokenAccount,
    destinationTokenAccount.address,
    owner,
    amount * 10 ** mintInfo.decimals
  );

  return tx;
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createBasketComponents(
  connection: Connection,
  creator: Signer,
  ratios: Array<number>
): Promise<BasketComponent[]> {
  let components: BasketComponent[] = [];
  const decimals = 6;
  for (let i = 0; i < ratios.length; i++) {
    const mint = await createNewMint(connection, creator, decimals);
    const component: BasketComponent = {
      mint: mint,
      quantityInSysDecimal: new BN(ratios[i]),
    };
    components.push(component);
  }

  return components;
}

export async function getRaydiumPoolAccounts(
  connection: Connection,
  raydium: Raydium,
  ammId: string,
  inputMint: PublicKey,
  user: PublicKey,
  amountIn: number
) {
  const txInstructions: any[] = [];

  const data = await raydium.liquidity.getPoolInfoFromRpc({
    poolId: ammId,
  });
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

  const { tokenAccount: outputTokenAccount, ixs: outputIxs } =
    await getOrCreateTokenAccountIx(
      connection,
      new PublicKey(mintOut),
      user,
      user
    );
  if (inputMint.equals(NATIVE_MINT)) {
    const wrappedSolIx = wrapSOLInstruction(user, amountIn);
    outputIxs.push(...wrappedSolIx);
  }

  return { ixs: outputIxs, tokenAccount: outputTokenAccount };
}
export async function getOrCreateTokenAccountIx(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  owner: PublicKey
): Promise<{ tokenAccount: PublicKey; ixs: TransactionInstruction[] }> {
  const tokenAccount = await getAssociatedTokenAddress(mint, owner, true);
  let instructions: TransactionInstruction[] = [];
  try {
    await getAccount(connection, tokenAccount, "confirmed");
  } catch (error) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer,
        tokenAccount,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }
  return { tokenAccount: tokenAccount, ixs: instructions };
}

export async function buildClmmRemainingAccounts(
  tickArray: PublicKey[],
  exTickArrayBitmap?: PublicKey
): Promise<any> {
  const remainingAccounts = [
    ...(exTickArrayBitmap
      ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }]
      : []),
    ...tickArray.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
  ];

  return remainingAccounts;
}

export function wrapSOLInstruction(
  recipient: PublicKey,
  amount: number
): TransactionInstruction[] {
  let ixs: TransactionInstruction[] = [];
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, recipient);
  ixs.push(
    SystemProgram.transfer({
      fromPubkey: recipient,
      toPubkey: ata,
      lamports: amount,
    }),
    createSyncNativeInstruction(ata)
  );
  return ixs;
}

export async function showBasketConfigTable(
  connection: Connection,
  pieProgram: PieProgram,
  basketId: BN
) {
  const basketConfig = await pieProgram.getBasketConfig({ basketId });
  const basketMintInfo = await getMint(
    connection,
    pieProgram.basketMintPDA({ basketId })
  );
  const table = new Table({
    columns: [
      { name: "mint", alignment: "left", color: "cyan" },
      { name: "basketSupply", alignment: "left", color: "blue" },
      { name: "decimals", alignment: "left", color: "purple" },
      { name: "balance", alignment: "right", color: "green" },
      { name: "quantityInSysDecimal", alignment: "right", color: "yellow" },
    ],
  });

  for (let i = 0; i < basketConfig.components.length; i++) {
    const programId = (await isToken2022Mint(
      connection,
      basketConfig.components[i].mint
    ))
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    const vaultTokenPDA = getAssociatedTokenAddressSync(
      basketConfig.components[i].mint,
      pieProgram.basketConfigPDA({ basketId }),
      true,
      programId
    );
    const balance = await connection.getTokenAccountBalance(vaultTokenPDA);

    let component = basketConfig.components[i];
    table.addRow({
      mint: component.mint.toBase58(),
      basketSupply: basketMintInfo.supply,
      decimals: basketMintInfo.decimals,
      balance: balance.value.amount,
      quantityInSysDecimal: component.quantityInSysDecimal.toString(),
    });
  }

  return table;
}

export async function showUserFundTable(
  pieProgram: PieProgram,
  userPubkey: PublicKey,
  basketId: BN
) {
  const userFund = await pieProgram.getUserFund({ user: userPubkey, basketId });

  if (!userFund) {
    console.log("User fund not found");
    return;
  }

  const table = new Table({
    columns: [
      { name: "mint", alignment: "left", color: "cyan" },
      { name: "amount", alignment: "right", color: "green" },
    ],
  });

  for (let i = 0; i < userFund.components.length; i++) {
    let component = userFund.components[i];
    table.addRow({
      mint: component.mint.toBase58(),
      amount: component.amount.toString(),
    });
  }

  return table;
}

export async function showBasketVaultsTable(
  basketVaults: { mint: PublicKey; balance: number }[]
) {
  const table = new Table({
    columns: [
      { name: "mint", alignment: "left", color: "cyan" },
      { name: "balance", alignment: "right", color: "green" },
    ],
  });

  for (let i = 0; i < basketVaults.length; i++) {
    const vault = basketVaults[i];
    table.addRow({
      mint: vault.mint.toBase58(),
      balance: vault.balance.toString(),
    });
  }

  return table;
}

export async function getOrCreateTokenAccountTx(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  owner: PublicKey
): Promise<{
  tokenAccount: PublicKey;
  tx: Transaction | null;
  tokenProgram: PublicKey;
}> {
  const programId = (await isToken2022Mint(connection, mint))
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const tokenAccount = await getAssociatedTokenAddress(
    mint,
    owner,
    true,
    programId
  );
  try {
    await getAccount(connection, tokenAccount, "confirmed", programId);
    return { tokenAccount: tokenAccount, tx: null, tokenProgram: programId };
  } catch (error) {
    let transaction = new Transaction();
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        tokenAccount,
        owner,
        mint,
        programId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    return {
      tokenAccount: tokenAccount,
      tx: transaction,
      tokenProgram: programId,
    };
  }
}

export async function getTokenAccount(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
) {
  const programId = (await isToken2022Mint(connection, mint))
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const tokenAccount = getAssociatedTokenAddressSync(
    mint,
    owner,
    true,
    programId
  );
  return tokenAccount;
}

export async function isToken2022Mint(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(mint);
  if (accountInfo.owner.toString() == TOKEN_2022_PROGRAM_ID.toString()) {
    return true;
  }
  return false;
}

export function unwrapSolIx(
  acc: PublicKey,
  destination: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  return createCloseAccountInstruction(acc, destination, authority);
}

export async function getOrCreateNativeMintATA(
  connection: Connection,
  payer: PublicKey,
  owner: PublicKey
): Promise<{ tokenAccount: PublicKey; tx: Transaction }> {
  const { tokenAccount, tx } = await getOrCreateTokenAccountTx(
    connection,
    new PublicKey(NATIVE_MINT),
    payer,
    owner
  );
  return { tokenAccount, tx };
}

export function getExplorerUrl(txid: string, endpoint: string) {
  const clusterParam = endpoint.includes("devnet") ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${txid}${clusterParam}`;
}

export interface GetSwapDataInput {
  isSwapBaseOut: boolean;
  inputMint: string;
  outputMint: string;
  amount: string;
  slippagePct: number;
}

export interface SwapCompute {
  id: string;
  success: boolean;
  version: "V0" | "V1";
  openTime?: undefined;
  msg?: undefined;
  data?: {
    swapType: "BaseIn" | "BaseOut";
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: number;
    routePlan: {
      poolId: string;
      inputMint: string;
      outputMint: string;
      feeMint: string;
      feeRate: number;
      feeAmount: string;
    }[];
  };
}
export async function getSwapData({
  isSwapBaseOut,
  inputMint,
  outputMint,
  amount,
  slippagePct,
}: GetSwapDataInput): Promise<SwapCompute> {
  const { data: swapResponse } = await axios.get<SwapCompute>(
    `${API_URLS.SWAP_HOST}/compute/${
      isSwapBaseOut ? "swap-base-out" : "swap-base-in"
    }?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
      slippagePct * 100
    }&txVersion=V0`
  );

  return swapResponse;
}

export function checkSwapDataError(swapData: SwapCompute[]) {
  for (let i = 0; i < swapData.length; i++) {
    if (!swapData[i].success) {
      throw new Error(swapData[i].msg);
    }
  }
}

export function checkAndReplaceSwapDataError(
  swapData: SwapCompute[],
  swapBackupData: GetSwapDataInput[]
) {
  for (let i = 0; i < swapData.length; i++) {
    if (!swapData[i].success) {
      if (!swapBackupData[i].isSwapBaseOut) {
        swapData[i].data = {
          ...swapBackupData[i],
          otherAmountThreshold: "0",
          outputAmount: "0",
          swapType: "BaseIn",
          inputAmount: swapBackupData[i].amount.toString(),
          slippageBps: swapBackupData[i].slippagePct * 100,
          priceImpactPct: 0,
          routePlan: [],
        };
      } else {
        throw new Error(swapData[i].msg);
      }
    }
  }
}

export function isValidTransaction(tx: Transaction) {
  if (!tx) return false;
  if (!tx.instructions) return false;
  return tx.instructions.length > 0;
}

export function caculateTotalAmountWithFee(
  amount: number,
  feePercentageInBasisPoints: number
) {
  return Math.ceil(amount * (1 + feePercentageInBasisPoints / 10000));
}

export function getTokenFromTokenInfo(tokenInfo: TokenInfo[], mint: string) {
  const token = tokenInfo.find((token) => token.mint === mint);
  if (!token) {
    throw new Error(`Token not found: ${mint}`);
  }
  return token;
}

export async function simulateTransaction(
  connection: Connection,
  txInBase64: string
) {
  const tx = VersionedTransaction.deserialize(
    Buffer.from(txInBase64, "base64")
  );
  const simulateTx = await connection.simulateTransaction(tx, {
    replaceRecentBlockhash: true,
  });
  console.log(JSON.stringify(simulateTx));

  return simulateTx;
}

export const restoreRawDecimal = (val: BN): BN => {
  return val.div(new BN(SYS_DECIMALS));
};

export const restoreRawDecimalRoundUp = (val: BN): BN => {
  if (val.mod(new BN(SYS_DECIMALS)).isZero()) {
    return restoreRawDecimal(val);
  }
  return restoreRawDecimal(val).add(new BN(1));
};

export const getTokenListFromSolanaClient = async (): Promise<TokenInfo[]> => {
  const { data } = await axios.get(
    "https://pie-program-client-1032702417000.asia-east1.run.app/v1/pie-program/token-pools"
  );

  return data.map((token) => ({
    name: token.name,
    mint: token.mint.toString(),
    poolId: token.poolId.toString(),
    lut: token.lookupTable.toString(),
    type:
      token.poolType === "POOL_TYPE_AMM"
        ? "amm"
        : token.poolType === "POOL_TYPE_CLMM"
        ? "clmm"
        : "cpmm",
  }));
};

export const processBuySwapData = (
  preVaultBalance: number,
  swapData: BuySwapData,
  feePct: number
): {
  isEnough: boolean;
  postVaultBalance?: number;
  insufficientAmount?: number;
} => {
  if (preVaultBalance >= Number(swapData.maxAmountIn) * (1 + feePct / 100)) {
    return {
      isEnough: true,
      postVaultBalance:
        preVaultBalance - Number(swapData.amountIn) * (1 + feePct / 100),
    };
  } else {
    return {
      isEnough: false,
      insufficientAmount:
        Number(swapData.maxAmountIn) * (1 + feePct / 100) - preVaultBalance,
    };
  }
};

export function findDepositAndRemoveInPlace(
  arr: BuySwapData[]
): BuySwapData | null {
  const index = arr.findIndex((item) => item.mint === NATIVE_MINT.toBase58());
  if (index !== -1) {
    return arr.splice(index, 1)[0];
  }
  return null;
}
