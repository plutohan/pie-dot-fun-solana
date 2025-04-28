# Pie Program SDK

This SDK provides a clean, modular interface for interacting with the Pie program on Solana.

## Architecture

The SDK is structured into the following components:

### Core
- `program.ts`: Main entry point class that combines all functionality
- `types.ts`: Type definitions for accounts, events, and custom data structures

### Modules
- `pda/`: Functions for generating program-derived addresses
  - `pda.ts`: PDAs class for all address generation
- `events/`: Tools for handling program events
  - `event-parser.ts`: EventHandler class for parsing and subscribing to events
- `instructions/`: Instructions for modifying the program state
  - `admin-instructions.ts`: Admin-related instructions
  - `basket-instructions.ts`: Basket creation and management
  - `component-instructions.ts`: Component operations
  - `token-instructions.ts`: Basket token operations
  - `rebalance-instructions.ts`: Rebalancing operations
- `queries/`: Read-only queries for getting program state
  - `account-queries.ts`: Account data retrieval
  - `token-queries.ts`: Token balance queries

## Usage

```typescript
import { PieProgram } from "./sdk/pie-program";

// Initialize the SDK
const pieProgram = new PieProgram(connection, cluster, jitoRpcUrl);
await pieProgram.init();

// Query methods
const programState = await pieProgram.getProgramState();
const basketConfig = await pieProgram.getBasketConfig({ basketId: new BN(1) });
const userFund = await pieProgram.getUserFund({ user: publicKey, basketId: new BN(1) });

// Instruction methods
const tx = await pieProgram.createBasket({
  creator: publicKey,
  args: {
    components: [
      { mint: tokenMint, quantityInSysDecimal: new BN("1000000") }
    ],
    name: "My Basket",
    symbol: "MBSKT",
    uri: "https://example.com/metadata.json",
    rebalancer: rebalancerPublicKey
  },
  basketId: new BN(1)
});

// Send the transaction
await sendAndConfirmTransaction(connection, tx, [signer]);

// Listen to events
pieProgram.events.onCreateBasket(connection, (event) => {
  console.log("New basket created:", event);
});
```

## Benefits of this structure

1. **Modularity**: Each part of the SDK is in its own file, making it easier to maintain
2. **Unified API**: The main `PieProgram` class provides a single entry point
3. **Type Safety**: All types are defined in a centralized location
4. **Separation of Concerns**: Instructions, queries, and events are separated
5. **Better Documentation**: Each method is documented with JSDoc comments
