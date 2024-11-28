## Pie dot fun
A meme index fund protocol on Solana

## Installation and running guide

## Requirements

Create a new deployer wallet via below command:
```
deployer/create
deployer/airdrop/local
deployer/airdrop/devnet
```

### How to build
Please ensure that you create deployer's wallet before deploy it
```
make build
```

### How to deploy
Please ensure that you build program before deploy it
```
make deploy/[devnet|mainnet]
```

### How to test
We will redeploy the new program each time the test happen.
Please ensure that your deployer's wallet always have enough SOL for tx fees.
```
make test/devnet
```