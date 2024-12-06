import {
  Keypair,
  PublicKey,
  Connection,
  Signer,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMint,
  createSyncNativeInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  transfer,
} from "@solana/spl-token";
import { BasketComponent } from "../pie";
import { BN } from "@coral-xyz/anchor";
import { Raydium } from "@raydium-io/raydium-sdk-v2";

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
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    to,
    true
  );

  const mintInfo = await getMint(connection, tokenMint);

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
  const sourceTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    from,
    true
  );

  const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
    tokenMint,
    to,
    true
  );

  const mintInfo = await getMint(connection, tokenMint);

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

  for (let i = 0; i < ratios.length; i++) {
    const mint = await createNewMint(connection, creator, 6);
    const component: BasketComponent = {
      mint: mint,
      ratio: new BN(ratios[i]),
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
  console.log(data);
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
      connection,
      new PublicKey(mintOut),
      user,
      user
    );
  if (inputMint.equals(NATIVE_MINT)) {
    const wrappedSolIx = await wrappedSOLInstruction(
      connection,
      user,
      amountIn
    );
    outputTx.add(wrappedSolIx);
  }

  return { tx: outputTx, tokenAccount: outputTokenAccount };
}
export async function getOrCreateTokenAccountTx(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  owner: PublicKey
): Promise<{ tokenAccount: PublicKey; tx: Transaction }> {
  const tokenAccount = await getAssociatedTokenAddress(mint, owner, true);
  let transaction = new Transaction();
  try {
    await getAccount(connection, tokenAccount, "confirmed");
  } catch (error) {
    transaction.add(
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
  return { tokenAccount: tokenAccount, tx: transaction };
}

export async function wrappedSOLInstruction(
  connection: Connection,
  recipient: PublicKey,
  amount: number
) {

  let { tokenAccount: ata, tx: tx } = await getOrCreateTokenAccountTx(
    connection,
    NATIVE_MINT, // mint
    recipient, // owner
    recipient // payer
  );

  console.log('amount: ', amount)
  tx.add(
    SystemProgram.transfer({
      fromPubkey: recipient,
      toPubkey: ata,
      lamports: amount,
    }),
    createSyncNativeInstruction(ata)
  );

  return tx;
}
