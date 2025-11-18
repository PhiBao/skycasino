import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployFHEKingOfDiamonds: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("FHEKingOfDiamonds", {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`FHEKingOfDiamonds contract deployed at: ${deployed.address}`);
};

deployFHEKingOfDiamonds.tags = ["FHEKingOfDiamonds"];

export default deployFHEKingOfDiamonds;
