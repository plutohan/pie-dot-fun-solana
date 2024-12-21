import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction, createCloseAccountInstruction,
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
import {BasketComponent} from "../pie";
import {BN} from "@coral-xyz/anchor";
import {Raydium} from "@raydium-io/raydium-sdk-v2";
import {PieProgram} from "../../sdk/pie-program";
import {Table} from "console-table-printer";

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

  const { tokenAccount: outputTokenAccount, ixs: outputIxs } =
    await getOrCreateTokenAccountIx(
      connection,
      new PublicKey(mintOut),
      user,
      user
    );
  if (inputMint.equals(NATIVE_MINT)) {
    const wrappedSolIx = await wrappedSOLInstruction(
      user,
      amountIn
    );
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

export async function getTokenAccount(
    mint: PublicKey,
    owner: PublicKey
): Promise<PublicKey> {
  return await getAssociatedTokenAddress(mint, owner, true)
}

export async function wrappedSOLInstruction(
  recipient: PublicKey,
  amount: number
) : Promise<TransactionInstruction[]>{
  let ixs: TransactionInstruction[] = []
  const ata = await getTokenAccount(NATIVE_MINT, recipient)
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
  const basketConfig = await pieProgram.getBasketConfig(basketId);
  const basketMintInfo = await getMint(
    connection,
    pieProgram.basketMintPDA(basketId)
  );

  const table = new Table({
    columns: [
      { name: "mint", alignment: "left", color: "cyan" },
      { name: "basketSupply", alignment: "left", color: "blue" },
      { name: "decimals", alignment: "left", color: "purple" },
      { name: "balance", alignment: "right", color: "green" },
      { name: "quantity", alignment: "right", color: "yellow" },
    ],
  });

  for (let i = 0; i < basketConfig.components.length; i++) {
    const vaultTokenPDA = getAssociatedTokenAddressSync(
      basketConfig.components[i].mint,
      pieProgram.basketConfigPDA(basketId),
      true
    );
    const balance = await connection.getTokenAccountBalance(vaultTokenPDA);

    let component = basketConfig.components[i];
    table.addRow({
      mint: component.mint.toBase58(),
      basketSupply: basketMintInfo.supply,
      decimals: basketMintInfo.decimals,
      balance: balance.value.amount,
      quantity: component.quantityInSysDecimal.toString(),
    });
  }

  return table;
}

export async function showUserFundTable(
  pieProgram: PieProgram,
  userPubkey: PublicKey,
  basketId: BN
) {
  const userFund = await pieProgram.getUserFund(userPubkey, basketId);

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

export function unwrapSolIx(acc: PublicKey, destination: PublicKey) : TransactionInstruction {
  return createCloseAccountInstruction(
      acc,
      destination,
      destination
  )
}

export async function getOrCreateNativeMintATA(connection: Connection, payer: PublicKey, owner: PublicKey) : Promise<{ tokenAccount: PublicKey; tx: Transaction }> {
  const { tokenAccount, tx } = await getOrCreateTokenAccountTx(
      connection,
      new PublicKey(NATIVE_MINT),
      payer,
      owner
  );
  return { tokenAccount, tx };
}