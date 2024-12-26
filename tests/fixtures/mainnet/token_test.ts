import { PublicKey } from "@solana/web3.js";
export interface TokenInfo {
  name: string;
  mint: string;
  lut?: string;
  ammId?: string;
}

export const lookupTable = new PublicKey(
  "5tFQWULzBGjX6x1Kc6TA2Rq8KMg9oLK5yn4fcB4B5yF9"
);

export const tokens: TokenInfo[] = [
  {
    name: "WIF",
    mint: "21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump",
    ammId: "32vFAmd12dTHMwo9g5QuCE9sgvdv72yUfK9PMP2dtBj7",
    lut: "BwfYLPQZqwgiiu9X8sGYQuE4RjfVxAfLL7U6eJDCxGcz",
  },
  {
    name: "BONK",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    ammId: "HVNwzt7Pxfu76KHCMQPTLuTCLTm6WnQ1esLv4eizseSv",
    lut: "77QNhKbUZT8LHybZmkX5Erc2NUdcS5hY2h71aerazVKi",
  },
  {
    name: "PNUT",
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    ammId: "4AZRPNEfCJ7iw28rJu5aUyeQhYcvdcNm8cswyL51AY9i",
    lut: "Cb8ttCLrzkbmtgWpFb4ZT2TCFFdqLYj5NW6NHx9W8uMb",
  },
  {
    name: "POPCAT",
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    ammId: "FRhB8L7Y9Qq41qZXYLtC2nw8An1RJfLLxRF2x9RwLLMo",
    lut: "DHjwF28UdnhpB8fZ91CwE6dPxPKNxpG23Gzo6tqQ2iw6",
  },
  {
    name: "MEW",
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    ammId: "879F697iuDJGMevRkRcnW21fcXiAeLJK1ffsw2ATebce",
    lut: "81LC8axjFiGyMrK1TcRzFSKL5pXUWhpeEYX5A9Vb4B8V",
  },
  {
    name: "GOAT",
    mint: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",
    ammId: "9Tb2ohu5P16BpBarqd3N27WnkF51Ukfs8Z1GzzLDxVZW",
    lut: "3tBghGgzMdnk1e9vrkjS1qHV9yyNGawvLWc7Hhh3rYnS",
  },
  {
    name: "ACT",
    mint: "GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump",
    ammId: "B4PHSkL6CeZbxVqm1aUPQuVpc5ERFcaZj7u9dhtphmVX",
    lut: "86XNekJZg1PYFyBFZ6ExmqaSTw3x2qECrZepJjXZGvmK",
  },
  {
    name: "FWOG",
    mint: "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump",
    ammId: "AB1eu2L1Jr3nfEft85AuD2zGksUbam1Kr8MR3uM2sjwt",
    lut: "7u4ZydyS9aGDrmArLX9zoYqKd1CFEqrh196r5Xt8yCmm",
  },
  {
    name: "GIGA",
    mint: "63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9",
    ammId: "4xxM4cdb6MEsCxM52xvYqkNbzvdeWWsPDZrBcTqVGUar",
    lut: "EQQJd19q4QLTt4EEWJe9Fm13dprjAfzee3dWg8zLWvic",
  },
  {
    name: "MOODENG",
    mint: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY",
    ammId: "22WrmyTj8x2TRVQen3fxxi2r4Rn6JDHWoMTpsSmn8RUd",
    lut: "Bosa2psZFLGaKkxpP5FVg3ZZYKCBYDrANNRARYs6iH35",
  },
];
