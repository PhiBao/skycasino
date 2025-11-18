import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { FHEKingOfDiamonds, FHEKingOfDiamonds__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FHEKingOfDiamonds - Beauty Contest (Alice in Borderland)", function () {
  let kingOfDiamonds: FHEKingOfDiamonds;
  let deployer: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let player3: HardhatEthersSigner;

  beforeEach(async function () {
    [deployer, player1, player2, player3] = await ethers.getSigners();

    const KingOfDiamondsFactory = (await ethers.getContractFactory("FHEKingOfDiamonds")) as FHEKingOfDiamonds__factory;
    kingOfDiamonds = (await KingOfDiamondsFactory.deploy()) as FHEKingOfDiamonds;
    await kingOfDiamonds.waitForDeployment();
  });

  describe("Game Creation & Joining", function () {
    it("Should create a 2-5 player game", async function () {
      const entryFee = ethers.parseEther("0.001");
      const tx = await kingOfDiamonds.connect(deployer).createGame(2, 5, { value: entryFee });

      await expect(tx).to.emit(kingOfDiamonds, "GameCreated").withArgs(0, deployer.address, entryFee, 2, 5);

      const gameInfo = await kingOfDiamonds.getGameInfo(0);
      expect(gameInfo.playerCount).to.equal(1);
      expect(gameInfo.minPlayers).to.equal(2);
      expect(gameInfo.maxPlayers).to.equal(5);
    });

    it("Should reject games with more than 5 players", async function () {
      const entryFee = ethers.parseEther("0.001");
      await expect(kingOfDiamonds.connect(deployer).createGame(2, 6, { value: entryFee })).to.be.revertedWith(
        "Invalid max players",
      );
    });

    it("Should allow players to join", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 3, { value: entryFee });

      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });
      const gameInfo = await kingOfDiamonds.getGameInfo(0);
      expect(gameInfo.playerCount).to.equal(2);
    });
  });

  describe("2-Player Game - Standard Rules", function () {
    it("Should calculate 80% of average correctly", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      // Player 1: 50, Player 2: 30
      // Average = 40, Target = 32
      // Winner: Player 2 (30 is closer to 32)
      await kingOfDiamonds.connect(deployer).submitGuess(0, 50);
      await kingOfDiamonds.connect(player1).submitGuess(0, 30);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(player1.address);
      expect(results.targetNumber).to.equal(32);
      expect(results.average).to.equal(40);
    });

    it("Should handle Nash equilibrium (both guess 0)", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      await kingOfDiamonds.connect(deployer).submitGuess(0, 0);
      await kingOfDiamonds.connect(player1).submitGuess(0, 0);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.targetNumber).to.equal(0);
      expect(results.average).to.equal(0);
    });
  });

  describe("ELIMINATION RULE - Duplicate Numbers", function () {
    it("Should eliminate both players who pick the same number", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(3, 3, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(player2).joinGame(0, { value: entryFee });

      // Player 1: 50, Player 2: 50, Player 3: 30
      // Players 1 & 2 eliminated for picking 50
      // Player 3 wins by default
      await kingOfDiamonds.connect(deployer).submitGuess(0, 50);
      await kingOfDiamonds.connect(player1).submitGuess(0, 50);
      const tx = await kingOfDiamonds.connect(player2).submitGuess(0, 30);

      await expect(tx).to.emit(kingOfDiamonds, "PlayersEliminated");

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(player2.address);
    });

    it("Should return funds if all players eliminated", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      // Both pick 42 - both eliminated
      await kingOfDiamonds.connect(deployer).submitGuess(0, 42);
      await kingOfDiamonds.connect(player1).submitGuess(0, 42);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(ethers.ZeroAddress);
    });
  });

  describe("2-Player ROCK-PAPER-SCISSORS Rules", function () {
    it("Should apply: 0 beats 1", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      await kingOfDiamonds.connect(deployer).submitGuess(0, 0);
      await kingOfDiamonds.connect(player1).submitGuess(0, 1);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(deployer.address); // 0 beats 1
    });

    it("Should apply: 1 beats 100", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      await kingOfDiamonds.connect(deployer).submitGuess(0, 1);
      await kingOfDiamonds.connect(player1).submitGuess(0, 100);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(deployer.address); // 1 beats 100
    });

    it("Should apply: 100 beats 0", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      await kingOfDiamonds.connect(deployer).submitGuess(0, 100);
      await kingOfDiamonds.connect(player1).submitGuess(0, 0);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(deployer.address); // deployer has 100, 100 beats 0
    });

    it("Should use standard rules for other 2-player numbers", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      // Neither 0, 1, nor 100 - use standard distance calculation
      await kingOfDiamonds.connect(deployer).submitGuess(0, 40);
      await kingOfDiamonds.connect(player1).submitGuess(0, 30);

      const results = await kingOfDiamonds.getGameResults(0);
      // Average = 35, Target = 28
      expect(results.winner).to.equal(player1.address); // 30 is closer to 28
    });
  });

  describe("3-Player Game Theory", function () {
    it("Should find winner closest to 80% of average", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(3, 3, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(player2).joinGame(0, { value: entryFee });

      // Player 1: 60, Player 2: 30, Player 3: 45
      // Average = 45, Target = 36
      // Distances: |60-36|=24, |30-36|=6, |45-36|=9
      // Winner: Player 2 (30)
      await kingOfDiamonds.connect(deployer).submitGuess(0, 60);
      await kingOfDiamonds.connect(player1).submitGuess(0, 30);
      await kingOfDiamonds.connect(player2).submitGuess(0, 45);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(player1.address);
      expect(results.targetNumber).to.equal(36);
      expect(results.average).to.equal(45);
    });

    it("Should handle perfect guess (exact match)", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(3, 3, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(player2).joinGame(0, { value: entryFee });

      // Naive: 50, Level-1: 40, Level-2: 32
      // Average = 40.66 = 40, Target = 32
      // Winner: Level-2 player (exact match!)
      await kingOfDiamonds.connect(deployer).submitGuess(0, 50);
      await kingOfDiamonds.connect(player1).submitGuess(0, 40);
      await kingOfDiamonds.connect(player2).submitGuess(0, 32);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(player2.address);
      expect(results.targetNumber).to.equal(32);
    });
  });

  describe("4-Player Game", function () {
    it("Should work with 4 players", async function () {
      const entryFee = ethers.parseEther("0.001");
      const [p1, p2, p3, p4] = await ethers.getSigners();

      await kingOfDiamonds.connect(p1).createGame(4, 4, { value: entryFee });
      await kingOfDiamonds.connect(p2).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(p3).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(p4).joinGame(0, { value: entryFee });

      // 80, 50, 30, 20
      // Average = 45, Target = 36
      // Winner: player with 30 (distance 6)
      await kingOfDiamonds.connect(p1).submitGuess(0, 80);
      await kingOfDiamonds.connect(p2).submitGuess(0, 50);
      await kingOfDiamonds.connect(p3).submitGuess(0, 30);
      await kingOfDiamonds.connect(p4).submitGuess(0, 20);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(p3.address);
      expect(results.targetNumber).to.equal(36);
    });
  });

  describe("5-Player Game", function () {
    it("Should work with 5 players", async function () {
      const entryFee = ethers.parseEther("0.001");
      const [p1, p2, p3, p4, p5] = await ethers.getSigners();

      await kingOfDiamonds.connect(p1).createGame(5, 5, { value: entryFee });
      await kingOfDiamonds.connect(p2).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(p3).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(p4).joinGame(0, { value: entryFee });
      await kingOfDiamonds.connect(p5).joinGame(0, { value: entryFee });

      // 100, 70, 50, 30, 10
      // Average = 52, Target = 41.6 = 41
      // Distances: 59, 29, 9, 11, 31
      // Winner: player with 50 (distance 9)
      await kingOfDiamonds.connect(p1).submitGuess(0, 100);
      await kingOfDiamonds.connect(p2).submitGuess(0, 70);
      await kingOfDiamonds.connect(p3).submitGuess(0, 50);
      await kingOfDiamonds.connect(p4).submitGuess(0, 30);
      await kingOfDiamonds.connect(p5).submitGuess(0, 10);

      const results = await kingOfDiamonds.getGameResults(0);
      expect(results.winner).to.equal(p3.address);
      expect(results.targetNumber).to.equal(41);
      expect(results.average).to.equal(52);
    });
  });

  describe("Prize Distribution", function () {
    it("Should pay winner the full prize pool", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      await kingOfDiamonds.connect(deployer).submitGuess(0, 50);
      const tx = await kingOfDiamonds.connect(player1).submitGuess(0, 32);
      const receipt = await tx.wait();

      const balanceAfter = await ethers.provider.getBalance(player1.address);
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      // Player1 should have: original + prize - gas
      const expectedBalance = balanceBefore + ethers.parseEther("0.002") - gasUsed;
      expect(balanceAfter).to.equal(expectedBalance);
    });
  });

  describe("View Functions", function () {
    it("Should return all guesses after submission", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      await kingOfDiamonds.connect(deployer).submitGuess(0, 42);
      await kingOfDiamonds.connect(player1).submitGuess(0, 37);

      const [players, guesses] = await kingOfDiamonds.getAllGuesses(0);
      expect(players.length).to.equal(2);
      expect(guesses[0]).to.equal(42);
      expect(guesses[1]).to.equal(37);
    });

    it("Should return player list correctly", async function () {
      const entryFee = ethers.parseEther("0.001");
      await kingOfDiamonds.connect(deployer).createGame(2, 2, { value: entryFee });
      await kingOfDiamonds.connect(player1).joinGame(0, { value: entryFee });

      const players = await kingOfDiamonds.getPlayers(0);
      expect(players.length).to.equal(2);
      expect(players[0]).to.equal(deployer.address);
      expect(players[1]).to.equal(player1.address);
    });
  });
});
