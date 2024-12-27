export interface RebalanceInfo {
  name: string;
  mint: string;
  lut?: string;
  ammId?: string;
  isBuy: boolean;
  amount: string;
}

export const rebalanceInfo: RebalanceInfo[] = [
  {
    name: "PNUT",
    mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
    ammId: "4AZRPNEfCJ7iw28rJu5aUyeQhYcvdcNm8cswyL51AY9i",
    lut: "Cb8ttCLrzkbmtgWpFb4ZT2TCFFdqLYj5NW6NHx9W8uMb",
    isBuy: false,
    amount: "400000",
  },
  {
    name: "WIF",
    mint: "21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump",
    ammId: "32vFAmd12dTHMwo9g5QuCE9sgvdv72yUfK9PMP2dtBj7",
    lut: "BwfYLPQZqwgiiu9X8sGYQuE4RjfVxAfLL7U6eJDCxGcz",
    isBuy: true,
    amount: "200000",
  },
  {
    name: "BONK",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    ammId: "HVNwzt7Pxfu76KHCMQPTLuTCLTm6WnQ1esLv4eizseSv",
    lut: "77QNhKbUZT8LHybZmkX5Erc2NUdcS5hY2h71aerazVKi",
    isBuy: false,
    amount: "400000",
  },
  {
    name: "POPCAT",
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    ammId: "FRhB8L7Y9Qq41qZXYLtC2nw8An1RJfLLxRF2x9RwLLMo",
    lut: "DHjwF28UdnhpB8fZ91CwE6dPxPKNxpG23Gzo6tqQ2iw6",
    isBuy: true,
    amount: "200000",
  },
];
