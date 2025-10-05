#!/bin/bash

# Sepolia Deployment Helper Script
# This script helps you deploy the Blackjack game to Sepolia testnet

set -e

echo "🎰 Blackjack Sepolia Deployment Helper"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if environment variables are set
echo "📋 Step 1: Checking environment variables..."
if npx hardhat vars list 2>&1 | grep -q "MNEMONIC"; then
    echo -e "${GREEN}✓ MNEMONIC is set${NC}"
else
    echo -e "${YELLOW}⚠ MNEMONIC not set!${NC}"
    echo ""
    echo "To set your mnemonic (12-24 word recovery phrase):"
    echo "  npx hardhat vars set MNEMONIC"
    echo ""
    echo "Get it from: MetaMask → Settings → Security & Privacy → Reveal Secret Recovery Phrase"
    echo ""
    exit 1
fi

if npx hardhat vars list 2>&1 | grep -q "INFURA_API_KEY"; then
    echo -e "${GREEN}✓ INFURA_API_KEY is set${NC}"
else
    echo -e "${YELLOW}⚠ INFURA_API_KEY not set!${NC}"
    echo ""
    echo "To set your Infura API key:"
    echo "  npx hardhat vars set INFURA_API_KEY"
    echo ""
    echo "Get one free at: https://infura.io"
    echo ""
    exit 1
fi

echo ""
echo "📍 Step 2: Checking Sepolia ETH balance..."
echo ""
echo "Before deploying, make sure you have Sepolia ETH!"
echo ""
echo "Get free Sepolia ETH from:"
echo "  • https://sepoliafaucet.com (Recommended - 0.5 ETH)"
echo "  • https://www.infura.io/faucet/sepolia"
echo "  • https://faucet.quicknode.com/ethereum/sepolia"
echo ""
read -p "Do you have Sepolia ETH? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please get Sepolia ETH first, then run this script again!"
    exit 1
fi

echo ""
echo "🚀 Step 3: Deploying to Sepolia..."
echo ""
echo "This will:"
echo "  1. Deploy FHEBlackjack contract"
echo "  2. Fund it with initial bankroll (if you have enough ETH)"
echo "  3. Display the contract address"
echo ""
read -p "Ready to deploy? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Deploying..."
echo ""

# Deploy
npx hardhat deploy --network sepolia --tags FHEBlackjack

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Copy the contract address from above"
echo "2. Update frontend/src/config.ts with:"
echo "   - CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS'"
echo "   - chainId: 11155111"
echo "   - chainName: 'Sepolia'"
echo ""
echo "3. In MetaMask, switch to Sepolia network"
echo "4. Run: cd frontend && npm run dev"
echo "5. Play at http://localhost:5173"
echo ""
echo "🎉 Have fun! 🎰♠️♥️♣️♦️"
