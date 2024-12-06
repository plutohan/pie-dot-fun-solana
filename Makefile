deployer/create:
	solana-keygen new -o .config/solana/id.json

deployer/airdrop/local:
	solana config set --url localhost
	solana airdrop 5 .config/solana/id.json

deployer/airdrop/devnet:
	solana config set --url devnet
	solana airdrop 5 .config/solana/id.json

build:
	anchor build

deploy/local:
	anchor deploy --provider.cluster localnet

deploy/devnet:
	anchor deploy --provider.cluster devnet

deploy/mainnet:
	anchor deploy --provider.cluster mainnet --program-keypair ./.local/mainnet/pie-keypair.json -- --max-sign-attemps 1000

test/devnet:
	mv ./target/deploy/pie-keypair.json ./target/deploy/pie-keypair.old.json
	solana-keygen new -o ./target/deploy/pie-keypair.json --force
	anchor keys sync
	anchor build
	anchor deploy --provider.cluster devnet
	mv ./target/deploy/pie-keypair.old.json ./target/deploy/pie-keypair.json
	anchor keys sync
	anchor test --skip-deploy --provider.cluster devnet
test-validator/local:
	solana-test-validator --clone 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 --url devnet --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./tests/programs/metaplex_token_metadata_program.so --reset