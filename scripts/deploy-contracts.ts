import { ethers } from "hardhat";

async function main() {
  // Deploying FHEPoker
  const FHEPoker = await ethers.getContractFactory("FHEPoker");
  const poker = await FHEPoker.deploy();
  await poker.waitForDeployment();
  const pokerAddress = await poker.getAddress();
  // FHEPoker deployed to: (address available in `pokerAddress` variable)

  // Deploying FHECoinFlip
  const FHECoinFlip = await ethers.getContractFactory("FHECoinFlip");
  const coinflip = await FHECoinFlip.deploy();
  await coinflip.waitForDeployment();
  const coinflipAddress = await coinflip.getAddress();
  // FHECoinFlip deployed to: (address available in `coinflipAddress` variable)

  // Deployment summary available in variables `pokerAddress` and `coinflipAddress`.
  // Update addresses in frontend files if needed.
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // Critical failure during deployment
    console.error(error);
    process.exit(1);
  });
