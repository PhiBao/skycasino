import { expect } from "chai";
import { ethers } from "hardhat";
import { FHEPoker, FHEPoker__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("FHEPoker", function () {
  let poker: FHEPoker;
  let owner: HardhatEthersSigner;
  let p1: HardhatEthersSigner;
  let p2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, p1, p2] = await ethers.getSigners();

    const Factory = (await ethers.getContractFactory("FHEPoker")) as FHEPoker__factory;
    poker = (await Factory.deploy()) as FHEPoker;
    await poker.waitForDeployment();
  });

  it("should create, join and deal cards with blinds posted", async function () {
    const buyIn = ethers.parseEther("0.01");

    await poker.connect(p1).createGame({ value: buyIn });
    const gameId = await poker.playerActiveGame(await p1.getAddress());

    // join should post blinds and deal cards
    await expect(poker.connect(p2).joinGame(gameId, { value: buyIn })).to.emit(poker, "PlayerJoined");

    const game = await poker.games(gameId);
    // stage PreFlop is enum index 1
    expect(Number(game.stage)).to.equal(1);

    const small = await poker.SMALL_BLIND();
    const big = await poker.BIG_BLIND();

    expect(game.player1Bet).to.equal(small);
    expect(game.player2Bet).to.equal(big);

    // CardsDealt event emitted
    // (CardsDealt was emitted in _dealCards during join)
  });

  it("fold should end the game and emit GameFinished", async function () {
    const buyIn = ethers.parseEther("0.01");
    await poker.connect(p1).createGame({ value: buyIn });
    const gameId = await poker.playerActiveGame(await p1.getAddress());
    await poker.connect(p2).joinGame(gameId, { value: buyIn });

    // currentPlayer should be p1 after blinds; p1 can fold
    await expect(poker.connect(p1).fold(gameId)).to.emit(poker, "GameFinished");
  });

  it("should allow call to match bets and emit PlayerAction", async function () {
    const buyIn = ethers.parseEther("0.01");
    await poker.connect(p1).createGame({ value: buyIn });
    const gameId = await poker.playerActiveGame(await p1.getAddress());
    await poker.connect(p2).joinGame(gameId, { value: buyIn });

    const small = await poker.SMALL_BLIND();
    const big = await poker.BIG_BLIND();

    // Read pre-call state and determine caller and callAmount
    const before = await poker.games(gameId);
    const currentPlayerAddr = before.currentPlayer as string;
    const p1Addr = await p1.getAddress();
    const caller = currentPlayerAddr === p1Addr ? p1 : p2;

    const prePlayer1Bet = BigInt((before.player1Bet as any) || 0);
    const prePlayer2Bet = BigInt((before.player2Bet as any) || 0);
    const prePot = BigInt((before.pot as any) || 0);

    const callAmount = caller === p1 ? prePlayer2Bet - prePlayer1Bet : prePlayer1Bet - prePlayer2Bet;

    await expect(poker.connect(caller).call(gameId)).to.emit(poker, "PlayerAction");

    const game = await poker.games(gameId);

    // After call, both bets should be equal
    expect(BigInt(game.player1Bet as any)).to.equal(BigInt(game.player2Bet as any));

    // pot should have increased by callAmount
    expect(BigInt(game.pot as any)).to.equal(prePot + callAmount);
  });

  it("should allow raise and require opponent to respond", async function () {
    const buyIn = ethers.parseEther("0.01");
    await poker.connect(p1).createGame({ value: buyIn });
    const gameId = await poker.playerActiveGame(await p1.getAddress());
    await poker.connect(p2).joinGame(gameId, { value: buyIn });

    // p1 raises by SMALL_BLIND amount
    const raiseAmount = await poker.SMALL_BLIND();
    await expect(poker.connect(p1).raise(gameId, raiseAmount)).to.emit(poker, "PlayerAction");

    const game = await poker.games(gameId);
    // After raise, currentPlayer should be player2
    expect(game.currentPlayer).to.equal(game.player2);
  });
});
