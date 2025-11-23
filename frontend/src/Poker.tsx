import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import contractABIJson from "./FHEPoker.abi.json";
import { POKER_CONTRACT_ADDRESS } from "./config";
const contractABI = contractABIJson.abi;

interface GameInfo {
  gameId: number;
  player1: string;
  player2: string;
  pot: string;
  stage: number;
  currentPlayer: string;
  player1Stack: string;
  player2Stack: string;
  communityCards: number[];
  communityCardsRevealed: number;
}

interface PokerProps {
  onBack: () => void;
}

const STAGE_NAMES = ["Waiting", "Pre-Flop", "Flop", "Turn", "River", "Showdown", "Finished"];
const CARD_VALUES = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♠", "♥", "♦", "♣"];

// Deterministic mock cards so users can see "their" hand in UI without real decryption
const getMockHoleCards = (gameId: number, playerAddr: string) => {
  const cards = [];
  for (let i = 0; i < 2; i++) {
    const seed = `${gameId}-${playerAddr}-${i}`;
    let hash = 0;
    for (let j = 0; j < seed.length; j++) {
      hash = (hash * 31 + seed.charCodeAt(j)) % 9973;
    }
    const value = (hash % 13) + 2; // 2-14
    const suit = SUITS[hash % SUITS.length];
    cards.push({ value, label: `${CARD_VALUES[value]}${suit}` });
  }
  return cards;
};

