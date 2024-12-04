import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Pie } from "../target/types/pie";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { assert } from "chai";
import { createBasketComponents, createNewMint } from "./utils/helper";

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
  anchor.setProvider(defaultProvider);

  const admin = Keypair.fromSecretKey(new Uint8Array(devnetAdmin));
  const newAdmin = Keypair.generate();
  const rebalancer = Keypair.generate();

  const connection = new Connection("http://localhost:8899", "confirmed");

  const adminProvider = new AnchorProvider(connection, new NodeWallet(admin), {
    commitment: "finalized",
  });

  const defaultProgram = anchor.workspace.Pie as Program<Pie>;

  connection.requestAirdrop(admin.publicKey, LAMPORTS_PER_SOL);
  connection.requestAirdrop(defaultProvider.publicKey, LAMPORTS_PER_SOL);
  connection.requestAirdrop(newAdmin.publicKey, LAMPORTS_PER_SOL);
  connection.requestAirdrop(rebalancer.publicKey, LAMPORTS_PER_SOL);
  it("is success deploy without admin change", async () => {
    const program = anchor.workspace.Pie as Program<Pie>;
    try {
      await program.methods.initialize().rpc({
        skipPreflight: true
      })
    } catch (e) {}
    await sleep(1);
    const [programStateKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("program_state")],
      program.programId
    );
    const programState = await program.account.programState.fetch(
      programStateKey
    );
    assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
  });

  describe("transfer_admin", () => {
    it("should be transfer with new admin", async () => {
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
      );
      assert.equal(
        programState.admin.toBase58(),
        newAdmin.publicKey.toBase58()
      );
      try {
        await defaultProgram.methods
          .transferAdmin(admin.publicKey)
          .accounts({
            admin: newAdmin.publicKey,
          })
          .signers([newAdmin])
          .rpc({
            commitment: "confirmed",
          });
      } catch (e) {
        console.log(e);
      }
      await sleep(1);
      programState = await defaultProgram.account.programState.fetch(
        programStateKey
      );
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
      await defaultProgram.methods
        .addRebalancer(rebalancer.publicKey)
        .accounts({
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc({
          commitment: "confirmed",
        });
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        await defaultProgram.methods
          .addRebalancer(rebalancer.publicKey)
          .accounts({
            admin: newAdmin.publicKey,
          })
          .signers([newAdmin])
          .rpc({
            commitment: "confirmed",
          });
      } catch (e) {
        console.log(e);
      }
    });
  });

  describe("delete_rebalancer", () => {
    it("should add a rebalancer", async () => {
      await sleep(1);
      await defaultProgram.methods
        .deleteRebalancer(rebalancer.publicKey)
        .accounts({
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        await defaultProgram.methods
          .deleteRebalancer(rebalancer.publicKey)
          .accounts({
            admin: newAdmin.publicKey,
          })
          .signers([newAdmin])
          .rpc({ commitment: "confirmed" });
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
        const basketMint = await createNewMint(connection, admin, 6);

        const metadataPDA = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID).toBuffer(),
            basketMint.toBuffer(),
          ],
          new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)
        )[0];

        const basketConfigPDA = PublicKey.findProgramAddressSync(
          [Buffer.from("bastket_config"), basketMint.toBuffer()],
          defaultProgram.programId
        )[0];

        const createBasketArgs: CreateBasketArgs = {
          name: "Basket Name Test",
          symbol: "BNS",
          uri: "test",
          components: basketComponents,
        };

        await defaultProgram.methods
          .createBasket(createBasketArgs)
          .accountsPartial({
            basketMint: basketMint,
            creator: admin.publicKey,
            metadataAccount: metadataPDA,
            basketConfig: basketConfigPDA,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" });

        const basketConfigData =
          await defaultProgram.account.basketConfig.fetch(basketConfigPDA);
        assert.equal(
          basketConfigData.creator.toBase58(),
          admin.publicKey.toBase58()
        );
        assert.equal(basketConfigData.mint.toBase58(), basketMint.toBase58());
        assert.equal(basketConfigData.components.length, 3);
      });

      it("should fail if the creator is unauthorized", async () => {});
    });

    describe("v2", () => {
      it("should create a basket with metadata", async () => {});

      it("should create a basket with any creator", async () => {});
    });
  });

  describe("transfer_basket", () => {
    describe("v1", () => {
      it("disabled by default", async () => {});
    });

    describe("v2", () => {
      it("should transfer a basket with new creator", async () => {});

      it("should raise error if creator not right", async () => {});
    });
  });

  describe("mint_basket", () => {
    it("should ", async () => {});

    it("should raise error if creator not right", async () => {});
  });
});
