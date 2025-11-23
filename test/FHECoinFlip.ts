import { expect } from "chai";
import { ethers } from "hardhat";
import { FHECoinFlip, FHECoinFlip__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FHECoinFlip", function () {
  let coinflip: FHECoinFlip;
  let owner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const factory = (await ethers.getContractFactory("FHECoinFlip")) as FHECoinFlip__factory;
    coinflip = (await factory.deploy()) as FHECoinFlip;
    await coinflip.waitForDeployment();
  });

  it("should create and join a game", async function () {
    const bet = ethers.parseEther("0.01");

    const tx = await coinflip.connect(player1).createGame({ value: bet });
    await expect(tx).to.emit(coinflip, "GameCreated");
    const rc = await tx.wait();

    // gameId is emitted in event, but we can read playerActiveGame
    const gameId = await coinflip.playerActiveGame(await player1.getAddress());
    expect(gameId).to.be.greaterThan(0);

    await expect(coinflip.connect(player2).joinGame(gameId, { value: bet })).to.not.be.reverted;

    const info = await coinflip.getGameInfo(gameId);
    expect(info.player2).to.equal(await player2.getAddress());
    // status should be Committing (enum index 1)
    expect(Number(info.status)).to.equal(1);
  });

  it("should accept choices and finish the game", async function () {
    const bet = ethers.parseEther("0.01");

    await coinflip.connect(player1).createGame({ value: bet });
    const gameId = await coinflip.playerActiveGame(await player1.getAddress());
    await coinflip.connect(player2).joinGame(gameId, { value: bet });

    // player1 commits
    await coinflip.connect(player1).submitChoice(gameId, 0);

    // player2 commits -> this should trigger reveal and finish
    const submitTx = await coinflip.connect(player2).submitChoice(gameId, 1);
    await expect(submitTx).to.emit(coinflip, "GameRevealed");

    // After reveal, prize distribution should complete and game be finished
    await expect(submitTx).to.emit(coinflip, "GameFinished");

    // subsequent submits should fail
    await expect(coinflip.connect(player2).submitChoice(gameId, 1)).to.be.reverted;

    // Contract balance should be zero after prize distribution
    const contractAddress = await coinflip.getAddress();
    const contractBalance = await ethers.provider.getBalance(contractAddress);
    expect(contractBalance).to.equal(0n);
  });

  it("should allow creator to cancel waiting game", async function () {
    const bet = ethers.parseEther("0.01");
    await coinflip.connect(player1).createGame({ value: bet });
    const gameId = await coinflip.playerActiveGame(await player1.getAddress());

    await expect(coinflip.connect(player1).cancelGame(gameId)).to.not.be.reverted;

    const info = await coinflip.getGameInfo(gameId);
    // Finished enum index is 3
    expect(Number(info.status)).to.equal(3);
  });

  it("emits events on create and join and clears active games on finish", async function () {
    const bet = ethers.parseEther("0.01");

    // create emits GameCreated
    const tx = await coinflip.connect(player1).createGame({ value: bet });
    await expect(tx).to.emit(coinflip, "GameCreated");
    const gameId = await coinflip.playerActiveGame(await player1.getAddress());

    // join emits PlayerJoined
    const joinTx = await coinflip.connect(player2).joinGame(gameId, { value: bet });
    await expect(joinTx).to.emit(coinflip, "PlayerJoined");

    // commit both to finish quickly
    await coinflip.connect(player1).submitChoice(gameId, 0);
    const submitTx = await coinflip.connect(player2).submitChoice(gameId, 1);

    // After finish, both playerActiveGame entries should be cleared
    const active1 = await coinflip.playerActiveGame(await player1.getAddress());
    const active2 = await coinflip.playerActiveGame(await player2.getAddress());
    expect(active1).to.equal(0);
    expect(active2).to.equal(0);
  });
});