function Poker({ onBack }: PokerProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"lobby" | "game">("lobby");

  const [availableGames, setAvailableGames] = useState<GameInfo[]>([]);
  const [currentGame, setCurrentGame] = useState<GameInfo | null>(null);
  const [gameId, setGameId] = useState<number>(0);

  const [buyIn, setBuyIn] = useState<string>("0.001");
  const [hasCheckedActiveGame, setHasCheckedActiveGame] = useState(false);

  useEffect(() => {
    if (isConnected && view === "lobby") {
      loadAvailableGames();
      if (!hasCheckedActiveGame) {
        checkActiveGame();
      }
    }
  }, [isConnected, view]);

  useEffect(() => {
    if (!isConnected) {
      setHasCheckedActiveGame(false);
    }
  }, [isConnected]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "game" && gameId) {
      loadGameInfo(gameId); // Initial load
      interval = setInterval(() => {
        loadGameInfo(gameId);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [view, gameId]);

  // Auto-refresh lobby games list
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "lobby") {
      loadAvailableGames(); // Initial load
      interval = setInterval(() => {
        loadAvailableGames();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [view, publicClient]);

  const checkActiveGame = async () => {
    if (!publicClient || !address) return;
    try {
      setHasCheckedActiveGame(true);
      const activeGameId = (await publicClient.readContract({
        address: POKER_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "playerActiveGame",
        args: [address],
      })) as bigint;

      if (activeGameId > 0n) {
        const gId = Number(activeGameId);
        setGameId(gId);
        await loadGameInfo(gId);
        setView("game");
        setMessage("Resuming active game...");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      // Check active game error (suppressed in production)
    }
  };

  const loadAvailableGames = async () => {
    if (!publicClient) return;
    try {
      const gameCount = (await publicClient.readContract({
        address: POKER_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "gameCounter",
      })) as bigint;

      const games: GameInfo[] = [];

      // loading poker games

      for (let i = 1; i <= Number(gameCount); i++) {
        try {
          const result: any = await publicClient.readContract({
            address: POKER_CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: "getGameInfo",
            args: [BigInt(i)],
          });

          // Destructure the tuple return: [player1, player2, pot, stage, currentPlayer, player1Stack, player2Stack, communityCards, communityCardsRevealed]
          const [
            player1,
            player2,
            pot,
            stage,
            currentPlayer,
            player1Stack,
            player2Stack,
            communityCards,
            communityCardsRevealed,
          ] = result;

          // Only show waiting games that are valid (have a real player1)
          if (Number(stage) === 0 && player1 !== "0x0000000000000000000000000000000000000000") {
            // game is valid and waiting
            games.push({
              gameId: i,
              player1: player1,
              player2: player2,
              pot: formatEther(pot),
              stage: Number(stage),
              currentPlayer: currentPlayer,
              player1Stack: formatEther(player1Stack),
              player2Stack: formatEther(player2Stack),
              communityCards: communityCards.map((c: any) => Number(c)),
              communityCardsRevealed: Number(communityCardsRevealed),
            });
          } else {
            // game filtered
          }
        } catch (e) {
          // error loading individual game (ignored)
        }
      }

      // found available poker games
      setAvailableGames(games);
    } catch (error: any) {
      // load games error (suppressed)
    }
  };

  const loadGameInfo = async (gId: number) => {
    if (!publicClient) return;
    try {
      const result: any = await publicClient.readContract({
        address: POKER_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "getGameInfo",
        args: [BigInt(gId)],
      });

      // Destructure the tuple return: [player1, player2, pot, stage, currentPlayer, player1Stack, player2Stack, communityCards, communityCardsRevealed]
      const [
        player1,
        player2,
        pot,
        stage,
        currentPlayer,
        player1Stack,
        player2Stack,
        communityCards,
        communityCardsRevealed,
      ] = result;

      // Check if game data is valid (check player1, not pot since pot is 0 until game starts)
      if (!result || player1 === "0x0000000000000000000000000000000000000000") {
        console.log("Invalid or finished game, redirecting to lobby");
        setGameId(0);
        setCurrentGame(null);
        setMessage("Game has ended or expired");
        setTimeout(() => {
          setView("lobby");
          setMessage("");
        }, 2000);
        return;
      }

      setCurrentGame({
        gameId: gId,
        player1: player1,
        player2: player2,
        pot: formatEther(pot),
        stage: Number(stage),
        currentPlayer: currentPlayer,
        player1Stack: formatEther(player1Stack),
        player2Stack: formatEther(player2Stack),
        communityCards: communityCards.map((c: any) => Number(c)),
        communityCardsRevealed: Number(communityCardsRevealed),
      });
    } catch (error: any) {
      // Load game info error (suppressed) - don't redirect to lobby on polling errors
    }
  };

  const createGame = async () => {
    try {
      setLoading(true);
      setMessage("Creating poker game...");

      const buyInWei = parseEther(buyIn);
      const hash = await writeContractAsync({
        address: POKER_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "createGame",
        value: buyInWei,
      });

      setMessage("Transaction sent! Waiting for confirmation...");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });

        // Get the new game ID (assuming it's the latest one)
        const gameCount = (await publicClient.readContract({
          address: POKER_CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: "gameCounter",
        })) as bigint;

        const newGameId = Number(gameCount);
        setGameId(newGameId);
        setView("game"); // Set view first
        await loadGameInfo(newGameId);
        await loadAvailableGames(); // Refresh available games list

        setMessage("Game created! Waiting for opponent...");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      // Create game error (suppressed)
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const leaveGame = async () => {
    try {
      setLoading(true);
      setMessage("Leaving game...");

      const hash = await writeContractAsync({
        address: POKER_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "leaveGame",
        args: [BigInt(gameId)],
      });

      setMessage("Transaction sent! Waiting for confirmation...");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        setMessage("Left game successfully!");
        setGameId(0);
        setView("lobby");
        await loadAvailableGames();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      // Leave game error (suppressed)
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (gId: number, buyInAmountStr: string) => {
    try {
      setLoading(true);
      setMessage("Joining game...");

      const buyInAmount = parseEther(buyInAmountStr);

      const hash = await writeContractAsync({
        address: POKER_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "joinGame",
        args: [BigInt(gId)],
        value: buyInAmount,
      });

      setMessage("Transaction sent! Waiting for confirmation...");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });

        setGameId(gId);
        await loadGameInfo(gId);
        await loadAvailableGames(); // Refresh available games list
        setView("game");
        setMessage("Joined! Game starting...");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      // Join game error (suppressed)

      // Check if game expired
      if (error.message && error.message.includes("Game expired")) {
        setMessage("This game has expired. Refreshing games list...");
        await loadAvailableGames(); // Refresh to remove expired game
        setTimeout(() => {
          setView("lobby");
          setMessage("");
        }, 2000);
      } else {
        setMessage(`Error: ${error.message || "Failed to join game"}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const playerAction = async (action: "call" | "raise" | "fold", raiseAmount?: string) => {
    try {
      if (!currentGame) return;
      setLoading(true);
      setMessage(`${action}ing...`);

      let hash;
      if (action === "call") {
        hash = await writeContractAsync({
          address: POKER_CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: "call",
          args: [BigInt(gameId)],
        });
      } else if (action === "fold") {
        hash = await writeContractAsync({
          address: POKER_CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: "fold",
          args: [BigInt(gameId)],
        });
      } else if (action === "raise" && raiseAmount) {
        const amount = parseEther(raiseAmount);
        hash = await writeContractAsync({
          address: POKER_CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: "raise",
          args: [BigInt(gameId), amount],
        });
      }

      if (hash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        await loadGameInfo(gameId);
        setMessage(`${action} successful!`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      // player action error (suppressed)
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderCommunityCards = () => {
    if (!currentGame) return null;

    const cards = [];
    for (let i = 0; i < currentGame.communityCardsRevealed; i++) {
      const cardValue = currentGame.communityCards[i];
      cards.push(
        <div
          key={i}
          className="w-16 h-24 bg-white rounded-lg border-2 border-black flex justify-center items-center shadow-md text-2xl font-bold text-black"
        >
          {CARD_VALUES[cardValue] || "?"}
        </div>,
      );
    }

    // Show back of cards for unrevealed
    for (let i = currentGame.communityCardsRevealed; i < 5; i++) {
      cards.push(
        <div
          key={i}
          className="w-16 h-24 bg-black rounded-lg border-2 border-gray-800 flex justify-center items-center shadow-md"
        >
          <span className="text-2xl text-white">🂠</span>
        </div>,
      );
    }

    return <div className="flex gap-2 justify-center my-4">{cards}</div>;
  };

  const renderPlayerSeat = (player: "p1" | "p2") => {
    if (!currentGame) return null;

    const isPlayer1 = player === "p1";
    const playerAddress = isPlayer1 ? currentGame.player1 : currentGame.player2;
    const isYou = address && playerAddress.toLowerCase() === address.toLowerCase();
    const isTurn = currentGame.currentPlayer && currentGame.currentPlayer.toLowerCase() === playerAddress.toLowerCase();
    const isDealer = isPlayer1; // Small blind / acts first pre-flop in this demo

    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border-2 p-4 shadow-sm transition-colors ${
          isYou ? "bg-yellow-50/80 border-black ring-2 ring-yellow-400" : "bg-blue-50/60 border-blue-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-bold">
              {isPlayer1 ? "Player 1" : "Player 2"} {isYou ? "(You)" : ""}
            </div>
            {isDealer && (
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-8 w-8 rounded-full bg-pink-300 opacity-60 animate-ping"></span>
                <span className="relative inline-flex items-center justify-center h-8 w-8 rounded-full bg-pink-600 text-white text-xs font-extrabold shadow">
                  D
                </span>
              </div>
            )}
          </div>
          {isTurn && (
            <div className="flex items-center gap-2 text-pink-600 font-bold">
              <span className="text-xl">🎯</span>
              <span>Turn</span>
            </div>
          )}
        </div>
        <div className="font-mono text-sm text-gray-700">
          {playerAddress.slice(0, 6)}...{playerAddress.slice(-4)}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hole Cards</div>
          <div className="flex gap-2">
            {isYou
              ? getMockHoleCards(currentGame.gameId, playerAddress).map((card, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-16 rounded-lg bg-white border-2 border-black flex items-center justify-center text-xl font-bold text-black shadow"
                  >
                    {card.label}
                  </div>
                ))
              : [0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="w-12 h-16 rounded-lg bg-black border-2 border-gray-800 flex items-center justify-center text-white text-xl shadow"
                  >
                    🂠
                  </div>
                ))}
          </div>
          <span className="text-xs text-gray-500 font-semibold">
            {isYou ? "Demo preview (FHE hidden on-chain)" : "(Hidden)"}
          </span>
        </div>
        <div className="font-bold text-lg">
          Stack: {isPlayer1 ? currentGame.player1Stack : currentGame.player2Stack} ETH
        </div>
      </div>
    );
  };

  const isUserInCurrentGame =
    currentGame &&
    address &&
    (currentGame.player1.toLowerCase() === address.toLowerCase() ||
      (currentGame.player2 && currentGame.player2.toLowerCase() === address.toLowerCase()));

  const isFinished = currentGame ? currentGame.stage >= 6 : false;

  const backButtonLabel =
    view === "game"
      ? isFinished
        ? "← Back to Lobby"
        : isUserInCurrentGame
          ? "← Leave Game"
          : "← Back to Lobby"
      : "← Back to Menu";

  const handleBackClick = async () => {
    if (view === "game") {
      if (isFinished) {
        setGameId(0);
        setCurrentGame(null);
        setView("lobby");
        await loadAvailableGames();
        return;
      }

      if (isUserInCurrentGame) {
        await leaveGame();
        return;
      }

      setGameId(0);
      setCurrentGame(null);
      setView("lobby");
      await loadAvailableGames();
      return;
    }

    onBack();
  };

  return (
    <div className="min-h-screen bg-[#ffd208] text-black p-4 flex flex-col items-center font-sans">
      <button
        onClick={handleBackClick}
        className="self-start mb-4 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors font-bold disabled:opacity-50"
        disabled={loading}
      >
        {backButtonLabel}
      </button>

      <h1 className="text-5xl font-bold mb-2 text-black drop-shadow-sm">🃏 FHE Poker</h1>
      <p className="text-xl font-bold mb-8">Two-player (Heads-Up) Texas Hold'em</p>

      {!isConnected ? (
        <div className="text-center mt-20">
          <p className="text-xl mb-4 font-bold">Please connect your wallet to play</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          {message && (
            <div className="mb-6 text-center p-3 bg-black text-white rounded-lg font-bold shadow-lg">{message}</div>
          )}

          {view === "lobby" && (
            <div className="bg-white p-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border-4 border-black">
              <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
                <h2 className="text-3xl font-bold">💰 Poker Lobby</h2>
                <button
                  onClick={loadAvailableGames}
                  className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg font-bold border-2 border-black text-black shadow-sm transition-all"
                >
                  Refresh
                </button>
              </div>
              <div className="mb-12 bg-gray-100 p-6 rounded-xl border-2 border-black">
                <h3 className="text-xl font-bold mb-4">Create New Game</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex flex-col gap-2">
                    <label className="font-bold">Buy-in (ETH):</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={buyIn}
                      onChange={(e) => setBuyIn(e.target.value)}
                      className="bg-white border-2 border-black rounded px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black w-48 font-bold"
                    />
                  </div>
                  <button
                    onClick={createGame}
                    className="bg-[#ffd208] hover:bg-yellow-400 text-black border-2 border-black font-bold py-2 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg h-11 flex items-center justify-center text-center"
                    disabled={loading}
                  >
                    <span className="flex items-center justify-center">{loading ? "Creating..." : "Create Game"}</span>
                  </button>
                </div>
              </div>{" "}
              <div>
                <h3 className="text-xl font-bold mb-4">Available Games</h3>
                {availableGames.length === 0 ? (
                  <p className="text-gray-500 italic font-medium">No games waiting. Create one!</p>
                ) : (
                  <div className="grid gap-4">
                    {availableGames.map((game) => (
                      <div
                        key={game.gameId}
                        className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-black shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-bold text-gray-600">Game #{game.gameId}</div>
                          <div className="font-mono font-bold">
                            Player: {game.player1.slice(0, 6)}...{game.player1.slice(-4)}
                          </div>
                        </div>
                        <div className="font-bold bg-yellow-100 px-3 py-1 rounded-full border border-yellow-400">
                          Buy-in: {game.player1Stack} ETH
                        </div>
                        <button
                          onClick={() => joinGame(game.gameId, game.player1Stack)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 transition-colors border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                          disabled={loading}
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "game" && (
            <div className="bg-white p-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border-4 border-black">
              {!currentGame ? (
                <div className="text-center py-20">
                  <p className="text-xl font-bold animate-pulse">Loading game...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                    <h2 className="text-2xl font-bold">
                      Game #{gameId} <span className="text-gray-500 mx-2">|</span> {STAGE_NAMES[currentGame.stage]}
                    </h2>
                    <div className="text-xl font-bold bg-green-100 px-4 py-2 rounded-lg border-2 border-green-500 text-green-800">
                      💰 Pot: {currentGame.pot} ETH
                    </div>
                  </div>

                  <div className="flex flex-col gap-10">
                    {/* Table + players */}
                    <div className="bg-[#e7f7ff] border-2 border-black rounded-3xl p-6 relative shadow-inner">
                      <div className="absolute inset-0 pointer-events-none rounded-3xl shadow-[inset_0_8px_24px_rgba(0,0,0,0.15)]"></div>

                      <div className="flex flex-col items-center gap-6">
                        {/* Top seat */}
                        <div className="w-full max-w-3xl flex justify-center">
                          <div className="w-full max-w-xl">{renderPlayerSeat("p1")}</div>
                        </div>

                        {/* Table */}
                        <div className="w-full bg-green-800 p-8 rounded-full border-4 border-green-900 shadow-inner flex justify-center items-center">
                          {renderCommunityCards()}
                        </div>

                        {/* Bottom seat */}
                        <div className="w-full max-w-3xl flex justify-center">
                          <div className="w-full max-w-xl">{renderPlayerSeat("p2")}</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {currentGame.stage === 0 && currentGame.player1.toLowerCase() === address?.toLowerCase() && (
                      <div className="flex justify-center gap-4 mt-4">
                        <button
                          onClick={leaveGame}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                          disabled={loading}
                        >
                          Leave Game
                        </button>
                      </div>
                    )}

                    {currentGame.stage > 0 &&
                      currentGame.stage < 6 &&
                      currentGame.currentPlayer.toLowerCase() === address?.toLowerCase() && (
                        <div className="flex justify-center gap-4 mt-4">
                          <button
                            onClick={() => playerAction("fold")}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                            disabled={loading}
                          >
                            Fold
                          </button>
                          <button
                            onClick={() => playerAction("call")}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                            disabled={loading}
                          >
                            Call
                          </button>
                          <button
                            onClick={() => playerAction("raise", "0.0001")}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                            disabled={loading}
                          >
                            Raise
                          </button>
                        </div>
                      )}

                    {currentGame.stage === 6 && (
                      <div className="max-w-md mx-auto">
                        <h3 className="text-3xl font-bold mb-6">🎮 Game Finished</h3>
                        <div className="bg-white rounded-xl border-4 border-black p-6 mb-6 shadow-xl">
                          <h4 className="text-xl font-bold mb-4">Final Result</h4>

                          <div className="mb-4">
                            <p className="text-lg font-semibold mb-2">💰 Final Pot:</p>
                            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3">
                              <p className="text-2xl font-bold text-green-700">{currentGame.pot} ETH</p>
                            </div>
                          </div>

                          <div className="border-t-2 border-gray-300 my-4"></div>

                          <div className="mb-4">
                            <p className="text-lg font-semibold mb-2">🏆 Winner:</p>
                            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                              <p className="text-sm text-gray-600 mb-1">
                                Player 1 Stack: {currentGame.player1Stack} ETH
                              </p>
                              <p className="text-sm text-gray-600 mb-3">
                                Player 2 Stack: {currentGame.player2Stack} ETH
                              </p>

                              {parseFloat(currentGame.player1Stack) > parseFloat(currentGame.player2Stack) ? (
                                <>
                                  <p className="text-xl font-bold text-green-700">🎉 Player 1 Wins!</p>
                                  <p className="text-sm text-gray-600 mt-2">
                                    {currentGame.player1.slice(0, 6)}...{currentGame.player1.slice(-4)}
                                  </p>
                                </>
                              ) : parseFloat(currentGame.player2Stack) > parseFloat(currentGame.player1Stack) ? (
                                <>
                                  <p className="text-xl font-bold text-green-700">🎉 Player 2 Wins!</p>
                                  <p className="text-sm text-gray-600 mt-2">
                                    {currentGame.player2?.slice(0, 6)}...{currentGame.player2?.slice(-4)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xl font-bold text-blue-700">🤝 It's a Tie!</p>
                              )}
                            </div>
                          </div>

                          {address && (
                            <div className="mt-4">
                              {(parseFloat(currentGame.player1Stack) > parseFloat(currentGame.player2Stack) &&
                                currentGame.player1.toLowerCase() === address.toLowerCase()) ||
                              (parseFloat(currentGame.player2Stack) > parseFloat(currentGame.player1Stack) &&
                                currentGame.player2?.toLowerCase() === address.toLowerCase()) ? (
                                <p className="text-2xl font-bold text-green-600">🏆 You Won!</p>
                              ) : parseFloat(currentGame.player1Stack) === parseFloat(currentGame.player2Stack) ? (
                                <p className="text-xl font-bold text-blue-600">🤝 Draw!</p>
                              ) : (
                                <p className="text-lg text-gray-600">Better luck next time!</p>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setGameId(0);
                            setCurrentGame(null);
                            setView("lobby");
                            loadAvailableGames();
                          }}
                          className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition-colors transform hover:scale-105"
                        >
                          Play Again
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Poker;
