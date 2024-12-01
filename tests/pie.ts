import * as anchor from "@coral-xyz/anchor";
import {AnchorProvider, Program} from "@coral-xyz/anchor";
import { Pie } from "../target/types/pie";
import {Connection, Keypair, LAMPORTS_PER_SOL} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {assert} from "chai";

function sleep(s: number) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}

describe("pie", () => {
  // Configure the client to use the local cluster.
  const defaultProvider = anchor.AnchorProvider.env()
  anchor.setProvider(defaultProvider);

  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin))
  const newAdmin = Keypair.generate()

  const connection = new Connection(defaultProvider.connection.rpcEndpoint, 'finalized');
  const adminProvider = new AnchorProvider(connection, new NodeWallet(admin), {
    commitment: 'finalized',
  });

  const defaultProgram = anchor.workspace.Pie as Program<Pie>;

  connection.requestAirdrop(admin.publicKey, LAMPORTS_PER_SOL)
  connection.requestAirdrop(defaultProvider.publicKey, LAMPORTS_PER_SOL)
  connection.requestAirdrop(newAdmin.publicKey, LAMPORTS_PER_SOL)

  it("is success deploy without admin change", async () => {
    const program = anchor.workspace.Pie as Program<Pie>;
    try {
      const tx = await program.methods.initialize().rpc({
        skipPreflight: true
      })
    } catch (e) {}
    await sleep(1)
    const [programStateKey ] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("program_state")],
        program.programId
    )
    const programState = await program.account.programState.fetch(programStateKey)
    assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58())
  });

  describe("transfer_admin", () => {
    it("should be transfer with new admin", async () => {
      try {
        const tx = await defaultProgram.methods.transferAdmin(newAdmin.publicKey).accounts({
          admin: admin.publicKey,
        }).signers([admin]).rpc({
          commitment: "confirmed"
        })
      } catch (e){
        console.log(e)
      }
      await sleep(1)
      const [programStateKey ] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("program_state")],
          defaultProgram.programId
      )
      let programState = await defaultProgram.account.programState.fetch(programStateKey)
      assert.equal(programState.admin.toBase58(), newAdmin.publicKey.toBase58())
      try {
        await defaultProgram.methods.transferAdmin(admin.publicKey).accounts({
          admin: newAdmin.publicKey,
        }).signers([newAdmin]).rpc({
          commitment: "confirmed"
        })
      }catch (e){
        console.log(e)
      }
      await sleep(1)
      programState = await defaultProgram.account.programState.fetch(programStateKey)
      assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58())
    });

    it("should fail if the admin is unauthorized", async () => {

    });
  });

  describe("add_rebalancer", () => {
    it("should add a rebalancer", async () => {

    });

    it("should fail if the admin is unauthorized", async () => {

    });
  });

  describe("delete_rebalancer", () => {
    it("should add a rebalancer", async () => {

    });

    it("should fail if the admin is unauthorized", async () => {

    });
  });

  describe("create_basket", () => {
    describe("v1", () => {
      it("should create a basket with metadata", async () => {

      });

      it("should fail if the creator is unauthorized", async () => {

      });
    });

    describe("v2", () => {
      it("should create a basket with metadata", async () => {

      });

      it("should create a basket with any creator", async () => {

      });
    });
  });

  describe("transfer_basket", () => {
    describe("v1", () => {
      it("disabled by default", async () => {

      });
    });

    describe("v2", () => {
      it("should transfer a basket with new creator", async () => {

      });

      it("should raise error if creator not right", async () => {

      });
    });
  });

  describe("mint_basket", () => {
    it("should ", async () => {

    });

    it("should raise error if creator not right", async () => {

    });
  });
});
