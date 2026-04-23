#!/bin/bash
set -e

cd /Users/admin/.pg/0GENT/contracts
source ../.env

echo "=== Deploying to 0G Galileo Testnet ==="
echo "RPC: https://evmrpc-testnet.0g.ai"
echo "Chain ID: 16602"
echo ""

# Check balance
BALANCE=$(cast balance $( cast wallet address --private-key $DEPLOYER_PRIVATE_KEY ) --rpc-url https://evmrpc-testnet.0g.ai --ether)
echo "Wallet balance: $BALANCE 0G"
echo ""

# Deploy
echo "Deploying contracts..."
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  -vvv 2>&1 | tee /tmp/deploy-output.txt

echo ""
echo "=== Deployment complete ==="
echo "Check /tmp/deploy-output.txt for contract addresses"
echo "Update .env with the addresses, then run the backend"
