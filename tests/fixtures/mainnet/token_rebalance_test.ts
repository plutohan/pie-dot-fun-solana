import { RebalanceInfo } from "../../../sdk/types";

export const rebalanceInfo: RebalanceInfo[] = [
  {
    name: "AI16Z/SOL",
    inputMint: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
    outputMint: "So11111111111111111111111111111111111111112",
    poolId: "Cjjn3aeRJZJY87r2Q9MYbuz3XAG8j4tDHC8FmMayKTa5",
    lut: "CsMB14knX2J2ywv7s2n9AawG4LnQyTT5i3qKRkrbEDSV",
    type: "cpmm",
    isSwapBaseOut: false,
    amount: "500000",
  },
  {
    name: "WIF/SOL",
    inputMint: "21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump",
    outputMint: "So11111111111111111111111111111111111111112",
    poolId: "32vFAmd12dTHMwo9g5QuCE9sgvdv72yUfK9PMP2dtBj7",
    lut: "B5DWbGrAfwpe6mb6CAXE9jwFaxAqcu7JPTBUNEDdkuMy",
    type: "amm",
    isSwapBaseOut: false,
    amount: "500000",
  },
  {
    name: "PENGU/SOL",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    poolId: "B4Vwozy1FGtp8SELXSXydWSzavPUGnJ77DURV2k4MhUV",
    lut: "GF4vgE7en4W9sfuv5ne8bXWer6tx3vrJxV3kUUPxZctm",
    type: "clmm",
    isSwapBaseOut: true,
    amount: "100000",
  },
  {
    name: "POPCAT/SOL",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    poolId: "FRhB8L7Y9Qq41qZXYLtC2nw8An1RJfLLxRF2x9RwLLMo",
    lut: "dwRAeGZxQnS5ZfCsas3gtcVXLCgFVfk82nbxhPXvofz",
    type: "amm",
    isSwapBaseOut: true,
    amount: "100000",
  },
];
