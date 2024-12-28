import * as anchor from "@coral-xyz/anchor";
import { Pie } from "../target/types/pie";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import { assert } from "chai";
import { createBasketComponents } from "./utils/helper";
import { PieProgram } from "../sdk/pie-program";
import { getMint } from "@solana/spl-token";

export type BasketComponent = anchor.IdlTypes<Pie>["basketComponent"];
export type CreateBasketArgs = anchor.IdlTypes<Pie>["createBasketArgs"];

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
  const platformFeeWallet = Keypair.generate();

  const pieProgram = new PieProgram(connection);

  it("is success deploy without admin change", async () => {
    await Promise.all([
      connection.requestAirdrop(admin.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(defaultProvider.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(newAdmin.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(rebalancer.publicKey, LAMPORTS_PER_SOL),
      connection.requestAirdrop(platformFeeWallet.publicKey, LAMPORTS_PER_SOL),
    ]);
    await sleep(1);

    const initTx = await pieProgram.initialize(admin.publicKey);

    await sendAndConfirmTransaction(connection, initTx, [admin]);

    const programState = await pieProgram.getProgramState();

    assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
  });

  describe("transfer_admin", () => {
    it("should be transfer with new admin", async () => {
      const transferTx = await pieProgram.transferAdmin(
        admin.publicKey,
        newAdmin.publicKey
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
        const transferTx = await pieProgram.transferAdmin(
          newAdmin.publicKey,
          admin.publicKey
        );
        await sendAndConfirmTransaction(connection, transferTx, [newAdmin]);
      } catch (e) {}
    });
  });

  describe("update_fee", () => {
    it("should update fee", async () => {
      const updateFeeTx = await pieProgram.updateFee(
        admin.publicKey,
        1000,
        9000
      );
      await sendAndConfirmTransaction(connection, updateFeeTx, [admin]);

      const programState = await pieProgram.getProgramState();
      assert.equal(programState.creatorFeePercentage.toNumber(), 1000);
      assert.equal(programState.platformFeePercentage.toNumber(), 9000);
    });

    it("should fail if not admin", async () => {
      try {
        const updateFeeTx = await pieProgram.updateFee(
          newAdmin.publicKey,
          1000,
          1000
        );
        await sendAndConfirmTransaction(connection, updateFeeTx, [newAdmin]);
      } catch (e) {
        assert.isNotEmpty(e)
      }
    });

    it("should fail if the fee is invalid", async () => {
      try {
        const updateFeeTx = await pieProgram.updateFee(
          admin.publicKey,
          1000*10**10^4,
          1000
        );
        await sendAndConfirmTransaction(connection, updateFeeTx, [admin]);
      } catch (e) {
        assert.isNotEmpty(e)
      }
    });
  });

  describe("update_platform_fee_wallet", () => {
    it("should update platform fee wallet", async () => {
      const updatePlatformFeeWalletTx =
        await pieProgram.updatePlatformFeeWallet(
          admin.publicKey,
          platformFeeWallet.publicKey
        );
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
          await pieProgram.updatePlatformFeeWallet(
            newAdmin.publicKey,
            platformFeeWallet.publicKey
          );
        await sendAndConfirmTransaction(connection, updatePlatformFeeWalletTx, [
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
          decimals: 6,
          rebalancer: admin.publicKey,
        };
        const programState = await pieProgram.getProgramState();
        const basketId = programState.basketCounter;
        const createBasketTx = await pieProgram.createBasket(
          admin.publicKey,
          createBasketArgs,
          basketId
        );

        await sendAndConfirmTransaction(connection, createBasketTx, [admin]);

        const basketConfig = pieProgram.basketConfigPDA(basketId);

        const basketMint = pieProgram.basketMintPDA(basketId);
        const basketConfigData = await pieProgram.getBasketConfig(basketId);
        assert.equal(
          basketConfigData.creator.toBase58(),
          admin.publicKey.toBase58()
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
          decimals: 6,
          rebalancer: admin.publicKey,
        };
        const programState = await pieProgram.getProgramState();
        const basketId = programState.basketCounter;
        const createBasketTx = await pieProgram.createBasket(
          admin.publicKey,
          createBasketArgs,
          basketId
        );
        await sendAndConfirmTransaction(connection, createBasketTx, [admin]);
      });

      it("should fail if the creator is unauthorized", async () => {});
    });

    describe("v2", () => {
      it("should create a basket with metadata", async () => {});

      it("should create a basket with any creator", async () => {});
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
        decimals: 6,
        rebalancer: admin.publicKey,
      };
      const programState = await pieProgram.getProgramState();
      const basketId = programState.basketCounter;
      const createBasketTx = await pieProgram.createBasket(
        admin.publicKey,
        createBasketArgs,
        basketId
      );
      await sendAndConfirmTransaction(connection, createBasketTx, [admin]);
      const basketState = await pieProgram.getBasketConfig(basketId);
      console.assert(
        basketState.rebalancer.toBase58(),
        admin.publicKey.toBase58()
      );

      const updateRebalancerTx = await pieProgram.updateRebalancer(
        admin.publicKey,
        basketId,
        rebalancer.publicKey
      );
      await sendAndConfirmTransaction(connection, updateRebalancerTx, [admin]);
      console.assert(
        basketState.rebalancer.toBase58(),
        rebalancer.publicKey.toBase58()
      );
    });

    it("should fail if unauthorized", async () => {});
  });
});
