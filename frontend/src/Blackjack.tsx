import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, NETWORK_CONFIG } from "./config";
import contractABI from "./FHEBlackjack.abi.json";
import "./Blackjack.css";

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Card symbols
const CARD_NAMES: { [key: number]: string } = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

const SUITS = ["♠", "♥", "♦", "♣"];

interface GameState {
  playerCards: number[];
  dealerUpCard: number;
  dealerCards?: number[]; // Full dealer hand after game ends
  playerTotal: number;
  isActive: boolean;
  playerStood: boolean;
  gameResult?: string;
  dealerTotal?: number;
}

function Blackjack() {
  const [account, setAccount] = useState<string>("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [betAmount, setBetAmount] = useState("0.00001");

  // Check and switch network if needed
  const checkAndSwitchNetwork = async () => {
    try {
      if (!window.ethereum) return false;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      if (currentChainId !== NETWORK_CONFIG.chainId) {
        setMessage(`Wrong network detected. Switching to ${NETWORK_CONFIG.chainName}...`);

        try {
          // Try to switch to Sepolia
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
          });
          setMessage(`Switched to ${NETWORK_CONFIG.chainName}!`);
          return true;
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                    chainName: NETWORK_CONFIG.chainName,
                    rpcUrls: [NETWORK_CONFIG.rpcUrl],
                    nativeCurrency: {
                      name: "Sepolia ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
              setMessage(`${NETWORK_CONFIG.chainName} network added and switched!`);
              return true;
            } catch (addError: any) {
              console.error("Error adding network:", addError);
              setMessage(`Error: ${addError.message}`);
              return false;
            }
          }
          console.error("Error switching network:", switchError);
          setMessage(`Error: ${switchError.message}`);
          return false;
        }
      }
      return true;
    } catch (error: any) {
      console.error("Error checking network:", error);
      return false;
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      // Check and switch network first
      const networkOk = await checkAndSwitchNetwork();
      if (!networkOk) {
        setMessage("Please switch to Sepolia network to continue");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      setAccount(accounts[0]);
      setContract(contract);
      setMessage("Wallet connected!");

      // Load current game state if any
      await loadGameState(contract);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount("");
    setContract(null);
    setGameState(null);
    setMessage("Wallet disconnected");
  };

  // Load current game state
  const loadGameState = async (contractInstance?: ethers.Contract) => {
    try {
      const c = contractInstance || contract;
      if (!c) return;

      const [isActive, playerStood] = await c.getGameStatus();

      if (isActive || !isActive) {
        // Get game info even if not active (to show final state)
        const playerHand = await c.getPlayerHand();
        const dealerUpCard = await c.getDealerUpCard();

        // Convert BigInt array to number array
        const playerCards = Array.from(playerHand).map((card: any) => Number(card));

        // Calculate hand value
        const playerTotal = calculateHandValue(playerCards);

        setGameState({
          playerCards,
          dealerUpCard: Number(dealerUpCard),
          playerTotal,
          isActive,
          playerStood,
        });
      }
    } catch (error) {
      console.log("No active game or error loading state");
    }
  };

  // Calculate hand value (same logic as contract)
  const calculateHandValue = (cards: number[]): number => {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card === 1) {
        aces++;
        total += 11;
      } else if (card > 10) {
        total += 10;
      } else {
        total += card;
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  };

  // Start a new game
  const startGame = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setMessage("Starting game...");

      const bet = ethers.parseEther(betAmount);
      const tx = await contract.startGame({ value: bet });
      const receipt = await tx.wait();

      // Check if game ended immediately (instant blackjack or dealer blackjack)
      const event = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e && e.name === "GameEnded");

      if (event) {
        // Game ended immediately
        const { dealerTotal, result } = event.args;

        // Fetch dealer's complete hand (all cards)
        let dealerFullHand: number[] = [];
        try {
          const dealerHand = await contract.getDealerHand();
          dealerFullHand = Array.from(dealerHand).map((card: any) => Number(card));
        } catch (err) {
          console.log("Could not fetch dealer hand");
        }

        await loadGameState();
        setGameState((prev) => ({
          ...prev!,
          isActive: false,
          dealerCards: dealerFullHand,
          dealerTotal: Number(dealerTotal),
          gameResult: result,
        }));
        setMessage(`Game Over! ${result}`);
      } else {
        // Game continues
        setMessage("Game started!");
        await loadGameState();
      }
    } catch (error: any) {
      console.error("Error starting game:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Hit - draw another card
  const hit = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setMessage("Drawing card...");

      const tx = await contract.hit();
      const receipt = await tx.wait();

      // Check if game ended (bust or blackjack)
      const event = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e && e.name === "GameEnded");

      if (event) {
        // Game ended (player busted or got 21)
        const { dealerTotal, result } = event.args;

        // Fetch dealer's complete hand (all cards)
        let dealerFullHand: number[] = [];
        try {
          const dealerHand = await contract.getDealerHand();
          dealerFullHand = Array.from(dealerHand).map((card: any) => Number(card));
        } catch (err) {
          console.log("Could not fetch dealer hand");
        }

        await loadGameState();
        setGameState((prev) => ({
          ...prev!,
          isActive: false,
          dealerCards: dealerFullHand,
          dealerTotal: Number(dealerTotal),
          gameResult: result,
        }));
        setMessage(`Game Over! ${result}`);
      } else {
        // Game continues
        setMessage("Card drawn!");
        await loadGameState();
      }
    } catch (error: any) {
      console.error("Error hitting:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Stand - end turn
  const stand = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setMessage("Standing...");

      const tx = await contract.stand();
      const receipt = await tx.wait();

      // Parse GameEnded event
      const event = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e && e.name === "GameEnded");

      if (event) {
        const { dealerTotal, result } = event.args;

        // Fetch dealer's complete hand (all cards)
        let dealerFullHand: number[] = [];
        try {
          const dealerHand = await contract.getDealerHand();
          dealerFullHand = Array.from(dealerHand).map((card: any) => Number(card));
        } catch (err) {
          console.log("Could not fetch dealer hand");
        }
        setGameState((prev) => ({
          ...prev!,
          isActive: false,
          playerStood: true,
          dealerCards: dealerFullHand,
          dealerTotal: Number(dealerTotal),
          gameResult: result,
        }));
        setMessage(`Game Over! ${result}`);
      }
    } catch (error: any) {
      console.error("Error standing:", error);
      setMessage(`Error: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render a card
  const renderCard = (value: number, suit?: string) => {
    const displayValue = CARD_NAMES[value] || value.toString();
    const cardSuit = suit || SUITS[Math.floor(Math.random() * SUITS.length)];
    const isRed = cardSuit === "♥" || cardSuit === "♦";

    return (
      <div className={`card ${isRed ? "red" : "black"}`}>
        <div className="card-value">
          {displayValue}
          <span className="card-suit">{cardSuit}</span>
        </div>
      </div>
    );
  };

  // Listen for network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = () => {
      // Reload the page when chain changes (recommended by MetaMask)
      window.location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        setAccount("");
        setContract(null);
        setGameState(null);
        setMessage("Wallet disconnected");
      } else if (accounts[0] !== account) {
        // User switched account
        setAccount(accounts[0]);
        setMessage("Account changed. Please reconnect.");
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

  return (
    <div className="blackjack-container">
      <h1>🎰 Blackjack on FHEVM</h1>

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
            <button onClick={disconnectWallet} className="btn btn-disconnect">
              Disconnect
            </button>
          </div>

          {/* Game Table */}
          <div className="game-table">
            {/* Dealer's Hand */}
            <div className="hand dealer-hand">
              <h3>Dealer</h3>
              {gameState && (
                <>
                  <div className="cards">
                    {/* Show all dealer cards if game ended, otherwise show one up and one hidden */}
                    {!gameState.isActive && gameState.dealerCards ? (
                      // Game ended - show all dealer cards
                      gameState.dealerCards.map((card, idx) => <span key={idx}>{renderCard(card)}</span>)
                    ) : (
                      // Game active - show one up card and one face down
                      <>
                        {renderCard(gameState.dealerUpCard)}
                        <div className="card card-back">🂠</div>
                      </>
                    )}
                  </div>
                  {/* Show dealer total after game ends */}
                  {!gameState.isActive && gameState.dealerTotal && (
                    <div className="hand-total">Total: {gameState.dealerTotal}</div>
                  )}
                </>
              )}
            </div>

            {/* Player's Hand */}
            <div className="hand player-hand">
              <h3>Your Hand</h3>
              {gameState && gameState.playerCards.length > 0 ? (
                <>
                  <div className="cards">
                    {gameState.playerCards.map((card, idx) => (
                      <span key={idx}>{renderCard(card)}</span>
                    ))}
                  </div>
                  <div className="hand-total">Total: {gameState.playerTotal}</div>
                  {gameState.playerTotal > 21 && <div className="bust">BUST!</div>}
                </>
              ) : (
                <div className="no-game">No active game</div>
              )}
            </div>
          </div>

          {/* Game Result */}
          {gameState && !gameState.isActive && gameState.gameResult && (
            <div className="game-result">
              <h2>{gameState.gameResult}</h2>
            </div>
          )}

          {/* Controls */}
          <div className="controls">
            {!gameState || !gameState.isActive ? (
              <div className="start-controls">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Bet amount (ETH)"
                  min="0.1"
                  step="0.1"
                  disabled={loading}
                  className="bet-input"
                />
                <button onClick={startGame} disabled={loading} className="btn btn-success btn-large">
                  {loading ? "Starting..." : "Start Game"}
                </button>
              </div>
            ) : (
              <div className="action-buttons">
                <button onClick={hit} disabled={loading || !gameState.isActive} className="btn btn-warning">
                  {loading ? "..." : "Hit 🎴"}
                </button>
                <button onClick={stand} disabled={loading || !gameState.isActive} className="btn btn-danger">
                  {loading ? "..." : "Stand ✋"}
                </button>
              </div>
            )}
          </div>

          {/* Message */}
          {message && <div className="message">{message}</div>}

          {/* Instructions */}
          <div className="instructions">
            <h3>How to Play:</h3>
            <ul>
              <li>🎯 Goal: Get as close to 21 as possible without going over</li>
              <li>🃏 Face cards (J, Q, K) = 10 points</li>
              <li>🅰️ Aces = 11 or 1 (whichever is better)</li>
              <li>▶️ Hit: Draw another card</li>
              <li>✋ Stand: End your turn, dealer plays</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Blackjack;
