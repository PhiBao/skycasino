import { ethers } from "hardhat";

async function main() {
  console.log("Deploying FHEPoker...");
  const FHEPoker = await ethers.getContractFactory("FHEPoker");
  const poker = await FHEPoker.deploy();
  await poker.waitForDeployment();
  const pokerAddress = await poker.getAddress();
  console.log("FHEPoker deployed to:", pokerAddress);

  console.log("\nDeploying FHECoinFlip...");
  const FHECoinFlip = await ethers.getContractFactory("FHECoinFlip");
  const coinflip = await FHECoinFlip.deploy();
  await coinflip.waitForDeployment();
  const coinflipAddress = await coinflip.getAddress();
  console.log("FHECoinFlip deployed to:", coinflipAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("FHEPoker:", pokerAddress);
  console.log("FHECoinFlip:", coinflipAddress);
  console.log("\nUpdate these addresses in:");
  console.log("- frontend/src/Poker.tsx");
  console.log("- frontend/src/CoinFlip.tsx");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
