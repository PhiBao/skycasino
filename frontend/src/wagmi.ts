import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Sky Casino",
  projectId: "YOUR_PROJECT_ID", // Get one at https://cloud.walletconnect.com
  chains: [sepolia, hardhat],
  ssr: false, // If your dApp uses server side rendering (SSR)
});
