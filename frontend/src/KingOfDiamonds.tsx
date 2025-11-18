import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { NETWORK_CONFIG } from "./config";
import contractABI from "./FHEKingOfDiamonds.abi.json";
import "./KingOfDiamonds.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const KING_OF_DIAMONDS_ADDRESS = "0x4535973f189E1127746088CE96CeCE4160F51c89";

interface GameInfo {
  id: number;
  playerCount: number;
  entryFee: string;
  prizePool: string;
  minPlayers: number;
  maxPlayers: number;
  status: number;
  guessDeadline: number;
  winner: string;
}

interface KingOfDiamondsProps {
  onBack: () => void;
}

function KingOfDiamonds({ onBack }: KingOfDiamondsProps) {
  const [account, setAccount] = useState<string>("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [currentGame, setCurrentGame] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"lobby" | "create" | "game" | "matchmaking">("lobby");
  const [myGuess, setMyGuess] = useState<number>(50);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [players, setPlayers] = useState<string[]>([]);
  const [guessedPlayers, setGuessedPlayers] = useState<number>(0);
  const [allGuessesIn, setAllGuessesIn] = useState(false);
  const [playerGuesses, setPlayerGuesses] = useState<Record<string, number>>({});

  // Matchmaking
  const [desiredPlayers, setDesiredPlayers] = useState(5);
  const [matchmakingGame, setMatchmakingGame] = useState<GameInfo | null>(null);

  // Create game form
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [entryFee, setEntryFee] = useState("0.0001");

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage("Please install MetaMask!");
      return;
    }

    try {
      setLoading(true);

      // First, check and switch network BEFORE requesting accounts
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (currentChainId.toLowerCase() !== NETWORK_CONFIG.chainId.toLowerCase()) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: NETWORK_CONFIG.chainId }],
          });
          // Wait a bit for network to switch
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added, add it
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: NETWORK_CONFIG.chainId,
                    chainName: NETWORK_CONFIG.chainName,
                    rpcUrls: [NETWORK_CONFIG.rpcUrl],
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (addError: any) {
              console.error("Error adding network:", addError);
              setMessage(`Error: ${addError.message}`);
              setLoading(false);
              return;
            }
          } else {
            console.error("Error switching network:", switchError);
            setMessage(`Please switch to ${NETWORK_CONFIG.chainName}`);
            setLoading(false);
            return;
          }
        }
      }

      // Now request accounts after network is correct
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Verify we're still on correct network
      const finalChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (finalChainId.toLowerCase() !== NETWORK_CONFIG.chainId.toLowerCase()) {
        setMessage(`Please switch to ${NETWORK_CONFIG.chainName}`);
        setLoading(false);
        return;
      }

      setAccount(accounts[0]);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(KING_OF_DIAMONDS_ADDRESS, contractABI, signer);
      setContract(contractInstance);

      setMessage("Connected successfully!");
      await loadGames(contractInstance);
    } catch (error: any) {
      console.error("Connection error:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load available games
  const loadGames = async (contractInstance?: ethers.Contract) => {
    try {
      const gameContract = contractInstance || contract;
      if (!gameContract) return;

      const gameCounter = await gameContract.gameCounter();
      const loadedGames: GameInfo[] = [];

      for (let i = 0; i < Number(gameCounter); i++) {
        const gameInfo = await gameContract.getGameInfo(i);
        const status = Number(gameInfo.status);

        // Only show games that are waiting for players (status 0)
        if (status === 0) {
          loadedGames.push({
            id: i,
            playerCount: Number(gameInfo.playerCount),
            entryFee: ethers.formatEther(gameInfo.entryFee),
            prizePool: ethers.formatEther(gameInfo.prizePool),
            minPlayers: Number(gameInfo.minPlayers),
            maxPlayers: Number(gameInfo.maxPlayers),
            status: status,
            guessDeadline: Number(gameInfo.guessDeadline),
            winner: gameInfo.winner,
          });
        }
      }

      setGames(loadedGames);
    } catch (error: any) {
      console.error("Error loading games:", error);
    }
  };

  // Quick Match - Find or create game
  const quickMatch = async () => {
    if (!contract) return;

    try {
      setLoading(true);

      // Verify network first
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (currentChainId.toLowerCase() !== NETWORK_CONFIG.chainId.toLowerCase()) {
        setMessage(`Please switch to ${NETWORK_CONFIG.chainName}`);
        setLoading(false);
        return;
      }

      setMessage("Finding match...");

      // IMPORTANT: Reload games first to get latest state from blockchain
      await loadGames();

      // Get fresh game counter and check all games
      const gameCounter = await contract.gameCounter();
      let availableGame: GameInfo | null = null;

      // Search through all games to find an available one
      for (let i = 0; i < Number(gameCounter); i++) {
        const gameInfo = await contract.getGameInfo(i);
        const status = Number(gameInfo.status);
        const playerCount = Number(gameInfo.playerCount);
        const maxPlayers = Number(gameInfo.maxPlayers);
        const entryFee = ethers.formatEther(gameInfo.entryFee);

        if (status === 0 && maxPlayers === desiredPlayers && playerCount < maxPlayers && entryFee === "0.0001") {
          availableGame = {
            id: i,
            playerCount,
            entryFee,
            prizePool: ethers.formatEther(gameInfo.prizePool),
            minPlayers: Number(gameInfo.minPlayers),
            maxPlayers,
            status,
            guessDeadline: Number(gameInfo.guessDeadline),
            winner: gameInfo.winner,
          };
          break; // Found a game, stop searching
        }
      }

      if (availableGame) {
        // Join existing game
        await joinGame(availableGame.id, availableGame.entryFee);
        setMatchmakingGame(availableGame);
      } else {
        // Create new game
        setMessage("Creating new match...");
        const tx = await contract.createGame(desiredPlayers, desiredPlayers, {
          value: ethers.parseEther("0.0001"),
        });
        await tx.wait();

        const gameCounter = await contract.gameCounter();
        const newGameId = Number(gameCounter) - 1;
        const gameInfo = await contract.getGameInfo(newGameId);

        const newGame: GameInfo = {
          id: newGameId,
          playerCount: Number(gameInfo.playerCount),
          entryFee: ethers.formatEther(gameInfo.entryFee),
          prizePool: ethers.formatEther(gameInfo.prizePool),
          minPlayers: Number(gameInfo.minPlayers),
          maxPlayers: Number(gameInfo.maxPlayers),
          status: Number(gameInfo.status),
          guessDeadline: Number(gameInfo.guessDeadline),
          winner: gameInfo.winner,
        };

        setMatchmakingGame(newGame);
        setCurrentGame(newGame);
      }

      setView("matchmaking");
      setMessage("Waiting for players...");
    } catch (error: any) {
      console.error("Quick match error:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create new game
  const createGame = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setMessage("Creating game...");

      const tx = await contract.createGame(minPlayers, maxPlayers, {
        value: ethers.parseEther(entryFee),
      });

      await tx.wait();
      setMessage("Game created!");
      await loadGames();
      setView("lobby");
    } catch (error: any) {
      console.error("Create game error:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Join game
  const joinGame = async (gameId: number, fee: string) => {
    if (!contract) return;

    try {
      setLoading(true);
      setMessage("Joining game...");

      // Check if player already joined this game
      const players = await contract.getPlayers(gameId);
      const alreadyJoined = players.some((p: string) => p.toLowerCase() === account.toLowerCase());

      if (alreadyJoined) {
        setMessage("You already joined this game!");
        // Load the game and switch to game view
        await loadGameInfo(gameId);
        setView("game");
        setLoading(false);
        return;
      }

      const tx = await contract.joinGame(gameId, {
        value: ethers.parseEther(fee),
      });

      await tx.wait();
      setMessage("Joined game!");

      const gameInfo = await contract.getGameInfo(gameId);
      setCurrentGame({
        id: gameId,
        playerCount: Number(gameInfo.playerCount),
        entryFee: ethers.formatEther(gameInfo.entryFee),
        prizePool: ethers.formatEther(gameInfo.prizePool),
        minPlayers: Number(gameInfo.minPlayers),
        maxPlayers: Number(gameInfo.maxPlayers),
        status: Number(gameInfo.status),
        guessDeadline: Number(gameInfo.guessDeadline),
        winner: gameInfo.winner,
      });
      setView("game");
    } catch (error: any) {
      console.error("Join game error:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Start game manually
  const startGame = async (gameId: number) => {
    if (!contract) return;

    try {
      setLoading(true);
      setMessage("Starting game...");

      const tx = await contract.startGame(gameId);
      await tx.wait();

      setMessage("Game started!");
      await loadGameInfo(gameId);
    } catch (error: any) {
      console.error("Start game error:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Submit guess
  const submitGuess = async () => {
    if (!contract || !currentGame) return;

    try {
      // Verify network
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (currentChainId.toLowerCase() !== NETWORK_CONFIG.chainId.toLowerCase()) {
        setMessage(`Please switch to ${NETWORK_CONFIG.chainName}`);
        return;
      }

      setLoading(true);
      setMessage("Submitting guess...");

      const tx = await contract.submitGuess(currentGame.id, myGuess);
      await tx.wait();

      setMessage("Guess submitted!");
      setHasGuessed(true);
      await loadGameInfo(currentGame.id);
    } catch (error: any) {
      console.error("Submit guess error:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Finalize game
  const finalizeGame = async () => {
    if (!contract || !currentGame) return;

    try {
      setLoading(true);
      setMessage("Finalizing game...");

      const tx = await contract.finalizeGame(currentGame.id);
      await tx.wait();

      setMessage("Game finalized!");
      await loadGameInfo(currentGame.id);
    } catch (error: any) {
      console.error("Finalize error:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load specific game info
  const loadGameInfo = async (gameId: number) => {
    if (!contract) return;

    try {
      const gameInfo = await contract.getGameInfo(gameId);
      const hasPlayerGuessed = await contract.hasPlayerGuessed(gameId, account);

      setCurrentGame({
        id: gameId,
        playerCount: Number(gameInfo.playerCount),
        entryFee: ethers.formatEther(gameInfo.entryFee),
        prizePool: ethers.formatEther(gameInfo.prizePool),
        minPlayers: Number(gameInfo.minPlayers),
        maxPlayers: Number(gameInfo.maxPlayers),
        status: Number(gameInfo.status),
        guessDeadline: Number(gameInfo.guessDeadline),
        winner: gameInfo.winner,
      });
      setHasGuessed(hasPlayerGuessed);

      // Load players list
      const playersList = await contract.getPlayers(gameId);
      setPlayers(playersList);

      // Count how many players have guessed
      let guessedCount = 0;
      for (const player of playersList) {
        const hasGuessed = await contract.hasPlayerGuessed(gameId, player);
        if (hasGuessed) guessedCount++;
      }
      setGuessedPlayers(guessedCount);
      setAllGuessesIn(guessedCount === playersList.length && playersList.length > 0);

      // Load guesses if game is finished
      if (Number(gameInfo.status) === 3) {
        const guesses: Record<string, number> = {};
        for (const player of playersList) {
          try {
            const guess = await contract.getPlayerGuess(gameId, player);
            guesses[player] = Number(guess);
          } catch (e) {
            // Player might not have guessed
          }
        }
        setPlayerGuesses(guesses);
      }
    } catch (error: any) {
      console.error("Load game info error:", error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!currentGame || currentGame.status !== 1) return;

    const interval = setInterval(() => {
      const remaining = currentGame.guessDeadline - Math.floor(Date.now() / 1000);
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentGame]);

  // Matchmaking polling effect
  useEffect(() => {
    if (view !== "matchmaking" || !matchmakingGame || !contract) return;

    const pollInterval = setInterval(async () => {
      try {
        const gameInfo = await contract.getGameInfo(matchmakingGame.id);
        const status = Number(gameInfo.status);
        const playerCount = Number(gameInfo.playerCount);

        // Update matchmaking game state
        setMatchmakingGame((prev) =>
          prev
            ? {
                ...prev,
                playerCount,
                status,
                guessDeadline: Number(gameInfo.guessDeadline),
              }
            : null,
        );

        // If game started, switch to game view
        if (status === 1) {
          await loadGameInfo(matchmakingGame.id);
          setView("game");
          setMatchmakingGame(null);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [view, matchmakingGame, contract]);

  // Game view polling effect - update player guess status
  useEffect(() => {
    if (view !== "game" || !currentGame || !contract || currentGame.status !== 1) return;

    const pollInterval = setInterval(async () => {
      try {
        await loadGameInfo(currentGame.id);
      } catch (error) {
        console.error("Game polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [view, currentGame, contract]);

  // Network change listener
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = async (chainId: string) => {
      console.log("Chain changed to:", chainId);

      if (chainId.toLowerCase() !== NETWORK_CONFIG.chainId.toLowerCase()) {
        setMessage(`Wrong network! Please switch to ${NETWORK_CONFIG.chainName}`);
        setContract(null);
        setAccount("");
        setCurrentGame(null);
        setGames([]);
      } else {
        // Network switched back to correct one, reconnect
        if (account) {
          setMessage("Network switched. Reconnecting...");
          // Refresh provider and contract
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contractInstance = new ethers.Contract(KING_OF_DIAMONDS_ADDRESS, contractABI, signer);
            setContract(contractInstance);
            await loadGames(contractInstance);
            setMessage("Reconnected successfully!");
          } catch (error) {
            console.error("Reconnection error:", error);
          }
        }
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount("");
        setContract(null);
        setCurrentGame(null);
        setMessage("Wallet disconnected");
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        setMessage("Account changed. Please reconnect.");
        setContract(null);
        setCurrentGame(null);
      }
    };

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, [account]);

  // Status names
  const getStatusName = (status: number) => {
    const statuses = ["Waiting", "Accepting Guesses", "Calculating", "Finished"];
    return statuses[status] || "Unknown";
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="king-of-diamonds-container">
      <button onClick={onBack} className="btn-back">
        ← Back to Menu
      </button>
      <h1>♦️ King of Diamonds</h1>
      <p className="subtitle">Beauty Contest - Guess 80% of Average</p>

      {!account ? (
        <div className="connect-section">
          <button onClick={connectWallet} className="btn btn-primary btn-large">
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="game-section">
          <div className="account-info">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </div>

          {/* Lobby View */}
          {view === "lobby" && (
            <div className="lobby">
              <div className="lobby-header">
                <h2>Game Lobby</h2>
                <button onClick={() => setView("create")} className="btn btn-secondary">
                  Custom Game
                </button>
              </div>

              {/* Quick Match Section */}
              <div className="quick-match-section">
                <h3>🎮 Quick Match</h3>
                <p>Find a game instantly!</p>
                <div className="player-selector">
                  <label>Number of Players:</label>
                  <div className="player-buttons">
                    {[2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setDesiredPlayers(num)}
                        className={`player-btn ${desiredPlayers === num ? "active" : ""}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={quickMatch} className="btn btn-success btn-large" disabled={loading}>
                  {loading ? "Finding..." : "🔍 Quick Match"}
                </button>
                <div className="match-info">
                  <span>⚡ Entry: 0.0001 ETH</span>
                  <span>⏱️ Time Limit: 2 minutes</span>
                </div>
              </div>

              {/* Available Games Grid */}
              <div className="games-section">
                <h3>Available Games</h3>
                {games.length === 0 ? (
                  <p className="no-games">No games available. Create one or use Quick Match!</p>
                ) : (
                  <div className="games-grid">
                    {games.map((game) => (
                      <div key={game.id} className="game-card">
                        <div className="game-card-header">
                          <h4>Game #{game.id}</h4>
                          <span className={`status-badge status-${game.status}`}>{getStatusName(game.status)}</span>
                        </div>
                        <div className="game-card-body">
                          <div className="game-info-row">
                            <span className="label">Players:</span>
                            <span className="value">
                              {game.playerCount}/{game.maxPlayers}
                            </span>
                          </div>
                          <div className="game-info-row">
                            <span className="label">Entry:</span>
                            <span className="value">{game.entryFee} ETH</span>
                          </div>
                          <div className="game-info-row">
                            <span className="label">Prize:</span>
                            <span className="value">{game.prizePool} ETH</span>
                          </div>
                        </div>
                        {game.playerCount < game.maxPlayers && (
                          <button
                            onClick={() => joinGame(game.id, game.entryFee)}
                            className="btn btn-primary btn-block"
                            disabled={loading}
                          >
                            Join Game
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Matchmaking View */}
          {view === "matchmaking" && matchmakingGame && (
            <div className="matchmaking-view">
              <div className="matchmaking-header">
                <h2>🔍 Finding Players...</h2>
                <button
                  onClick={() => {
                    if (confirm("⚠️ Note: Your entry fee cannot be refunded if you leave now. Continue?")) {
                      setView("lobby");
                      setMatchmakingGame(null);
                      loadGames();
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Leave
                </button>
              </div>

              <div className="matchmaking-status">
                <div className="player-count-display">
                  <span className="current-count">{matchmakingGame.playerCount}</span>
                  <span className="separator">/</span>
                  <span className="max-count">{matchmakingGame.maxPlayers}</span>
                </div>
                <p className="status-text">Players Found</p>
              </div>

              <div className="player-slots">
                {Array.from({ length: matchmakingGame.maxPlayers }, (_, i) => (
                  <div key={i} className={`player-slot ${i < matchmakingGame.playerCount ? "filled" : "empty"}`}>
                    {i < matchmakingGame.playerCount ? "👤" : "⏳"}
                  </div>
                ))}
              </div>

              {matchmakingGame.playerCount === matchmakingGame.maxPlayers && (
                <div className="match-ready">
                  <h3>✅ Match Ready!</h3>
                  <p>Starting game...</p>
                </div>
              )}

              <div className="matchmaking-info">
                <p>Waiting for {matchmakingGame.maxPlayers - matchmakingGame.playerCount} more player(s)</p>
                <p className="entry-fee">Entry: {matchmakingGame.entryFee} ETH</p>
                <div className="prize-info">
                  <p className="info-title">💰 Prize Distribution:</p>
                  <p className="info-text">• Winner takes ALL: {matchmakingGame.prizePool} ETH</p>
                  <p className="info-text">• Duplicate guesses = Eliminated</p>
                  <p className="info-text">• Everyone eliminated = Refund</p>
                </div>
              </div>
            </div>
          )}

          {/* Create View */}
          {view === "create" && (
            <div className="create-game">
              <h2>Create New Game</h2>
              <div className="form-group">
                <label>Min Players (2-5):</label>
                <input
                  type="number"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(Number(e.target.value))}
                  min={2}
                  max={5}
                />
              </div>
              <div className="form-group">
                <label>Max Players (2-5):</label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  min={minPlayers}
                  max={5}
                />
              </div>
              <div className="form-group">
                <label>Entry Fee (ETH):</label>
                <input
                  type="text"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="0.0001"
                />
              </div>
              <div className="button-group">
                <button onClick={createGame} className="btn btn-success" disabled={loading}>
                  {loading ? "Creating..." : "Create Game"}
                </button>
                <button onClick={() => setView("lobby")} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Game View */}
          {view === "game" && currentGame && (
            <div className="game-view">
              <div className="game-info-header">
                <h2>Game #{currentGame.id}</h2>
                <button
                  onClick={() => {
                    setView("lobby");
                    setCurrentGame(null);
                  }}
                  className="btn btn-secondary"
                >
                  Back to Lobby
                </button>
              </div>

              <div className="game-stats">
                <div className="stat-card">
                  <span className="stat-label">Players</span>
                  <span className="stat-value">
                    {currentGame.playerCount}/{currentGame.maxPlayers}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Prize Pool</span>
                  <span className="stat-value">{currentGame.prizePool} ETH</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Status</span>
                  <span className="stat-value">{getStatusName(currentGame.status)}</span>
                </div>
                {currentGame.status === 1 && (
                  <div className="stat-card">
                    <span className="stat-label">Time Left</span>
                    <span className="stat-value countdown">{formatTime(timeRemaining)}</span>
                  </div>
                )}
              </div>

              {/* Waiting for players */}
              {currentGame.status === 0 && (
                <div className="waiting-section">
                  <p>
                    Waiting for players... ({currentGame.playerCount}/{currentGame.minPlayers} minimum)
                  </p>
                  {currentGame.playerCount >= currentGame.minPlayers && (
                    <button onClick={() => startGame(currentGame.id)} className="btn btn-success" disabled={loading}>
                      Start Game
                    </button>
                  )}
                </div>
              )}

              {/* Accepting guesses */}
              {currentGame.status === 1 && !hasGuessed && (
                <div className="guess-section">
                  <h3>Submit Your Guess</h3>
                  <p className="guess-instructions">
                    Pick a number 0-100. The winner is closest to <strong>80% of the average</strong> guess.
                  </p>
                  <div className="guess-input-group">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={myGuess}
                      onChange={(e) => setMyGuess(Number(e.target.value))}
                      className="guess-slider"
                    />
                    <div className="guess-display">{myGuess}</div>
                  </div>
                  <button onClick={submitGuess} className="btn btn-primary btn-large" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Guess"}
                  </button>
                </div>
              )}

              {/* Already guessed */}
              {currentGame.status === 1 && hasGuessed && (
                <div className="waiting-section">
                  <p>✅ Your guess has been submitted!</p>
                  <div className="guess-progress">
                    <p>
                      <strong>
                        {guessedPlayers}/{players.length}
                      </strong>{" "}
                      players have submitted
                    </p>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(guessedPlayers / players.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  {allGuessesIn && (
                    <div className="all-ready-notice">
                      <p className="highlight">🎉 All players have submitted!</p>
                      <p>You can end the match now or wait for the timer.</p>
                    </div>
                  )}
                  {(timeRemaining === 0 || allGuessesIn) && (
                    <button onClick={finalizeGame} className="btn btn-warning" disabled={loading}>
                      {loading ? "Finalizing..." : "End Match Now"}
                    </button>
                  )}
                </div>
              )}

              {/* Game finished */}
              {currentGame.status === 3 && (
                <div className="results-section">
                  <h3>🎉 Game Finished!</h3>
                  {currentGame.winner !== ethers.ZeroAddress ? (
                    <>
                      <p className="winner-announce">
                        Winner: {currentGame.winner.slice(0, 6)}...{currentGame.winner.slice(-4)}
                      </p>
                      {currentGame.winner.toLowerCase() === account.toLowerCase() && (
                        <p className="you-won">🏆 You Won! 🏆</p>
                      )}
                    </>
                  ) : (
                    <p>No winner (all eliminated)</p>
                  )}

                  {/* Show all player guesses */}
                  {Object.keys(playerGuesses).length > 0 && (
                    <div className="player-guesses">
                      <h4>📊 All Guesses</h4>
                      <div className="guesses-list">
                        {players.map((player) => (
                          <div
                            key={player}
                            className={`guess-item ${
                              player.toLowerCase() === currentGame.winner.toLowerCase() ? "winner" : ""
                            } ${player.toLowerCase() === account.toLowerCase() ? "you" : ""}`}
                          >
                            <span className="player-address">
                              {player.toLowerCase() === account.toLowerCase()
                                ? "You"
                                : `${player.slice(0, 6)}...${player.slice(-4)}`}
                            </span>
                            <span className="player-guess">
                              {playerGuesses[player] !== undefined ? playerGuesses[player] : "No guess"}
                            </span>
                            {player.toLowerCase() === currentGame.winner.toLowerCase() && (
                              <span className="winner-badge">👑</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setView("lobby");
                      setCurrentGame(null);
                      setHasGuessed(false);
                      quickMatch();
                    }}
                    className="btn btn-primary btn-large"
                    disabled={loading}
                  >
                    🔍 Find Another Match
                  </button>
                </div>
              )}

              {/* Rules */}
              <div className="rules-box">
                <h4>Game Rules</h4>
                <ul>
                  <li>🎯 Each player picks a number 0-100</li>
                  <li>📊 Average is calculated</li>
                  <li>🎲 Target = 80% of average</li>
                  <li>🏆 Closest player wins entire prize pool</li>
                  <li>⚠️ Duplicate numbers = ALL eliminated</li>
                  <li>🎮 2 players: Rock-paper-scissors (0&gt;1, 1&gt;100, 100&gt;0)</li>
                  <li>💰 All eliminated = Everyone refunded</li>
                </ul>
              </div>
            </div>
          )}

          {message && <div className="message">{message}</div>}
        </div>
      )}
    </div>
  );
}

export default KingOfDiamonds;
