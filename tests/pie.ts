import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pie } from "../target/types/pie";

describe("pie", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Pie as Program<Pie>;

  it("is success deploy without admin change", async () => {

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
});
