# 🎰 SkyCasino - FHEVM Blackjack

A fully functional, provably fair blackjack game built on Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine).
Experience the future of online gambling with encrypted, trustless gameplay on Ethereum's Sepolia testnet.

![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue)
![Solidity](https://img.shields.io/badge/solidity-0.8.24-blue)
![Hardhat](https://img.shields.io/badge/hardhat-2.26.0-yellow) ![React](https://img.shields.io/badge/react-19-blue)

## 🌟 Features

- **🔐 Provably Fair Gaming**: Dealer's hole card encrypted using FHEVM
- **🎮 Complete Blackjack**: Hit, Stand, Bust mechanics with automatic dealer AI
- **💰 Real ETH Betting**: Wager Sepolia ETH with automatic payouts (2x on win)
- **🎨 Beautiful UI**: Casino-style interface with animated card dealing
- **🔗 MetaMask Integration**: Automatic network detection and switching
- **✅ Fully Tested**: 26 passing tests covering all game scenarios
- **📱 Responsive Design**: Works on desktop and mobile

## 🎯 Live Demo

**Contract Address (Sepolia):** `0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1`

**Etherscan:** [View Contract](https://sepolia.etherscan.io/address/0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1)

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **MetaMask** browser extension
- **Sepolia ETH** (get from [Alchemy Faucet](https://sepoliafaucet.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/PhiBao/skycasino.git
cd skycasino

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Set up environment variables
cp .env.example .env
cp frontend/.env.example frontend/.env

# Edit .env files with your values
nano .env              # Add MNEMONIC and INFURA_API_KEY
nano frontend/.env     # Add VITE_INFURA_API_KEY
```

### Run Locally

```bash
# Compile contracts
npx hardhat compile

# Run tests (optional)
npx hardhat test

# Start frontend
cd frontend
npm run dev
# Open http://localhost:5173/
```

## 🎮 How to Play

1. **Connect Wallet** - Click "Connect Wallet" and approve MetaMask
2. **Place Bet** - Enter bet amount (e.g., 0.01 ETH) and click "Start Game"
3. **Play Your Hand**
   - **Hit**: Draw another card
   - **Stand**: Keep your current hand, dealer plays automatically
4. **Win Conditions**
   - Get closer to 21 than dealer without going over
   - Bust if you go over 21
   - Win pays 2x your bet
   - Push (tie) returns your bet

## 🏗️ Architecture

### Smart Contract

**File:** `contracts/FHEBlackjack.sol`

Key Features:

- Encrypted dealer hole card using FHEVM
- Automatic dealer AI (draws until 17+)
- Secure betting with automatic payouts
- Event-driven architecture for frontend integration

**Stats:**

- 260 lines of Solidity
- 26 passing tests
- Full scenario coverage

### Frontend

**Files:**

- `frontend/src/Blackjack.tsx` - Main game component (460+ lines)
- `frontend/src/Blackjack.css` - Casino-style styling
- `frontend/src/config.ts` - Network configuration

**Stack:** React 19 + TypeScript + Vite + ethers.js v6

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Expected output:
# ✓ 26 passing tests
# ✓ Game Start (5 tests)
# ✓ Hit Action (7 tests)
# ✓ Stand Action (6 tests)
# ✓ Game End (4 tests)
# ✓ View Functions (4 tests)
```

## 🔐 Security

- **Environment Variables**: All sensitive data stored in `.env` files
- **Git Ignored**: `.env` files never committed to repository
- **Encrypted State**: Dealer's hole card hidden using FHEVM until game ends
- **Secure Payouts**: Automatic, trustless ETH transfers

## 📚 Environment Setup

### Backend (`.env`)

```env
MNEMONIC="your twelve word recovery phrase"
INFURA_API_KEY="your-infura-api-key"
ETHERSCAN_API_KEY="optional-for-verification"
```

### Frontend (`frontend/.env`)

```env
VITE_CONTRACT_ADDRESS="0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1"
VITE_INFURA_API_KEY="your-infura-api-key"
VITE_CHAIN_ID="11155111"
VITE_CHAIN_NAME="Sepolia"
```

## 🚢 Deployment

### Deploy to Sepolia

```bash
# Set up environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy contract
npx hardhat deploy --network sepolia --tags FHEBlackjack --reset

# Update frontend/.env with the new contract address
```

### Deploy Frontend to Vercel

See [DEPLOY_TO_VERCEL.md](DEPLOY_TO_VERCEL.md) for step-by-step instructions.

### Verify Contract (Optional)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 🎲 Game Mechanics

### Card Values

- **Number cards (2-10)**: Face value
- **Face cards (J, Q, K)**: 10 points
- **Ace (A)**: 11 or 1 (whichever is better)

### Dealer Rules

- Dealer draws until reaching 17 or higher
- Dealer stands on 17+
- Dealer must draw on 16 or less

### Payouts

- **Win**: 2x your bet
- **Push (tie)**: Bet returned
- **Lose**: Bet goes to house

## 🛠️ Technology Stack

### Smart Contracts

- **Solidity** 0.8.24
- **FHEVM** by Zama (Fully Homomorphic Encryption)
- **Hardhat** 2.26.0
- **TypeChain** for type-safe contract interactions

### Frontend

- **React** 19
- **TypeScript** 5.8.3
- **Vite** 7.1.9
- **ethers.js** 6.15.0
- **CSS3** with animations

### Network

- **Sepolia Testnet** (Chain ID: 11155111)
- **Infura** RPC provider
- **MetaMask** wallet integration

## 📁 Project Structure

```
skycasino/
├── contracts/
│   ├── FHEBlackjack.sol      # Main game contract
│   └── FHECounter.sol         # Example counter
├── deploy/
│   └── deployBlackjack.ts     # Deployment script
├── tasks/
│   └── FHEBlackjack.ts        # CLI interaction tasks
├── test/
│   └── FHEBlackjack.ts        # 26 comprehensive tests
├── frontend/
│   ├── src/
│   │   ├── Blackjack.tsx      # Main game UI
│   │   ├── Blackjack.css      # Casino styling
│   │   └── config.ts          # Network config
│   └── .env                   # Frontend env vars
├── .env                       # Backend env vars
├── hardhat.config.ts          # Hardhat configuration
└── README.md                  # This file
```

## 📊 Project Statistics

- **Smart Contract**: 260 lines
- **Frontend**: 460+ lines (React/TypeScript)
- **Tests**: 297 lines (26 passing tests)
- **Documentation**: 3 comprehensive guides
- **Total Code**: ~2000+ lines

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

BSD-3-Clause-Clear License - see [LICENSE](LICENSE) file

## 🏆 Zama Developer Program

This project is submitted to the Zama Developer Program:

- **Track**: Builder Track
- **Score**: 87/100 (see [ZAMA_SUBMISSION_EVALUATION.md](ZAMA_SUBMISSION_EVALUATION.md))
- **Highlights**: Complete dApp with smart contract, frontend, tests, and documentation

## 🔗 Links

- **GitHub**: https://github.com/PhiBao/skycasino
- **Zama FHEVM**: https://docs.zama.ai/fhevm
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Get Sepolia ETH**: https://sepoliafaucet.com
- **Quick Start Guide**: [QUICK_START.md](QUICK_START.md)

## 🙏 Acknowledgments

- **Zama** for FHEVM technology
- **Hardhat** for development framework
- **React** team for frontend framework
- **ethers.js** for Ethereum interaction

## 📧 Contact

- **GitHub**: [@PhiBao](https://github.com/PhiBao)
- **Project**: [skycasino](https://github.com/PhiBao/skycasino)

---

**Built with ❤️ using Zama's FHEVM | Provably Fair Gaming on Blockchain** 🎰
