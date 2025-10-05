# 🎰 SkyCasino - FHEVM Blackjack from FHEVM Hardhat Template

A fully functional, provably fair blackjack game built on Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine).
Experience the future of online gambling with encrypted, trustless gameplay on Ethereum's Sepolia testnet.A
Hardhat-based template for developing Fully Homomorphic Encryption (FHE) enabled Solidity smart contracts using the

FHEVM protocol by Zama.

![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue)

![Solidity](https://img.shields.io/badge/solidity-0.8.24-blue)## Quick Start

![Hardhat](https://img.shields.io/badge/hardhat-2.26.0-yellow)

![React](https://img.shields.io/badge/react-18-blue)For detailed instructions see:

[FHEVM Hardhat Quick Start Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial)

## 🌟 Features

### Prerequisites

- **🔐 Provably Fair Gaming**: Dealer's hole card encrypted using FHEVM

- **🎮 Complete Blackjack**: Hit, Stand, Bust mechanics with automatic dealer AI- **Node.js**: Version 20 or higher

- **💰 Real ETH Betting**: Wager Sepolia ETH with automatic payouts (2x on win)- **npm or yarn/pnpm**: Package manager

- **🎨 Beautiful UI**: Casino-style interface with animated card dealing

- **🔗 MetaMask Integration**: Automatic network detection and switching### Installation

- **✅ Fully Tested**: 26 passing tests covering all game scenarios

- **📱 Responsive Design**: Works on desktop and mobile1. **Install dependencies**

## 🎯 Live Demo ```bash

npm install

**Contract Address (Sepolia):** `0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1` ```

## 🚀 Quick Start2. **Set up environment variables**

### Prerequisites ```bash

npx hardhat vars set MNEMONIC

- **Node.js** v20 or higher

- **MetaMask** browser extension # Set your Infura API key for network access

- **Sepolia ETH** (get from [Alchemy Faucet](https://sepoliafaucet.com) or
  [Infura Faucet](https://infura.io/faucet/sepolia)) npx hardhat vars set INFURA_API_KEY

### Installation # Optional: Set Etherscan API key for contract verification

npx hardhat vars set ETHERSCAN_API_KEY

`bash   `

# Clone the repository

git clone https://github.com/PhiBao/skycasino.git3. **Compile and test**

cd skycasino

````bash

# Install dependencies   npm run compile

npm install   npm run test

cd frontend && npm install && cd ..   ```



# Set up environment variables4. **Deploy to local network**

cp .env.example .env

cp frontend/.env.example frontend/.env   ```bash

# Start a local FHEVM-ready node

# Edit .env files with your values   npx hardhat node

nano .env              # Add MNEMONIC and INFURA_API_KEY   # Deploy to local network

nano frontend/.env     # Add VITE_INFURA_API_KEY   npx hardhat deploy --network localhost

```   ```



### Run Locally5. **Deploy to Sepolia Testnet**



```bash   ```bash

# Compile contracts   # Deploy to Sepolia

npx hardhat compile   npx hardhat deploy --network sepolia

# Verify contract on Etherscan

# Run tests (optional)   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

npx hardhat test   ```



# Start frontend6. **Test on Sepolia Testnet**

cd frontend

npm run dev   ```bash

# Open http://localhost:5173/   # Once deployed, you can run a simple test on Sepolia.

```   npx hardhat test --network sepolia

````

## 🎮 How to Play

## 📁 Project Structure

1. **Connect Wallet** - Click "Connect Wallet" and approve MetaMask

2. **Place Bet** - Enter bet amount (e.g., 0.01 ETH) and click "Start Game"```

3. **Play Your Hand**fhevm-hardhat-template/
   - **Hit**: Draw another card├── contracts/ # Smart contract source files

   - **Stand**: Keep your current hand, dealer plays automatically│ └── FHECounter.sol # Example FHE counter contract

4. **Win Conditions**├── deploy/ # Deployment scripts
   - Get closer to 21 than dealer without going over├── tasks/ # Hardhat custom tasks

   - Bust if you go over 21├── test/ # Test files

   - Win pays 2x your bet├── hardhat.config.ts # Hardhat configuration

   - Push (tie) returns your bet└── package.json # Dependencies and scripts

````

## 🏗️ Architecture

## 📜 Available Scripts

### Smart Contract (`contracts/FHEBlackjack.sol`)

| Script             | Description              |

```solidity| ------------------ | ------------------------ |

// Key Features:| `npm run compile`  | Compile all contracts    |

- Encrypted dealer hole card using FHEVM| `npm run test`     | Run all tests            |

- Automatic dealer AI (draws until 17+)| `npm run coverage` | Generate coverage report |

- Secure betting with automatic payouts| `npm run lint`     | Run linting checks       |

- Event-driven architecture for frontend integration| `npm run clean`    | Clean build artifacts    |

````

## 📚 Documentation

**Contract Size:** 260 lines

**Tests:** 26 passing - [FHEVM Documentation](https://docs.zama.ai/fhevm)

**Coverage:** All game scenarios-
[FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)

- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)

### Frontend (`frontend/src/`)- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

````## 📄 License

- Blackjack.tsx    - Main game component (460+ lines)

- Blackjack.css    - Casino-style stylingThis project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

- config.ts        - Network and contract configuration

```## 🆘 Support



**Stack:** React 18 + TypeScript + Vite + ethers.js v6- **GitHub Issues**: [Report bugs or request features](https://github.com/zama-ai/fhevm/issues)

- **Documentation**: [FHEVM Docs](https://docs.zama.ai)

## 🧪 Testing- **Community**: [Zama Discord](https://discord.gg/zama)



```bash---

# Run all tests

npx hardhat test**Built with ❤️ by the Zama team**


# Expected output:
# ✓ 26 passing tests
# ✓ Game Start (5 tests)
# ✓ Hit Action (7 tests)
# ✓ Stand Action (6 tests)
# ✓ Game End (4 tests)
# ✓ View Functions (4 tests)
````

## 🔐 Security

- **Environment Variables**: All sensitive data (mnemonics, API keys) stored in `.env` files
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
# Make sure you have environment variables set
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy
npx hardhat deploy --network sepolia --tags FHEBlackjack --reset

# Note the deployed contract address
# Update frontend/.env with VITE_CONTRACT_ADDRESS
```

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

- **React** 18
- **TypeScript** 5.8.3
- **Vite** 7.1.9
- **ethers.js** 6.15.0
- **CSS3** with animations

### Network

- **Sepolia Testnet** (Chain ID: 11155111)
- **Infura** RPC provider
- **MetaMask** wallet integration

## 📊 Project Statistics

- **Smart Contract**: 260 lines
- **Frontend**: 460+ lines (React/TypeScript)
- **Tests**: 297 lines (26 passing tests)
- **Documentation**: Comprehensive guides
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
- **Score**: 87/100 (see ZAMA_SUBMISSION_EVALUATION.md)
- **Highlights**: Complete dApp with smart contract, frontend, tests, and documentation

## 🔗 Links

- **Zama FHEVM**: https://docs.zama.ai/fhevm
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Get Sepolia ETH**: https://sepoliafaucet.com
- **Documentation**: See QUICK_START.md for detailed setup

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
