# Pie dot fun

A decentralized index fund protocol on Solana that allows users to create, manage, and trade token baskets with dynamic rebalancing capabilities.

## Documentation

For detailed documentation, visit our [GitBook](https://pie-fun.gitbook.io/pie.fun).

## Features

- Create custom token baskets with configurable weights
- Buy and sell underlying components using Jupiter API
- Mint and redeem basket tokens
- Dynamic rebalancing of basket components
- Fee management system

## Prerequisites

- Node.js (v23 or higher)
- Rust and Cargo
- Solana CLI tools
- Anchor Framework

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ao-labs/pie-dot-fun-solana.git
cd pie-dot-fun-solana
```

2. Install dependencies:
```bash
yarn install
```

3. Create deployer wallet:
```bash
make deployer/create
```

4. Airdrop SOL to deployer (for testing):
```bash
# For local testing
make deployer/airdrop/local

# For devnet testing
make deployer/airdrop/devnet
```

## Building

Build the program:
```bash
anchor build
```

## Deployment

Deploy to different networks:
```bash
# Deploy to devnet
yarn deploy-devnet

# Deploy to mainnet
yarn deploy-mainnet
```

## Testing

Run tests on different networks:
```bash
# Run specific test suites
yarn test    # local test
yarn test-devnet   # devnet test
yarn test-mainnet   # mainnet test
```

## Project Structure

```
├── programs/           # Solana program source code
│   └── pie/
│       ├── src/
│       │   ├── instructions/  # Program instructions
│       │   ├── states/       # Program state definitions
│       │   └── utils/        # Utility functions
├── sdk/               # TypeScript SDK
├── tests/            # Test suites
└── scripts/          # Deployment and utility scripts
```

## SDK Usage

The project provides a TypeScript SDK for interacting with the protocol:

```typescript
import { PieProgram } from '@ao-labs/pie-dot-fun-solana';

// Initialize the program
const pieProgram = new PieProgram({
  connection,
  cluster: "mainnet-beta",
  jitoRpcUrl: QUICKNODE_RPC_URL,
});

// Create a new basket
const createBasketArgs = {
  name: "My Basket",
  symbol: "MBKT",
  components: [...],
  rebalancer: rebalancer.publicKey,
  rebalanceType: { dynamic: {} },
  creatorFeeBp: new BN(50),
};

// Create basket transaction
const createBasketTx = await pieProgram.creator.createBasket({
  creator: admin.publicKey,
  args: createBasketArgs,
  basketId,
});
```
