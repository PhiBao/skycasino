#!/bin/bash

# 🚀 Quick Setup Script for SkyC asino Blackjack
# This script helps you set up environment variables

echo "🎰 SkyĈasino Blackjack - Environment Setup"
echo "=========================================="
echo ""

# Backend .env setup
echo "📝 Setting up backend environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please edit .env and add your values:"
    echo "   - MNEMONIC (your wallet recovery phrase)"
    echo "   - INFURA_API_KEY (get from https://infura.io)"
    echo "   - ETHERSCAN_API_KEY (optional, for verification)"
else
    echo "ℹ️  .env file already exists"
fi

echo ""

# Frontend .env setup
echo "📝 Setting up frontend environment variables..."
cd frontend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created frontend/.env file from .env.example"
    echo "⚠️  Please edit frontend/.env and add your values:"
    echo "   - VITE_CONTRACT_ADDRESS (deployed contract address)"
    echo "   - VITE_INFURA_API_KEY (your Infura API key)"
else
    echo "ℹ️  frontend/.env file already exists"
fi

cd ..

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "1. Edit .env file:              nano .env"
echo "2. Edit frontend/.env file:     nano frontend/.env"
echo "3. Install dependencies:        npm install"
echo "4. Compile contracts:           npx hardhat compile"
echo "5. Run tests:                   npx hardhat test"
echo "6. Start frontend:              cd frontend && npm run dev"
echo ""
echo "📚 For detailed instructions, see: ENV_SETUP_GUIDE.md"
echo "🎉 Happy coding!"
