# 🚀 Quick Start Guide

Complete setup guide for SkyĈasino Blackjack in 5 minutes.

## 📋 Prerequisites

- Node.js v20+
- MetaMask browser extension
- Sepolia ETH from [faucet](https://sepoliafaucet.com)

## ⚡ Super Quick Setup

```bash
# 1. Clone and install
git clone https://github.com/PhiBao/skycasino.git
cd skycasino
npm install
cd frontend && npm install && cd ..

# 2. Setup environment
./setup-env.sh

# 3. Add your keys
nano .env              # Add MNEMONIC and INFURA_API_KEY
nano frontend/.env     # Add VITE_INFURA_API_KEY

# 4. Run
npx hardhat compile
cd frontend && npm run dev
```

Open http://localhost:5173/ and play! 🎰

---

## 📝 Detailed Setup

### Step 1: Get Required Keys

#### A. MetaMask Recovery Phrase (MNEMONIC)

1. Open MetaMask
2. Go to Settings → Security & Privacy
3. Click "Reveal Secret Recovery Phrase"
4. Copy your 12-24 words

#### B. Infura API Key

1. Go to https://infura.io
2. Sign up (free)
3. Create new project → "Web3 API"
4. Copy API Key

#### C. Sepolia Test ETH

1. Visit https://sepoliafaucet.com
2. Sign in with Alchemy (free)
3. Enter your wallet address
4. Get 0.5 Sepolia ETH

### Step 2: Configure Environment

#### Backend Configuration (`.env`)

```bash
cd /home/kiter/skycasino
cp .env.example .env
nano .env
```

Add:

```env
MNEMONIC="your twelve word recovery phrase here"
INFURA_API_KEY="your-infura-api-key-here"
ETHERSCAN_API_KEY="optional-for-verification"
```

#### Frontend Configuration (`frontend/.env`)

```bash
cd frontend
cp .env.example .env
nano .env
```

Add:

```env
VITE_CONTRACT_ADDRESS="0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1"
VITE_INFURA_API_KEY="your-infura-api-key-here"
VITE_CHAIN_ID="11155111"
VITE_CHAIN_NAME="Sepolia"
```

### Step 3: Install Dependencies

```bash
# Backend
cd /home/kiter/skycasino
npm install

# Frontend
cd frontend
npm install
cd ..
```

### Step 4: Compile & Test

```bash
# Compile contracts
npx hardhat compile

# Run tests (optional)
npx hardhat test
# Expected: 26 passing tests
```

### Step 5: Run Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173/ in your browser.

---

## 🎮 Using the App

### Connect Wallet

1. Click "Connect Wallet"
2. Approve MetaMask connection
3. Switch to Sepolia (automatic prompt)

### Play Game

1. Enter bet amount (e.g., 0.01 ETH)
2. Click "Start Game"
3. Use **Hit** to draw cards or **Stand** to hold
4. Watch dealer play automatically
5. Win 2x your bet if you beat the dealer!

---

## 🚢 Deploy Your Own Contract (Optional)

### Using Hardhat Vars (Secure)

```bash
# Set variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy to Sepolia
npx hardhat deploy --network sepolia --tags FHEBlackjack --reset

# Copy the contract address shown
# Update frontend/.env with: VITE_CONTRACT_ADDRESS="0x..."
```

### Using .env Files

```bash
# Make sure .env is configured
cat .env

# Deploy
npx hardhat deploy --network sepolia --tags FHEBlackjack --reset
```

### Verify Contract (Optional)

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

---

## 🔧 Troubleshooting

### Problem: "Please install MetaMask"

**Solution**: Install MetaMask browser extension from metamask.io

### Problem: "Wrong network detected"

**Solution**: App will prompt to switch automatically. Click "Switch network" in MetaMask.

### Problem: "Insufficient funds"

**Solution**: Get Sepolia ETH from https://sepoliafaucet.com (requires Alchemy account)

### Problem: Contract connection errors

**Solution**:

1. Check `frontend/.env` has correct contract address
2. Verify you're on Sepolia network
3. Refresh page and reconnect wallet

### Problem: "Configuration variables can only have alphanumeric..."

**Solution**: Don't put the API key as the variable NAME. Use:

```bash
npx hardhat vars set INFURA_API_KEY
# Then PASTE your key when prompted
```

---

## 📁 Project Structure

```
skycasino/
├── contracts/
│   └── FHEBlackjack.sol      # Main game contract
├── test/
│   └── FHEBlackjack.ts        # 26 passing tests
├── deploy/
│   └── deployBlackjack.ts     # Deployment script
├── frontend/
│   ├── src/
│   │   ├── Blackjack.tsx      # Main game UI
│   │   ├── Blackjack.css      # Casino styling
│   │   └── config.ts          # Network config
│   └── .env                   # Frontend env vars
├── .env                       # Backend env vars
└── README.md                  # Main documentation
```

---

## 🎯 Common Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia
npx hardhat deploy --network sepolia --tags FHEBlackjack

# Check your accounts
npx hardhat accounts --network sepolia

# Start frontend
cd frontend && npm run dev

# Verify security before git push
./verify-security.sh
```

---

## 🔐 Security Notes

- ✅ `.env` files are in `.gitignore` (never committed)
- ✅ Use `.env.example` templates for setup
- ✅ Keep your MNEMONIC secret
- ✅ Use test ETH only (Sepolia)
- ✅ Run `./verify-security.sh` before pushing to GitHub

---

## 📚 Additional Resources

- **Main Documentation**: README.md
- **Submission Info**: ZAMA_SUBMISSION_EVALUATION.md
- **Zama Docs**: https://docs.zama.ai/fhevm
- **Sepolia Explorer**: https://sepolia.etherscan.io/
- **Get Test ETH**: https://sepoliafaucet.com

---

## ✨ You're Ready!

Your SkyĈasino Blackjack is now:

- ✅ Configured securely
- ✅ Ready to run locally
- ✅ Connected to Sepolia testnet
- ✅ Ready to deploy your own contract

**Have fun playing! 🎰**
