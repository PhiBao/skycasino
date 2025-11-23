import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

const WC_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || "5c6c49dff8832b0677349a00036b646e";

export const config = getDefaultConfig({
  appName: "Sky Casino",
  projectId: WC_PROJECT_ID, // WalletConnect Cloud project ID from env
  chains: [sepolia],
  ssr: false, // If your dApp uses server side rendering (SSR)
});
