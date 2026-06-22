#!/bin/bash
set -e

cd "$(dirname "$0")/contracts"
source ../.env

CHAIN=${1:-0g}

if [ "$CHAIN" = "celo" ]; then
  echo "=== Deploying to Celo Mainnet ==="
  echo "RPC: https://forno.celo.org"
  echo "Chain ID: 42220"
  RPC_URL="https://forno.celo.org"
  PROFILE="celo"
  SCRIPT="script/DeployCelo.s.sol:DeployCelo"
else
  echo "=== Deploying to 0G Mainnet ==="
  echo "RPC: https://evmrpc.0g.ai"
  echo "Chain ID: 16661"
  RPC_URL="https://evmrpc.0g.ai"
  PROFILE="default"
  SCRIPT="script/Deploy.s.sol:Deploy"
fi

echo ""
BALANCE=$(cast balance $(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY) --rpc-url $RPC_URL --ether)
echo "Wallet balance: $BALANCE"
echo ""

echo "Deploying contracts..."
FOUNDRY_PROFILE=$PROFILE forge script $SCRIPT \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  -vvv 2>&1 | tee /tmp/deploy-output.txt

echo ""
echo "=== Deployment complete ==="
echo "Check /tmp/deploy-output.txt for contract addresses"
