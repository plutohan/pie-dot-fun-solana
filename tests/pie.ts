import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import { assert } from "chai";
import { createBasketComponents } from "../sdk/utils/helper";
import { CreateBasketArgs, PieProgram } from "../sdk/pie-program";
import { getMint } from "@solana/spl-token";
import { METADATA_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import { BN } from "@coral-xyz/anchor";

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
  const creator = Keypair.generate();
  const newCreator = Keypair.generate();
  const platformFeeWallet = Keypair.generate();

  const pieProgram = new PieProgram(connection, "devnet");

  it("is success deploy without admin change", async () => {
    await Promise.all([
      connection.requestAirdrop(admin.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(defaultProvider.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(newAdmin.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(rebalancer.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(platformFeeWallet.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(creator.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(newCreator.publicKey, LAMPORTS_PER_SOL),
    ]);
    await sleep(1);
    let programState = await pieProgram.getProgramState();
    const initTx = await pieProgram.initialize({
      initializer: admin.publicKey,
      admin: admin.publicKey,
      creator: creator.publicKey,
      platformFeeWallet: admin.publicKey,
      platformFeePercentage: new BN(100),
    });

    await sendAndConfirmTransaction(connection, initTx, [admin]);

    programState = await pieProgram.getProgramState();

    assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
  });

  describe("transfer_admin", () => {
    it("should be transfer with new admin", async () => {
      const transferTx = await pieProgram.transferAdmin({
        admin: admin.publicKey,
        newAdmin: newAdmin.publicKey,
      });
      await sendAndConfirmTransaction(connection, transferTx, [admin]);

      let programState = await pieProgram.getProgramState();
      assert.equal(
        programState.admin.toBase58(),
        newAdmin.publicKey.toBase58()
      );

      //transfer back
      const transferBackTx = await pieProgram.transferAdmin({
        admin: newAdmin.publicKey,
        newAdmin: admin.publicKey,
      });
      await sendAndConfirmTransaction(connection, transferBackTx, [newAdmin]);

      programState = await pieProgram.getProgramState();
      assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        const transferTx = await pieProgram.transferAdmin({
          admin: newAdmin.publicKey,
          newAdmin: admin.publicKey,
        });
        await sendAndConfirmTransaction(connection, transferTx, [newAdmin]);
        assert.fail("Transaction should have failed");
      } catch (e) {}
    });
  });

  describe("update_fee", () => {
    it("should update fee", async () => {
      const updateFeeTx = await pieProgram.updateFee({
        admin: admin.publicKey,
        newCreatorFeePercentage: 1000,
        newPlatformFeePercentage: 9000,
      });
      await sendAndConfirmTransaction(connection, updateFeeTx, [admin]);

      const programState = await pieProgram.getProgramState();
      assert.equal(programState.creatorFeePercentage.toNumber(), 1000);
      assert.equal(programState.platformFeePercentage.toNumber(), 9000);
    });

    it("should fail if not admin", async () => {
      try {
        const updateFeeTx = await pieProgram.updateFee({
          admin: newAdmin.publicKey,
          newCreatorFeePercentage: 1000,
          newPlatformFeePercentage: 1000,
        });
        await sendAndConfirmTransaction(connection, updateFeeTx, [newAdmin]);
        assert.fail("Transaction should have failed");
      } catch (e) {
        assert.isNotEmpty(e);
      }
    });

    it("should fail if the fee is invalid", async () => {
      try {
        const updateFeeTx = await pieProgram.updateFee({
          admin: admin.publicKey,
          newCreatorFeePercentage: (1000 * 10 ** 10) ^ 4,
          newPlatformFeePercentage: 1000,
        });
        await sendAndConfirmTransaction(connection, updateFeeTx, [admin]);
        assert.fail("Transaction should have failed");
      } catch (e) {
        assert.isNotEmpty(e);
      }
    });
  });

  describe("update_platform_fee_wallet", () => {
    it("should update platform fee wallet", async () => {
      const updatePlatformFeeWalletTx =
        await pieProgram.updatePlatformFeeWallet({
          admin: admin.publicKey,
          newPlatformFeeWallet: platformFeeWallet.publicKey,
        });
      await sendAndConfirmTransaction(connection, updatePlatformFeeWalletTx, [
        admin,
      ]);

      const programState = await pieProgram.getProgramState();
      assert.equal(
        programState.platformFeeWallet.toBase58(),
        platformFeeWallet.publicKey.toBase58()
      );
    });

    it("should fail if not admin", async () => {
      try {
        const updatePlatformFeeWalletTx =
          await pieProgram.updatePlatformFeeWallet({
            admin: newAdmin.publicKey,
            newPlatformFeeWallet: platformFeeWallet.publicKey,
          });
        await sendAndConfirmTransaction(connection, updatePlatformFeeWalletTx, [
          newAdmin,
        ]);
        assert.fail("Transaction should have failed");
      } catch (e) {
        assert.isNotEmpty(e);
      }
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
          rebalancer: admin.publicKey,
        };
        const programState = await pieProgram.getProgramState();
        const basketId = programState.basketCounter;

        const createBasketTx = await pieProgram.createBasket({
          creator: creator.publicKey,
          args: createBasketArgs,
          basketId,
        });

        await sendAndConfirmTransaction(connection, createBasketTx, [creator]);

        const basketConfig = pieProgram.basketConfigPDA({ basketId });

        const basketMint = pieProgram.basketMintPDA({ basketId });
        const basketConfigData = await pieProgram.getBasketConfig({ basketId });
        assert.equal(
          basketConfigData.creator.toBase58(),
          creator.publicKey.toBase58()
        );
        assert.equal(basketConfigData.mint.toBase58(), basketMint.toBase58());
        assert.equal(basketConfigData.components.length, 3);

        const mintData = await getMint(connection, basketMint);
        assert.equal(mintData.supply.toString(), "0");
        assert.equal(mintData.decimals, 6);
        assert.equal(
          mintData.mintAuthority?.toBase58(),
          basketConfig.toBase58()
        );
      });

      it("should fail if the creator is unauthorized", async () => {
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
          rebalancer: admin.publicKey,
        };
        const programState = await pieProgram.getProgramState();
        const basketId = programState.basketCounter;

        const createBasketTx = await pieProgram.createBasket({
          creator: newCreator.publicKey,
          args: createBasketArgs,
          basketId,
        });
        try {
          await sendAndConfirmTransaction(connection, createBasketTx, [
            newCreator,
          ]);
          assert.fail("Transaction should have failed");
        } catch (e) {
          assert.isNotEmpty(e);
        }
      });

      it("should success when the new creator is authorized", async () => {
        const updateWhitelistedCreatorTx =
          await pieProgram.updateWhitelistedCreators({
            admin: admin.publicKey,
            newWhitelistedCreators: [creator.publicKey, newCreator.publicKey],
          });

        await sendAndConfirmTransaction(
          connection,
          updateWhitelistedCreatorTx,
          [admin]
        );

        const programState = await pieProgram.getProgramState();
        assert.equal(programState.whitelistedCreators.length, 2);
        assert.equal(
          programState.whitelistedCreators[0].toBase58(),
          creator.publicKey.toBase58()
        );
        assert.equal(
          programState.whitelistedCreators[1].toBase58(),
          newCreator.publicKey.toBase58()
        );

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
          rebalancer: admin.publicKey,
        };

        const createBasketTx = await pieProgram.createBasket({
          creator: newCreator.publicKey,
          args: createBasketArgs,
          basketId: programState.basketCounter,
        });

        await sendAndConfirmTransaction(connection, createBasketTx, [
          newCreator,
        ]);
      });
    });
  });

  describe("update_rebalancer", () => {
    it("should update with new balancer in basket config state", async () => {
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
        rebalancer: admin.publicKey,
      };
      const programState = await pieProgram.getProgramState();
      const basketId = programState.basketCounter;
      const createBasketTx = await pieProgram.createBasket({
        creator: creator.publicKey,
        args: createBasketArgs,
        basketId,
      });
      await sendAndConfirmTransaction(connection, createBasketTx, [creator]);
      const basketState = await pieProgram.getBasketConfig({ basketId });
      console.assert(
        basketState.rebalancer.toBase58(),
        admin.publicKey.toBase58()
      );

      const updateRebalancerTx = await pieProgram.updateRebalancer({
        creator: creator.publicKey,
        basketId,
        newRebalancer: rebalancer.publicKey,
      });
      await sendAndConfirmTransaction(connection, updateRebalancerTx, [
        creator,
      ]);
      console.assert(
        basketState.rebalancer.toBase58(),
        rebalancer.publicKey.toBase58()
      );
    });

    it("should fail if unauthorized", async () => {});
  });
});
