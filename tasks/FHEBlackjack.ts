import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FHEBlackjack, FHEBlackjack__factory } from "../types";

task("blackjack:deploy", "Deploy FHEBlackjack contract")
  .addOptionalParam("fund", "Amount of ETH to fund the house bankroll", "10")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const [deployer] = await ethers.getSigners();

    console.log("Deploying FHEBlackjack with account:", deployer.address);

    const factory = (await ethers.getContractFactory("FHEBlackjack")) as FHEBlackjack__factory;
    const contract = (await factory.deploy()) as FHEBlackjack;
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("FHEBlackjack deployed to:", address);

    // Fund the contract
    if (taskArguments.fund) {
      const fundAmount = ethers.parseEther(taskArguments.fund);
      const tx = await deployer.sendTransaction({
        to: address,
        value: fundAmount,
      });
      await tx.wait();
      console.log(`Funded contract with ${taskArguments.fund} ETH`);
    }

    return address;
  });

task("blackjack:start", "Start a new blackjack game")
  .addParam("contract", "The FHEBlackjack contract address")
  .addOptionalParam("bet", "Bet amount in ETH", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const [player] = await ethers.getSigners();

    const contract = (await ethers.getContractAt("FHEBlackjack", taskArguments.contract)) as FHEBlackjack;

    console.log(`Starting game for ${player.address} with bet: ${taskArguments.bet} ETH`);

    const betAmount = ethers.parseEther(taskArguments.bet);
    const tx = await contract.connect(player).startGame({ value: betAmount });
    const receipt = await tx.wait();

    console.log("Game started! Transaction:", receipt?.hash);

    // Get initial game state
    const playerHand = await contract.connect(player).getPlayerHand();
    const dealerUpCard = await contract.connect(player).getDealerUpCard();

    console.log("\n=== GAME STATE ===");
    console.log("Your hand:", playerHand.map((c: any) => c.toString()).join(", "));
    console.log("Dealer's up card:", dealerUpCard.toString());

    // Calculate player's hand value
    // Convert to regular array to avoid read-only issues
    const playerValue = await contract.calculateHandValue([...playerHand]);
    console.log("Your hand value:", playerValue.toString());
  });

task("blackjack:hit", "Draw another card")
  .addParam("contract", "The FHEBlackjack contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const [player] = await ethers.getSigners();

    const contract = (await ethers.getContractAt("FHEBlackjack", taskArguments.contract)) as FHEBlackjack;

    console.log("Drawing a card...");

    const tx = await contract.connect(player).hit();
    const receipt = await tx.wait();

    console.log("Card drawn! Transaction:", receipt?.hash);

    // Get updated game state
    const [isActive] = await contract.connect(player).getGameStatus();

    if (isActive) {
      const playerHand = await contract.connect(player).getPlayerHand();
      const playerValue = await contract.calculateHandValue([...playerHand]);

      console.log("\n=== UPDATED HAND ===");
      console.log("Your hand:", playerHand.map((c: any) => c.toString()).join(", "));
      console.log("Your hand value:", playerValue.toString());

      if (playerValue > 21) {
        console.log("BUST! You lose.");
      }
    } else {
      console.log("Game ended.");
    }
  });

task("blackjack:stand", "Stand and let dealer play")
  .addParam("contract", "The FHEBlackjack contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const [player] = await ethers.getSigners();

    const contract = (await ethers.getContractAt("FHEBlackjack", taskArguments.contract)) as FHEBlackjack;

    console.log("Standing...");

    const tx = await contract.connect(player).stand();
    const receipt = await tx.wait();

    console.log("Game ended! Transaction:", receipt?.hash);

    // Parse events to get game result
    if (receipt) {
      const iface = contract.interface;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed && parsed.name === "GameEnded") {
            console.log("\n=== GAME RESULT ===");
            console.log("Your total:", parsed.args.playerTotal.toString());
            console.log("Dealer's total:", parsed.args.dealerTotal.toString());
            console.log("Result:", parsed.args.result);
          }
        } catch (e) {
          // Not a contract event
        }
      }
    }
  });

task("blackjack:status", "Check current game status")
  .addParam("contract", "The FHEBlackjack contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;
    const [player] = await ethers.getSigners();

    const contract = (await ethers.getContractAt("FHEBlackjack", taskArguments.contract)) as FHEBlackjack;

    const [isActive, playerStood] = await contract.connect(player).getGameStatus();

    console.log("\n=== GAME STATUS ===");
    console.log("Player:", player.address);
    console.log("Game Active:", isActive);
    console.log("Player Stood:", playerStood);

    if (isActive) {
      const playerHand = await contract.connect(player).getPlayerHand();
      const dealerUpCard = await contract.connect(player).getDealerUpCard();
      const playerValue = await contract.calculateHandValue([...playerHand]);

      console.log("\n=== CURRENT HAND ===");
      console.log("Your hand:", playerHand.map((c: any) => c.toString()).join(", "));
      console.log("Your hand value:", playerValue.toString());
      console.log("Dealer's up card:", dealerUpCard.toString());
    } else {
      console.log("No active game. Start a new game with 'blackjack:start'");
    }
  });

task("blackjack:balance", "Check contract balance")
  .addParam("contract", "The FHEBlackjack contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;

    const balance = await ethers.provider.getBalance(taskArguments.contract);
    console.log("Contract balance:", ethers.formatEther(balance), "ETH");
  });
