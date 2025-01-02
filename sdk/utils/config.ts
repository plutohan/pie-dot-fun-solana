import { Cluster, Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";

let raydium: Raydium | undefined;
export const initSdk = async (connection: any, cluster: Cluster) => {
  if (raydium) return raydium;
  raydium = await Raydium.load({
    connection,
    cluster,
    disableFeatureCheck: true,
    blockhashCommitment: "finalized",
  });

  return raydium;
};
