// Contract configuration
// Uses environment variables with fallback to defaults
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1";

const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY || "YOUR_INFURA_KEY";

const SEPOLIA_CHAIN_ID = 11155111;

export const NETWORK_CONFIG = {
  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`, // Hex format for MetaMask
  chainIdNumber: SEPOLIA_CHAIN_ID, // Decimal format for internal use
  chainName: import.meta.env.VITE_CHAIN_NAME || "Sepolia",
  rpcUrl: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
};

// Additional per-game contract addresses. If not provided, fall back to main `CONTRACT_ADDRESS`.
export const COINFLIP_CONTRACT_ADDRESS = (import.meta.env.VITE_COINFLIP_CONTRACT_ADDRESS as string) || CONTRACT_ADDRESS;

export const POKER_CONTRACT_ADDRESS = (import.meta.env.VITE_POKER_CONTRACT_ADDRESS as string) || CONTRACT_ADDRESS;
