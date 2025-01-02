import { PublicKey } from "@solana/web3.js";
export interface TokenInfo {
  name: string;
  mint: string;
  lut?: string;
  ammId?: string;
}

export const tokens: TokenInfo[] = [
  {
    name: "WIF",
    mint: "21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump",
    ammId: "32vFAmd12dTHMwo9g5QuCE9sgvdv72yUfK9PMP2dtBj7",
    lut: "BcrkQ7P9bipnPUyVQxocMkV9xSCBK1ctW8qpAc7ghXjr",
  },
  // {
  //   name: "BONK",
  //   mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  //   ammId: "HVNwzt7Pxfu76KHCMQPTLuTCLTm6WnQ1esLv4eizseSv",
  //   lut: "638TGmtWuWJUXo3n3yzZD8UBj8RTFs75LSw4Tt6uscQf",
  // },
  {
    name: "PNUT",
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    ammId: "4AZRPNEfCJ7iw28rJu5aUyeQhYcvdcNm8cswyL51AY9i",
    lut: "CAT2yJoiTVnW44qtPfeToE3rDE9BhGy6zodGcPfh3XF7",
  },
  {
    name: "POPCAT",
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    ammId: "FRhB8L7Y9Qq41qZXYLtC2nw8An1RJfLLxRF2x9RwLLMo",
    lut: "8bYbhRgSZb3rLWvCK9bnupg8iSxXcZMSvKWTdN8VKUdD",
  },
  {
    name: "MEW",
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    ammId: "879F697iuDJGMevRkRcnW21fcXiAeLJK1ffsw2ATebce",
    lut: "Brrjt4vL1kmtSSSYy82jaoBC4HGXAKfFti5JKjLDBgeM",
  },
  {
    name: "GOAT",
    mint: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",
    ammId: "9Tb2ohu5P16BpBarqd3N27WnkF51Ukfs8Z1GzzLDxVZW",
    lut: "3FaEHDLuvgegqYu4wL8vNQGcTDkB2L5cEpnWrKMkPdia",
  },
  {
    name: "ACT",
    mint: "GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump",
    ammId: "B4PHSkL6CeZbxVqm1aUPQuVpc5ERFcaZj7u9dhtphmVX",
    lut: "9S9LJAtHoGZW7byoC28c6e5wmFieMNUumtrRUKAvtc3b",
  },
  {
    name: "FWOG",
    mint: "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump",
    ammId: "AB1eu2L1Jr3nfEft85AuD2zGksUbam1Kr8MR3uM2sjwt",
    lut: "4p9DAUfU98LhhPVUH1WykRs4rY865kDnL3zLRokmBwwR",
  },
  {
    name: "GIGA",
    mint: "63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9",
    ammId: "4xxM4cdb6MEsCxM52xvYqkNbzvdeWWsPDZrBcTqVGUar",
    lut: "A822z47H9bV5UUqR8rt4Za1n3AGr3NroEJHWV6v13Fcm",
  },
  {
    name: "MOODENG",
    mint: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY",
    ammId: "22WrmyTj8x2TRVQen3fxxi2r4Rn6JDHWoMTpsSmn8RUd",
    lut: "BrvFN5YZ65CmoLqAm4seQ835imW4bJrVrqVAECmzTZue",
  },
];
