import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedBlackjack = await deploy("FHEBlackjack", {
    from: deployer,
    log: true,
  });

  // FHEBlackjack deployed at deployedBlackjack.address

  // Fund the contract with initial house bankroll (optional)
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    const [deployerSigner] = await ethers.getSigners();
    const tx = await deployerSigner.sendTransaction({
      to: deployedBlackjack.address,
      value: ethers.parseEther("10"), // 10 ETH house bankroll
    });
    await tx.wait();
    // Funded contract with 10 ETH house bankroll (development)
  }
};

export default func;
func.id = "deploy_fheBlackjack";
func.tags = ["FHEBlackjack"];
