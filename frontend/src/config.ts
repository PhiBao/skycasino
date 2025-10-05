// Contract configuration
// Uses environment variables with fallback to defaults
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x8a15d7Ed46AeF0D89519426903dFECC2729BA0e1";

const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY || "YOUR_INFURA_KEY";

export const NETWORK_CONFIG = {
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || "11155111"),
  chainName: import.meta.env.VITE_CHAIN_NAME || "Sepolia",
  rpcUrl: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
};
