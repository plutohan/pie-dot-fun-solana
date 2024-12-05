import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Pie } from "../target/types/pie";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { assert } from "chai";
import { createBasketComponents, createNewMint } from "./utils/helper";
import { PieProgram } from "../sdk/pie-program";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { initSdk } from "./utils/config";
import { getMint } from "@solana/spl-token";

export type BasketComponent = anchor.IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = anchor.IdlTypes<Pie>["createBasketArgs"];

const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
function sleep(s: number) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

describe("pie", () => {
  // Configure the client to use the local cluster.
  const defaultProvider = anchor.AnchorProvider.env();

  const connection = new Connection("http://localhost:8899", "confirmed");

  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));
  const newAdmin = Keypair.generate();
  const rebalancer = Keypair.generate();

  const pieProgram = new PieProgram(connection);

  it("is success deploy without admin change", async () => {
<<<<<<< HEAD
    const program = anchor.workspace.Pie as Program<Pie>;
    try {
      await program.methods.initialize().rpc({
        skipPreflight: true
      })
    } catch (e) {}
=======
    await Promise.all([
      connection.requestAirdrop(admin.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(defaultProvider.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(newAdmin.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(rebalancer.publicKey, LAMPORTS_PER_SOL),
    ]);
>>>>>>> fbcf75d (add test mint/burn basket token)
    await sleep(1);

    const initTx = await pieProgram.initialize(admin.publicKey);
    console.log("admin: ", admin.publicKey);

    await sendAndConfirmTransaction(connection, initTx, [admin]);

    const programState = await pieProgram.getProgramState();

    assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
  });

  describe("transfer_admin", () => {
    it("should be transfer with new admin", async () => {
<<<<<<< HEAD
      try {
        await defaultProgram.methods.transferAdmin(newAdmin.publicKey).accounts({
          admin: admin.publicKey,
        }).signers([admin]).rpc({
          commitment: "confirmed"
        })
      } catch (e){}
      await sleep(1);
      const [programStateKey] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("program_state")],
        defaultProgram.programId
      );
      let programState = await defaultProgram.account.programState.fetch(
        programStateKey
=======
      const transferTx = await pieProgram.transferAdmin(
        admin.publicKey,
        newAdmin.publicKey
>>>>>>> fbcf75d (add test mint/burn basket token)
      );
      await sendAndConfirmTransaction(connection, transferTx, [admin]);

      let programState = await pieProgram.getProgramState();
      assert.equal(
        programState.admin.toBase58(),
        newAdmin.publicKey.toBase58()
      );

      //transfer back
      const transferBackTx = await pieProgram.transferAdmin(
        newAdmin.publicKey,
        admin.publicKey
      );
      await sendAndConfirmTransaction(connection, transferBackTx, [newAdmin]);

      programState = await pieProgram.getProgramState();
      assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        await defaultProgram.methods.transferAdmin(newAdmin.publicKey).accounts({
          admin: newAdmin.publicKey,
        }).signers([newAdmin]).rpc()
      } catch (e){
        assert.equal(e.error.errorCode.code,"Unauthorized")
      }
    });
  });

  describe("add_rebalancer", () => {
    it("should add a rebalancer", async () => {
      const addRebalancerTx = await pieProgram.addRebalancer(
        admin.publicKey,
        rebalancer.publicKey
      );
      await sendAndConfirmTransaction(connection, addRebalancerTx, [admin]);

      const rebalancerState = await pieProgram.getRebalancerState(
        rebalancer.publicKey
      );
      assert.equal(
        rebalancerState.balancer.toBase58(),
        rebalancer.publicKey.toBase58()
      );
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        await pieProgram.addRebalancer(
          newAdmin.publicKey,
          rebalancer.publicKey
        );
      } catch (e) {
        console.log(e);
      }
    });
  });

  describe("delete_rebalancer", () => {
    it("should add a rebalancer", async () => {
      await sleep(1);
      const deleteRebalancerTx = await pieProgram.deleteRebalancer(
        admin.publicKey,
        rebalancer.publicKey
      );
      await sendAndConfirmTransaction(connection, deleteRebalancerTx, [admin]);
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        const deleteRebalancerTx = await pieProgram.deleteRebalancer(
          newAdmin.publicKey,
          rebalancer.publicKey
        );
        await sendAndConfirmTransaction(connection, deleteRebalancerTx, [
          newAdmin,
        ]);
      } catch (e) {}
    });
  });

  describe("create_basket", () => {
    describe("v1", () => {
      it("should create a basket with metadata", async () => {
        const basketComponents = await createBasketComponents(
          connection,
          admin,
          [1, 2, 3]
        );

        const createBasketArgs: CreateBasketArgs = {
          name: "Basket Name Test",
          symbol: "BNS",
          uri: "test",
          components: basketComponents,
        };

        const { tx, basketMint } = await pieProgram.createBasket(
          admin.publicKey,
          createBasketArgs,
          6
        );

        await sendAndConfirmTransaction(connection, tx, [admin, basketMint]);

        const basketConfig = pieProgram.basketConfigPDA(basketMint.publicKey);
        const basketConfigData = await pieProgram.getBasketConfig(
          basketMint.publicKey
        );

        assert.equal(
          basketConfigData.creator.toBase58(),
          admin.publicKey.toBase58()
        );
        assert.equal(
          basketConfigData.mint.toBase58(),
          basketMint.publicKey.toBase58()
        );
        assert.equal(basketConfigData.components.length, 3);

        const mintData = await getMint(connection, basketMint.publicKey);
        assert.equal(mintData.supply.toString(), "0");
        assert.equal(mintData.decimals, 6);
        assert.equal(
          mintData.mintAuthority?.toBase58(),
          basketConfig.toBase58()
        );
      });

      it("should fail if the creator is unauthorized", async () => {});
    });

    describe("v2", () => {
      it("should create a basket with metadata", async () => {});

      it("should create a basket with any creator", async () => {});
    });
  });

  describe("mint_basket", () => {
    it("should mint a basket token", async () => {});

    it("should raise error if creator not right", async () => {});
  });
});
