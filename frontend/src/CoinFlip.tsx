import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import contractABIJson from "./FHECoinFlip.abi.json";
import { COINFLIP_CONTRACT_ADDRESS } from "./config";

const contractABI = contractABIJson.abi;

interface GameInfo {
  player1: string;
  player2: string;
  betAmount: string;
  player1Committed: boolean;
  player2Committed: boolean;
  isRevealed: boolean;
  coinResult: number;
  winner: string;
  status: number;
}

interface CoinFlipProps {
  onBack: () => void;
}

const STATUS_NAMES = ["Waiting", "Committing", "Revealed", "Finished"];

function CoinFlip({ onBack }: CoinFlipProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"lobby" | "game">("lobby");

  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [currentGame, setCurrentGame] = useState<GameInfo | null>(null);
  const [gameId, setGameId] = useState<number>(0);

  const [betAmount, setBetAmount] = useState<string>("0.0001");
  const [myChoice, setMyChoice] = useState<number>(0); // 0 = Heads, 1 = Tails
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
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [view, gameId]);

  // Auto-refresh available games list
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === "lobby") {
      loadAvailableGames(); // Initial load
      interval = setInterval(() => {
        loadAvailableGames();
      }, 3000); // Refresh every 3 seconds
    }
    return () => clearInterval(interval);
  }, [view, publicClient]);

  const checkActiveGame = async () => {
    if (!publicClient || !address) return;
    try {
      setHasCheckedActiveGame(true);
      const activeGameId = (await publicClient.readContract({
        address: COINFLIP_CONTRACT_ADDRESS,
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
      // Check active game error (silenced in production)
    }
  };

  const loadAvailableGames = async () => {
    if (!publicClient) return;
    try {
      const gameCount = (await publicClient.readContract({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "gameCounter",
      })) as bigint;

      const games: any[] = [];

      // loading available coinflip games

      for (let i = 1; i <= Number(gameCount); i++) {
        try {
          const result: any = await publicClient.readContract({
            address: COINFLIP_CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: "getGameInfo",
            args: [BigInt(i)],
          });

          // Destructure the tuple return: [player1, player2, betAmount, player1Committed, player2Committed, isRevealed, coinResult, winner, status]
          const [player1, , betAmount, , , , , , status] = result;

          // Only show waiting games that are valid (have a real player1)
          if (Number(status) === 0 && player1 !== "0x0000000000000000000000000000000000000000") {
            // game is valid and waiting
            games.push({
              id: i,
              player1: player1,
              betAmount: formatEther(betAmount),
            });
          } else {
            // game filtered
          }
        } catch (e) {
          // error loading individual game (ignored)
        }
      }

      // updated available games
      setAvailableGames(games);
    } catch (error: any) {
      // load games error (silenced)
    }
  };

  const loadGameInfo = async (gId: number) => {
    if (!publicClient) return;
    try {
      const result: any = await publicClient.readContract({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "getGameInfo",
        args: [BigInt(gId)],
      });

      // Destructure the tuple return: [player1, player2, betAmount, player1Committed, player2Committed, isRevealed, coinResult, winner, status]
      const [player1, player2, betAmount, player1Committed, player2Committed, isRevealed, coinResult, winner, status] =
        result;

      // Check if game data is valid (check player1, not pot since pot is 0 until game starts)
      if (!result || player1 === "0x0000000000000000000000000000000000000000") {
        // Invalid or finished game, redirecting to lobby
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
        player1: player1,
        player2: player2,
        betAmount: formatEther(betAmount),
        player1Committed: player1Committed,
        player2Committed: player2Committed,
        isRevealed: isRevealed,
        coinResult: Number(coinResult),
        winner: winner,
        status: Number(status),
      });
    } catch (error: any) {
      // Load game info error (silenced to avoid log spam during polling)
      // Don't redirect to lobby on error during polling
    }
  };

  const createGame = async () => {
    try {
      setLoading(true);
      setMessage("Creating coin flip game...");

      const betWei = parseEther(betAmount);
      const hash = await writeContractAsync({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "createGame",
        value: betWei,
      });

      setMessage("Transaction sent! Waiting for confirmation...");

      if (publicClient) {
        try {
          await publicClient.waitForTransactionReceipt({ hash });
        } catch (receiptError) {
          // Receipt fetch failed, but transaction was sent (ignoring receipt fetch error)
          // Continue anyway - transaction might have succeeded
        }

        // Get the new game ID (assuming it's the latest one)
        try {
          const gameCount = (await publicClient.readContract({
            address: COINFLIP_CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: "gameCounter",
          })) as bigint;

          const newGameId = Number(gameCount);
          setGameId(newGameId);
          setView("game"); // Set view first
          setMessage("Game created! Loading...");

          try {
            await loadGameInfo(newGameId);
            await loadAvailableGames(); // Refresh available games list
            setMessage("Game created! Waiting for opponent...");
            setTimeout(() => setMessage(""), 3000);
          } catch (loadError) {
            // load game info error after create (ignored)
            setMessage("Game created! Refreshing...");
            setTimeout(() => setMessage(""), 3000);
          }
        } catch (error) {
          // error getting game ID (ignored, fallback to refresh)
          setMessage("Game created! Refreshing list...");
          await loadAvailableGames();
          setTimeout(() => {
            setView("lobby");
            setMessage("");
          }, 2000);
        }
      }
    } catch (error: any) {
      // create game error (silenced)
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
        address: COINFLIP_CONTRACT_ADDRESS,
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
      // leave game error (silenced)
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (gId: number, betAmtStr: string) => {
    try {
      setLoading(true);
      setMessage("Joining game...");

      const betAmt = parseEther(betAmtStr);

      const hash = await writeContractAsync({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "joinGame",
        args: [BigInt(gId)],
        value: betAmt,
      });

      setMessage("Transaction sent! Waiting for confirmation...");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });

        // Set game ID and view first, before loading game info
        setGameId(gId);
        setView("game");
        setMessage("Joined! Loading game...");

        // Then load game info and refresh list
        try {
          await loadGameInfo(gId);
          await loadAvailableGames(); // Refresh available games list
          setMessage("Joined! Choose your side...");
          setTimeout(() => setMessage(""), 3000);
        } catch (loadError) {
          // Even if loading fails, we're already in the game
          // load game info error after join (ignored)
          setMessage("Joined! Refreshing game state...");
          setTimeout(() => setMessage(""), 3000);
        }
      }
    } catch (error: any) {
      // join game error (silenced)

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

  const submitChoice = async () => {
    try {
      setLoading(true);
      setMessage("Submitting choice...");

      const hash = await writeContractAsync({
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "submitChoice",
        args: [BigInt(gameId), myChoice],
      });

      setMessage("Transaction sent! Waiting for confirmation...");

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });

        await loadGameInfo(gameId);
        setMessage("Choice submitted!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error: any) {
      // submit choice error (silenced)
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffd208] text-black p-4 flex flex-col items-center font-sans">
      <button
        onClick={onBack}
        className="self-start mb-4 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors font-bold"
      >
        ← Back to Menu
      </button>

      <h1 className="text-5xl font-bold mb-2 text-black drop-shadow-sm">🪙 FHE Coin Flip</h1>
      <p className="text-xl font-bold mb-8">Instant PvP with encrypted choices</p>

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
                <h2 className="text-3xl font-bold">💰 Coin Flip Lobby</h2>
                <button
                  onClick={loadAvailableGames}
                  className="px-4 py-2 bg-white hover:bg-gray-100 rounded-lg font-bold border-2 border-black text-black shadow-sm transition-all"
                >
                  Refresh
                </button>
              </div>

              <div className="mb-12 bg-gray-100 p-6 rounded-xl border-2 border-black">
                <h3 className="text-xl font-bold mb-4">Create New Flip</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex flex-col gap-2">
                    <label className="font-bold">Bet Amount (ETH):</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
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
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Available Games</h3>
                {availableGames.length === 0 ? (
                  <p className="text-gray-500 italic font-medium">No games waiting. Create one!</p>
                ) : (
                  <div className="grid gap-4">
                    {availableGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-black shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="font-mono font-bold">
                          Player: {game.player1.slice(0, 6)}...{game.player1.slice(-4)}
                        </div>
                        <div className="font-bold bg-yellow-100 px-3 py-1 rounded-full border border-yellow-400">
                          Bet: {game.betAmount} ETH
                        </div>
                        <button
                          onClick={() => joinGame(game.id, game.betAmount)}
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
            <div className="bg-white p-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border-4 border-black text-center">
              {!currentGame ? (
                <div className="text-center py-20">
                  <p className="text-xl font-bold animate-pulse">Loading game...</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                    <h2 className="text-2xl font-bold">
                      Game #{gameId} <span className="text-gray-500 mx-2">|</span> {STATUS_NAMES[currentGame.status]}
                    </h2>
                    <div className="text-xl font-bold bg-green-100 px-4 py-2 rounded-lg border-2 border-green-500 text-green-800">
                      💰 Prize Pool: {(parseFloat(currentGame.betAmount) * 2).toFixed(4)} ETH
                    </div>
                  </div>

                  <div className="py-8">
                    {currentGame.status === 0 && currentGame.player1.toLowerCase() === address?.toLowerCase() && (
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={leaveGame}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                          disabled={loading}
                        >
                          Leave Game
                        </button>
                      </div>
                    )}

                    {currentGame.status === 1 && (
                      <>
                        {!(
                          (currentGame.player1.toLowerCase() === address?.toLowerCase() &&
                            currentGame.player1Committed) ||
                          (currentGame.player2.toLowerCase() === address?.toLowerCase() && currentGame.player2Committed)
                        ) && (
                          <div className="max-w-md mx-auto">
                            <h3 className="text-2xl font-bold mb-6">Choose Your Side</h3>
                            <div className="flex justify-center gap-6 mb-8">
                              <button
                                onClick={() => setMyChoice(0)}
                                className={`w-32 h-32 rounded-lg flex flex-col items-center justify-center text-base font-bold transition-all hover:scale-105 ${
                                  myChoice === 0
                                    ? "bg-black text-white border-yellow-400 shadow-lg"
                                    : "bg-white text-black border-black hover:bg-black hover:text-white hover:border-black"
                                }`}
                                style={
                                  myChoice === 0
                                    ? {
                                        backgroundColor: "#000",
                                        color: "#fff",
                                        borderColor: "#FFD208",
                                        borderWidth: "2px",
                                      }
                                    : { borderWidth: "2px" }
                                }
                              >
                                <span className="text-3xl mb-1">🪙</span>
                                <span>Heads</span>
                              </button>
                              <button
                                onClick={() => setMyChoice(1)}
                                className={`w-32 h-32 rounded-lg flex flex-col items-center justify-center text-base font-bold transition-all hover:scale-105 ${
                                  myChoice === 1
                                    ? "bg-black text-white border-yellow-400 shadow-lg"
                                    : "bg-white text-black border-black hover:bg-black hover:text-white hover:border-black"
                                }`}
                                style={
                                  myChoice === 1
                                    ? {
                                        backgroundColor: "#000",
                                        color: "#fff",
                                        borderColor: "#FFD208",
                                        borderWidth: "2px",
                                      }
                                    : { borderWidth: "2px" }
                                }
                              >
                                <span className="text-3xl mb-1">🪙</span>
                                <span>Tails</span>
                              </button>
                            </div>
                            <button
                              onClick={submitChoice}
                              className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-12 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg text-lg"
                              disabled={loading}
                            >
                              {loading ? "Submitting..." : "Submit Choice"}
                            </button>
                          </div>
                        )}

                        {((currentGame.player1.toLowerCase() === address?.toLowerCase() &&
                          currentGame.player1Committed) ||
                          (currentGame.player2.toLowerCase() === address?.toLowerCase() &&
                            currentGame.player2Committed)) && (
                          <div className="max-w-md mx-auto">
                            <style>{`
                              @keyframes coinFlip {
                                0% { transform: rotateY(0deg) rotateX(0deg); }
                                25% { transform: rotateY(90deg) rotateX(10deg); }
                                50% { transform: rotateY(180deg) rotateX(0deg); }
                                75% { transform: rotateY(270deg) rotateX(-10deg); }
                                100% { transform: rotateY(360deg) rotateX(0deg); }
                              }
                              .coin-flip {
                                animation: coinFlip 2s ease-in-out infinite;
                                transform-style: preserve-3d;
                              }
                            `}</style>
                            <div style={{ perspective: "1000px" }} className="mb-6">
                              <div className="coin-flip w-32 h-32 mx-auto bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full border-4 border-yellow-600 flex items-center justify-center text-4xl shadow-2xl">
                                🪙
                              </div>
                            </div>
                            <div className="p-8 bg-yellow-50 rounded-xl border-2 border-yellow-400">
                              <p className="text-2xl font-bold mb-2">✅ Your choice submitted!</p>
                              <p className="text-gray-600 animate-pulse">Waiting for opponent...</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {currentGame.status === 2 && currentGame.isRevealed && (
                      <div className="max-w-md mx-auto">
                        <h3 className="text-3xl font-bold mb-6">🎉 Result!</h3>
                        <div className="w-48 h-48 mx-auto bg-yellow-400 rounded-full border-8 border-black flex items-center justify-center text-4xl font-bold mb-8 shadow-2xl animate-bounce">
                          {currentGame.coinResult === 0 ? "Heads" : "Tails"}
                        </div>

                        <div className="mb-8">
                          {currentGame.winner.toLowerCase() === address?.toLowerCase() ? (
                            <p className="text-4xl font-bold text-green-600 drop-shadow-sm">🏆 You Won! 🏆</p>
                          ) : (
                            <p className="text-2xl font-bold text-gray-600">Better luck next time!</p>
                          )}
                        </div>
                      </div>
                    )}

                    {currentGame.status === 3 && (
                      <div className="max-w-md mx-auto">
                        <h3 className="text-3xl font-bold mb-6">🎮 Game Finished</h3>
                        <div className="bg-white rounded-xl border-4 border-black p-6 mb-6 shadow-xl">
                          <h4 className="text-xl font-bold mb-4">Final Result</h4>

                          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-400">
                            <p className="text-lg mb-2">Coin landed on:</p>
                            <p className="text-3xl font-bold">
                              {currentGame.coinResult === 0 ? "🪙 Heads" : "🪙 Tails"}
                            </p>
                          </div>

                          <div className="border-t-2 border-gray-300 my-4"></div>

                          <div className="mb-4">
                            <p className="text-lg font-semibold mb-2">💰 Prize Distribution:</p>
                            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                              <p className="text-xl font-bold text-green-700">
                                Winner: {currentGame.winner.slice(0, 6)}...{currentGame.winner.slice(-4)}
                              </p>
                              <p className="text-lg text-green-600 mt-2">
                                Received: {(parseFloat(currentGame.betAmount) * 2).toFixed(4)} ETH
                              </p>
                            </div>
                          </div>

                          {currentGame.winner.toLowerCase() === address?.toLowerCase() ? (
                            <p className="text-2xl font-bold text-green-600 mt-4">🎉 You Won!</p>
                          ) : (
                            <p className="text-lg text-gray-600 mt-4">Better luck next time!</p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setGameId(0);
                            setCurrentGame(null);
                            setView("lobby");
                            loadAvailableGames();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors transform hover:scale-105 shadow-lg"
                        >
                          Back to Lobby
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CoinFlip;
