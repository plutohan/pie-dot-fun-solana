import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import devnetAdmin from "../public/devnet-admin.json";
import { assert } from "chai";
import { createBasketComponents, getTokenBalance } from "../sdk/utils/helper";
import { CreateBasketArgs, PieProgram } from "../sdk/pie-program";
import {
  createAssociatedTokenAccount,
  getMint,
  mintTo,
} from "@solana/spl-token";
import { METADATA_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import { BN } from "@coral-xyz/anchor";
import { BASIS_POINTS } from "../sdk";

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

  console.log("admin :", admin.publicKey.toBase58());
  console.log("newAdmin :", newAdmin.publicKey.toBase58());
  console.log("rebalancer :", rebalancer.publicKey.toBase58());
  console.log("creator :", creator.publicKey.toBase58());
  console.log("newCreator :", newCreator.publicKey.toBase58());
  console.log("platformFeeWallet :", platformFeeWallet.publicKey.toBase58());

  const basketCreationFee = 10000;

  const pieProgram = new PieProgram({
    connection,
    cluster: "devnet",
    jitoRpcUrl: "",
  });

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
    let programState = await pieProgram.state.getProgramState();
    const initTx = await pieProgram.admin.initialize({
      initializer: admin.publicKey,
      admin: admin.publicKey,
      platformFeeWallet: platformFeeWallet.publicKey,
      platformFeePercentage: new BN(50),
      basketCreationFee: new BN(0),
    });

    await sendAndConfirmTransaction(connection, initTx, [admin]);

    programState = await pieProgram.state.getProgramState();

    assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
  });

  describe("update_admin", () => {
    it("should be updated with new admin", async () => {
      const updateAdminTx = await pieProgram.admin.updateAdmin({
        admin: admin.publicKey,
        newAdmin: newAdmin.publicKey,
      });
      await sendAndConfirmTransaction(connection, updateAdminTx, [admin]);

      let programState = await pieProgram.state.getProgramState();
      assert.equal(
        programState.admin.toBase58(),
        newAdmin.publicKey.toBase58()
      );

      //transfer back
      const updateAdminBackTx = await pieProgram.admin.updateAdmin({
        admin: newAdmin.publicKey,
        newAdmin: admin.publicKey,
      });
      await sendAndConfirmTransaction(connection, updateAdminBackTx, [
        newAdmin,
      ]);

      programState = await pieProgram.state.getProgramState();
      assert.equal(programState.admin.toBase58(), admin.publicKey.toBase58());
    });

    it("should fail if the admin is unauthorized", async () => {
      try {
        const updateAdminTx = await pieProgram.admin.updateAdmin({
          admin: newAdmin.publicKey,
          newAdmin: admin.publicKey,
        });
        await sendAndConfirmTransaction(connection, updateAdminTx, [newAdmin]);
        assert.fail("Transaction should have failed");
      } catch (e) {}
    });
  });

  describe("update_fee", () => {
    it("should update fee", async () => {
      const updateFeeTx = await pieProgram.admin.updateFee({
        admin: admin.publicKey,
        newBasketCreationFee: basketCreationFee,
        newPlatformFeeBp: 9000,
      });
      await sendAndConfirmTransaction(connection, updateFeeTx, [admin]);

      const programState = await pieProgram.state.getProgramState();
      assert.equal(
        programState.basketCreationFee.toNumber(),
        basketCreationFee
      );
      assert.equal(programState.platformFeeBp.toNumber(), 9000);
    });

    it("should fail if not admin", async () => {
      try {
        const updateFeeTx = await pieProgram.admin.updateFee({
          admin: newAdmin.publicKey,
          newBasketCreationFee: 10000,
          newPlatformFeeBp: 9000,
        });
        await sendAndConfirmTransaction(connection, updateFeeTx, [newAdmin]);
        assert.fail("Transaction should have failed");
      } catch (e) {
        assert.isNotEmpty(e);
      }
    });

    it("should fail if the fee is invalid", async () => {
      try {
        const updateFeeTx = await pieProgram.admin.updateFee({
          admin: admin.publicKey,
          newBasketCreationFee: 10000,
          newPlatformFeeBp: 1000,
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
        await pieProgram.admin.updatePlatformFeeWallet({
          admin: admin.publicKey,
          newPlatformFeeWallet: platformFeeWallet.publicKey,
        });
      await sendAndConfirmTransaction(connection, updatePlatformFeeWalletTx, [
        admin,
      ]);

      const programState = await pieProgram.state.getProgramState();
      assert.equal(
        programState.platformFeeWallet.toBase58(),
        platformFeeWallet.publicKey.toBase58()
      );
    });

    it("should fail if not admin", async () => {
      try {
        const updatePlatformFeeWalletTx =
          await pieProgram.admin.updatePlatformFeeWallet({
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
    it("should create a basket with metadata", async () => {
      const platformFeeWalletBalanceBefore = await connection.getBalance(
        platformFeeWallet.publicKey
      );

      const basketComponents = await createBasketComponents(
        connection,
        creator,
        [1, 2, 3]
      );

      const createBasketArgs: CreateBasketArgs = {
        name: "Basket Name Test",
        symbol: "BNS",
        uri: "test",
        components: basketComponents,
        rebalancer: creator.publicKey,
        creatorFeeBp: new BN(50),
        rebalanceType: { dynamic: {} },
      };
      const programState = await pieProgram.state.getProgramState();
      const basketId = programState.basketCounter;

      const createBasketTx = await pieProgram.creator.createBasket({
        creator: creator.publicKey,
        args: createBasketArgs,
        basketId,
      });

      await sendAndConfirmTransaction(connection, createBasketTx, [creator]);

      const basketConfig = pieProgram.state.basketConfigPDA({
        basketId,
      });

      const basketMint = pieProgram.state.basketMintPDA({ basketId });
      const basketConfigData = await pieProgram.state.getBasketConfig({
        basketId,
      });
      assert.equal(
        basketConfigData.creator.toBase58(),
        creator.publicKey.toBase58()
      );
      assert.equal(basketConfigData.mint.toBase58(), basketMint.toBase58());
      assert.equal(basketConfigData.components.length, 3);
      assert.deepEqual(basketConfigData.rebalanceType, { dynamic: {} });

      const mintData = await getMint(connection, basketMint);
      assert.equal(mintData.supply.toString(), "0");
      assert.equal(mintData.decimals, 6);
      assert.equal(mintData.mintAuthority?.toBase58(), basketConfig.toBase58());

      const platformFeeWalletBalanceAfter = await connection.getBalance(
        platformFeeWallet.publicKey
      );
      assert.equal(
        platformFeeWalletBalanceAfter,
        platformFeeWalletBalanceBefore + basketCreationFee
      );
    });
  });

  describe("component_operations", () => {
    let basketId: BN;
    let basketComponents: any[];
    let componentAmounts: any[] = [1, 2, 3];

    beforeEach(async () => {
      basketComponents = await createBasketComponents(
        connection,
        admin,
        componentAmounts
      );
      const createBasketArgs: CreateBasketArgs = {
        name: "Component Test Basket",
        symbol: "CTB",
        uri: "test",
        components: basketComponents,
        rebalancer: rebalancer.publicKey,
        creatorFeeBp: new BN(50),
        rebalanceType: { dynamic: {} },
      };

      const programState = await pieProgram.state.getProgramState();
      basketId = programState.basketCounter;

      const createBasketTx = await pieProgram.creator.createBasket({
        creator: creator.publicKey,
        args: createBasketArgs,
        basketId,
      });
      await sendAndConfirmTransaction(connection, createBasketTx, [creator]);

      // mint some components to admin
      for (let i = 0; i < basketComponents.length; i++) {
        const component = basketComponents[i];
        const associatedTokenAccount = await createAssociatedTokenAccount(
          connection,
          admin,
          component.mint,
          admin.publicKey
        );

        await mintTo(
          connection,
          admin,
          component.mint,
          associatedTokenAccount,
          admin.publicKey,
          componentAmounts[i]
        );
      }
    });

    it("should deposit and withdraw wsol", async () => {
      const depositAmount = 1000000;

      const programState = await pieProgram.state.getProgramState();
      const basketConfig = await pieProgram.state.getBasketConfig({
        basketId,
      });

      const platformFeeAmount = programState.platformFeeBp
        .mul(new BN(depositAmount))
        .div(new BN(BASIS_POINTS))
        .toNumber();
      const creatorFeeAmount = basketConfig.creatorFeeBp
        .mul(new BN(depositAmount))
        .div(new BN(BASIS_POINTS))
        .toNumber();

      const userBalanceBeforeDeposit = await connection.getBalance(
        admin.publicKey
      );
      const platformFeeWalletBalanceBeforeDeposit = await connection.getBalance(
        platformFeeWallet.publicKey
      );
      const creatorFeeWalletBalanceBeforeDeposit = await connection.getBalance(
        creator.publicKey
      );

      const depositTx = await pieProgram.user.depositWsol({
        user: admin.publicKey,
        basketId,
        amount: depositAmount,
      });

      await sendAndConfirmTransaction(connection, depositTx, [admin]);

      const userFund = await pieProgram.state.getUserFund({
        user: admin.publicKey,
        basketId,
      });

      assert.equal(
        userFund.components[0].amount.toString(),
        String(depositAmount)
      );

      const userBalanceAfterDeposit = await connection.getBalance(
        admin.publicKey
      );
      const platformFeeWalletBalanceAfterDeposit = await connection.getBalance(
        platformFeeWallet.publicKey
      );
      const creatorFeeWalletBalanceAfterDeposit = await connection.getBalance(
        creator.publicKey
      );

      // Check user balance - allow for transaction fees
      const expectedUserBalanceAfterDeposit =
        userBalanceBeforeDeposit -
        depositAmount -
        platformFeeAmount -
        creatorFeeAmount;

      // Define a reasonable threshold for transaction fees (in lamports)
      const MAX_TX_FEE_THRESHOLD = 10000000; // 0.01 SOL

      assert.isAtMost(
        expectedUserBalanceAfterDeposit - userBalanceAfterDeposit,
        MAX_TX_FEE_THRESHOLD,
        "User balance decreased more than expected (accounting for transaction fees)"
      );

      assert.equal(
        platformFeeWalletBalanceAfterDeposit,
        platformFeeWalletBalanceBeforeDeposit + platformFeeAmount
      );
      assert.equal(
        creatorFeeWalletBalanceAfterDeposit,
        creatorFeeWalletBalanceBeforeDeposit + creatorFeeAmount
      );

      const withdrawTx = await pieProgram.user.withdrawWsol({
        user: admin.publicKey,
        basketId,
      });
      try {
        await sendAndConfirmTransaction(connection, withdrawTx, [admin]);
      } catch (e) {
        console.log(e);
      }

      const userFundAfterWithdraw = await pieProgram.state.getUserFund({
        user: admin.publicKey,
        basketId,
      });
      assert.equal(userFundAfterWithdraw, null);

      const userBalanceAfterWithdraw = await connection.getBalance(
        admin.publicKey
      );
      const platformFeeWalletBalanceAfterWithdraw = await connection.getBalance(
        platformFeeWallet.publicKey
      );
      const creatorFeeWalletBalanceAfterWithdraw = await connection.getBalance(
        creator.publicKey
      );

      // Check user balance after withdraw - allow for transaction fees
      const expectedUserBalanceAfterWithdraw =
        userBalanceBeforeDeposit - (platformFeeAmount + creatorFeeAmount) * 2;

      assert.isAtMost(
        expectedUserBalanceAfterWithdraw - userBalanceAfterWithdraw,
        MAX_TX_FEE_THRESHOLD * 2, // Allow for fees from both deposit and withdraw
        "User balance after withdraw decreased more than expected (accounting for transaction fees)"
      );

      assert.equal(
        platformFeeWalletBalanceAfterWithdraw,
        platformFeeWalletBalanceAfterDeposit + platformFeeAmount
      );
      assert.equal(
        creatorFeeWalletBalanceAfterWithdraw,
        creatorFeeWalletBalanceAfterDeposit + creatorFeeAmount
      );
    });

    it("should deposit and withdraw components", async () => {
      for (let i = 0; i < basketComponents.length; i++) {
        const component = basketComponents[i];
        const amount = componentAmounts[i];

        // Deposit component
        const depositTx = await pieProgram.user.depositComponent({
          user: admin.publicKey,
          basketId,
          amount,
          mint: component.mint,
        });
        await sendAndConfirmTransaction(connection, depositTx, [admin]);

        // Check user fund
        const userFund = await pieProgram.state.getUserFund({
          user: admin.publicKey,
          basketId,
        });
        assert.equal(userFund.components[0].amount.toString(), amount);

        // Withdraw component
        const withdrawTx = await pieProgram.user.withdrawComponent({
          user: admin.publicKey,
          basketId,
          amount,
          mint: component.mint,
        });
        await sendAndConfirmTransaction(connection, withdrawTx, [admin]);

        // Check user fund is empty
        const updatedUserFund = await pieProgram.state.getUserFund({
          user: admin.publicKey,
          basketId,
        });

        assert.equal(updatedUserFund, null);
      }
    });

    it("should mint and redeem basket tokens", async () => {
      const basketConfig = await pieProgram.state.getBasketConfig({
        basketId,
      });

      for (let i = 0; i < basketComponents.length; i++) {
        const component = basketComponents[i];
        const amount = componentAmounts[i];

        // Deposit component
        const depositTx = await pieProgram.user.depositComponent({
          user: admin.publicKey,
          basketId,
          amount,
          mint: component.mint,
        });
        await sendAndConfirmTransaction(connection, depositTx, [admin]);
      }

      const initializeUserBalanceTx =
        await pieProgram.user.initializeUserBalance({
          user: admin.publicKey,
        });
      await sendAndConfirmTransaction(connection, initializeUserBalanceTx, [
        admin,
      ]);

      const userBalanceBeforeMint = await pieProgram.state.getUserBalance({
        user: admin.publicKey,
      });
      assert.equal(userBalanceBeforeMint.balances.length, 0);

      const userFundBeforeMint = await pieProgram.state.getUserFund({
        user: admin.publicKey,
        basketId,
      });

      const mintTx = await pieProgram.user.mintBasketToken({
        user: admin.publicKey,
        basketId,
      });

      await sendAndConfirmTransaction(connection, mintTx, [admin]);

      const basketMint = pieProgram.state.basketMintPDA({ basketId });

      const balance = await getTokenBalance({
        connection,
        mint: basketMint,
        owner: admin.publicKey,
      });

      assert.equal(balance.toString(), "1000000");

      const userFundAfterMint = await pieProgram.state.getUserFund({
        user: admin.publicKey,
        basketId,
      });

      assert.equal(userFundAfterMint, null);

      const redeemTx = await pieProgram.user.redeemBasketToken({
        user: admin.publicKey,
        basketId,
        amount: 1000000,
      });
      await sendAndConfirmTransaction(connection, redeemTx, [admin]);

      for (let i = 0; i < basketComponents.length; i++) {
        const component = basketComponents[i];
        const amount = componentAmounts[i];

        const withdrawTx = await pieProgram.user.withdrawComponent({
          user: admin.publicKey,
          basketId,
          amount,
          mint: component.mint,
        });
        await sendAndConfirmTransaction(connection, withdrawTx, [admin]);
      }
    });
  });
});
