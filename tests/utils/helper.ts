import {
    Keypair,
    PublicKey,
    Connection,
    Signer,
    LAMPORTS_PER_SOL,
  } from "@solana/web3.js";
  import {
    createMint,
    getAssociatedTokenAddressSync,
    getMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    transfer,
  } from "@solana/spl-token";
  import { BasketComponent } from "../pie";
  import { BN } from "@coral-xyz/anchor";
  
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
        ratio: ratios[i],
      };
      components.push(component);
    }
  
    return components;
  }