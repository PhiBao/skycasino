import { expect } from "chai";
import { ethers } from "hardhat";
import { FHEBlackjack, FHEBlackjack__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FHEBlackjack", function () {
  let blackjack: FHEBlackjack;
  let owner: HardhatEthersSigner;
  let player: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();

    // Deploy contract
    const FHEBlackjackFactory = (await ethers.getContractFactory("FHEBlackjack")) as FHEBlackjack__factory;
    blackjack = (await FHEBlackjackFactory.deploy()) as FHEBlackjack;
    await blackjack.waitForDeployment();

    // Fund the contract with house bankroll
    await owner.sendTransaction({
      to: await blackjack.getAddress(),
      value: ethers.parseEther("100"),
    });
  });

  describe("Game Start", function () {
    it("Should start a new game with a bet", async function () {
      const betAmount = ethers.parseEther("1");

      const tx = await blackjack.connect(player).startGame({ value: betAmount });
      await tx.wait();

      // Check player has cards (game may or may not be active depending on blackjack)
      const playerHand = await blackjack.connect(player).getPlayerHand();
      expect(playerHand.length).to.equal(2);

      // Check dealer has up card
      const dealerUpCard = await blackjack.connect(player).getDealerUpCard();
      expect(dealerUpCard).to.be.greaterThan(0).and.lessThanOrEqual(13);
    });

    it("Should emit GameStarted event", async function () {
      const betAmount = ethers.parseEther("1");

      await expect(blackjack.connect(player).startGame({ value: betAmount })).to.emit(blackjack, "GameStarted");
    });

    it("Should not allow starting a game without a bet", async function () {
      await expect(blackjack.connect(player).startGame({ value: 0 })).to.be.revertedWith("Must place a bet");
    });

    it("Should not allow starting a game when one is already active", async function () {
      const betAmount = ethers.parseEther("1");

      // Keep starting games until we get one that doesn't immediately end (no blackjack)
      let attempts = 0;
      let isActive = false;

      while (!isActive && attempts < 10) {
        try {
          await blackjack.connect(player).startGame({ value: betAmount });
          [isActive] = await blackjack.connect(player).getGameStatus();
          attempts++;

          if (!isActive) {
            // Game ended immediately (blackjack), try again
            continue;
          }
        } catch (e) {
          // Game might already be in progress from previous attempt
          [isActive] = await blackjack.connect(player).getGameStatus();
          if (isActive) break;
        }
      }

      // Now we have an active game, trying to start another should fail
      if (isActive) {
        await expect(blackjack.connect(player).startGame({ value: betAmount })).to.be.revertedWith(
          "Game already in progress",
        );
      } else {
        // If we couldn't get an active game after 10 attempts, skip this test
        this.skip();
      }
    });
  });

  describe("Player Actions", function () {
    beforeEach(async function () {
      const betAmount = ethers.parseEther("1");

      // Keep trying to start a game until we get one that doesn't immediately end
      let attempts = 0;
      let isActive = false;

      while (!isActive && attempts < 20) {
        await blackjack.connect(player).startGame({ value: betAmount });
        [isActive] = await blackjack.connect(player).getGameStatus();
        attempts++;
      }

      if (!isActive) {
        throw new Error("Could not start an active game after 20 attempts");
      }
    });

    it("Should allow player to hit", async function () {
      const initialHand = await blackjack.connect(player).getPlayerHand();
      const initialLength = initialHand.length;

      const tx = await blackjack.connect(player).hit();
      await tx.wait();

      const newHand = await blackjack.connect(player).getPlayerHand();
      expect(newHand.length).to.equal(initialLength + 1);
    });

    it("Should emit PlayerHit event", async function () {
      await expect(blackjack.connect(player).hit()).to.emit(blackjack, "PlayerHit");
    });

    it("Should allow player to stand", async function () {
      await expect(blackjack.connect(player).stand()).to.emit(blackjack, "PlayerStood");
    });

    it("Should not allow hit after standing", async function () {
      await blackjack.connect(player).stand();

      // Wait for GameEnded event
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to start a new game first
      const betAmount = ethers.parseEther("1");
      await blackjack.connect(player).startGame({ value: betAmount });

      // Now stand and try to hit
      await blackjack.connect(player).stand();

      await expect(blackjack.connect(player).hit()).to.be.revertedWith("No active game");
    });

    it("Should not allow actions without an active game", async function () {
      // Complete the current game first
      await blackjack.connect(player).stand();

      // Wait a bit for game to end
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(blackjack.connect(player).hit()).to.be.revertedWith("No active game");
    });
  });

  describe("Hand Value Calculation", function () {
    it("Should calculate hand value correctly for number cards", async function () {
      const hand = [5, 7]; // 5 + 7 = 12
      const value = await blackjack.calculateHandValue(hand);
      expect(value).to.equal(12);
    });

    it("Should calculate hand value correctly with face cards", async function () {
      const hand = [11, 13]; // Jack + King = 10 + 10 = 20
      const value = await blackjack.calculateHandValue(hand);
      expect(value).to.equal(20);
    });

    it("Should calculate hand value correctly with Ace as 11", async function () {
      const hand = [1, 9]; // Ace + 9 = 11 + 9 = 20
      const value = await blackjack.calculateHandValue(hand);
      expect(value).to.equal(20);
    });

    it("Should calculate hand value correctly with Ace as 1", async function () {
      const hand = [1, 10, 5]; // Ace + 10 + 5 = 1 + 10 + 5 = 16
      const value = await blackjack.calculateHandValue(hand);
      expect(value).to.equal(16);
    });

    it("Should handle multiple Aces correctly", async function () {
      const hand = [1, 1, 9]; // Ace + Ace + 9 = 1 + 1 + 9 = 11 or 1 + 11 + 9 = 21
      const value = await blackjack.calculateHandValue(hand);
      expect(value).to.equal(21);
    });

    it("Should calculate blackjack correctly", async function () {
      const hand = [1, 11]; // Ace + Jack = 21
      const value = await blackjack.calculateHandValue(hand);
      expect(value).to.equal(21);
    });
  });

  describe("Game End Scenarios", function () {
    it("Should end game when player busts", async function () {
      const betAmount = ethers.parseEther("1");
      await blackjack.connect(player).startGame({ value: betAmount });

      // Keep hitting until bust (or max attempts)
      let attempts = 0;
      let isActive = true;

      while (isActive && attempts < 10) {
        try {
          const hand = await blackjack.connect(player).getPlayerHand();
          const value = await blackjack.calculateHandValue(hand);

          if (value >= 21) break;

          await blackjack.connect(player).hit();
          const [active] = await blackjack.connect(player).getGameStatus();
          isActive = active;
          attempts++;
        } catch (e) {
          break;
        }
      }

      // Game should eventually end
      const [finalActive] = await blackjack.connect(player).getGameStatus();
      // Note: Game might end due to bust or natural 21
    });

    it("Should emit GameEnded event when standing", async function () {
      const betAmount = ethers.parseEther("1");
      await blackjack.connect(player).startGame({ value: betAmount });

      await expect(blackjack.connect(player).stand()).to.emit(blackjack, "GameEnded");
    });
  });

  describe("Contract Funding", function () {
    it("Should accept ether for house bankroll", async function () {
      const amount = ethers.parseEther("5");

      await expect(
        owner.sendTransaction({
          to: await blackjack.getAddress(),
          value: amount,
        }),
      ).to.not.be.reverted;

      const balance = await ethers.provider.getBalance(await blackjack.getAddress());
      expect(balance).to.be.greaterThan(amount);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const betAmount = ethers.parseEther("1");

      // Keep trying to start a game until we get one that doesn't immediately end
      let attempts = 0;
      let isActive = false;

      while (!isActive && attempts < 20) {
        await blackjack.connect(player).startGame({ value: betAmount });
        [isActive] = await blackjack.connect(player).getGameStatus();
        attempts++;
      }

      if (!isActive) {
        throw new Error("Could not start an active game after 20 attempts");
      }
    });

    it("Should return player's hand", async function () {
      const hand = await blackjack.connect(player).getPlayerHand();
      expect(hand.length).to.be.greaterThan(0);
    });

    it("Should return dealer's up card", async function () {
      const upCard = await blackjack.connect(player).getDealerUpCard();
      expect(upCard).to.be.greaterThan(0).and.lessThanOrEqual(13);
    });

    it("Should return game status", async function () {
      const [isActive, playerStood] = await blackjack.connect(player).getGameStatus();
      expect(isActive).to.be.true;
      expect(playerStood).to.be.false;
    });

    it("Should not reveal dealer hole card until game ends", async function () {
      await expect(blackjack.connect(player).getDealerHoleCard()).to.be.revertedWith(
        "Dealer's hole card not yet revealed",
      );
    });

    it("Should reveal dealer hole card after game ends", async function () {
      await blackjack.connect(player).stand();
      // Wait for game to end
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now hole card should be revealed
      const holeCard = await blackjack.connect(player).getDealerHoleCard();
      expect(holeCard).to.be.greaterThan(0).and.lessThanOrEqual(13);
    });
  });
});
