import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESS } from "./config";
import contractABI from "./FHEBlackjack.abi.json";
// import "./Blackjack.css"; // Replaced by Tailwind

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

interface BlackjackProps {
  onBack: () => void;
}

function Blackjack({ onBack }: BlackjackProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [betAmount, setBetAmount] = useState("0.0001");

  // Load current game state
  const loadGameState = async () => {
    if (!address || !publicClient) return;

    try {
      // We can't easily use useReadContract for everything because we need to orchestrate multiple calls
      // and some might fail if game is not active.
      // So we use publicClient.readContract

      // Re-fetch status first
      const statusResult = (await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: contractABI,
        functionName: "getGameStatus",
        account: address,
      })) as [boolean, boolean];

      const [isActive, playerStood] = statusResult;

      if (isActive || !isActive) {
        // Get game info
        const playerHand = (await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: contractABI,
          functionName: "getPlayerHand",
          account: address,
        })) as number[];

        const dealerUpCard = (await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: contractABI,
          functionName: "getDealerUpCard",
          account: address,
        })) as number;

        // Convert BigInt array to number array (viem returns BigInts usually, but let's handle it)
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
      // No active game or error loading state (suppressed)
    }
  };

  // Initial load
  useEffect(() => {
    if (isConnected && address) {
      loadGameState();
    }
  }, [isConnected, address]);

  // Calculate hand value
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

  const handleTx = async (action: () => Promise<`0x${string}`>, actionName: string) => {
    try {
      setLoading(true);
      setMessage(`${actionName}...`);

      const hash = await action();
      setMessage(`Transaction sent: ${hash.slice(0, 10)}...`);

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      if (receipt?.status === "success") {
        setMessage(`${actionName} confirmed!`);
        await loadGameState();

        // Check if game ended by checking if we can get dealer hand
        try {
          const dealerHand = (await publicClient?.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: contractABI,
            functionName: "getDealerHand",
            account: address,
          })) as number[];

          if (dealerHand && dealerHand.length > 0) {
            setGameState((prev) =>
              prev
                ? {
                    ...prev,
                    dealerCards: Array.from(dealerHand).map((c: any) => Number(c)),
                    isActive: false,
                  }
                : null,
            );
            setMessage("Game Over!");
          }
        } catch (e) {
          // Game probably still active
        }
      } else {
        setMessage("Transaction failed");
      }
    } catch (error: any) {
      // Error performing action (suppressed)
      setMessage(`Error: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const startGame = () =>
    handleTx(
      () =>
        writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: contractABI,
          functionName: "startGame",
          value: parseEther(betAmount),
        }),
      "Starting game",
    );

  const hit = () =>
    handleTx(
      () =>
        writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: contractABI,
          functionName: "hit",
        }),
      "Drawing card",
    );

  const stand = () =>
    handleTx(
      () =>
        writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: contractABI,
          functionName: "stand",
        }),
      "Standing",
    );

  // Render a card
  const renderCard = (value: number, suit?: string) => {
    const displayValue = CARD_NAMES[value] || value.toString();
    const cardSuit = suit || SUITS[Math.floor(Math.random() * SUITS.length)];
    const isRed = cardSuit === "♥" || cardSuit === "♦";

    return (
      <div
        className={`w-16 h-24 bg-white rounded-lg border-2 border-gray-300 flex flex-col justify-center items-center shadow-md m-1 ${isRed ? "text-red-600" : "text-black"}`}
      >
        <div className="text-xl font-bold">
          {displayValue} <span className="text-lg">{cardSuit}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#ffd208] text-black p-4 flex flex-col items-center font-sans">
      <button
        onClick={onBack}
        className="self-start mb-4 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors font-bold"
      >
        ← Back to Menu
      </button>

      <h1 className="text-5xl font-bold mb-8 text-black drop-shadow-sm">🎰 Blackjack on FHEVM</h1>

      {!isConnected ? (
        <div className="text-center mt-20">
          <p className="text-xl mb-4 font-bold">Please connect your wallet to play</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white p-8 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border-4 border-black">
          <div className="flex justify-between items-center mb-8 bg-gray-100 p-4 rounded-xl border-2 border-black">
            <span className="font-mono font-bold text-lg">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>

          {/* Game Table */}
          <div className="flex flex-col gap-12 mb-12">
            {/* Dealer's Hand */}
            <div className="flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-4">Dealer</h3>
              {gameState && (
                <div className="flex flex-col items-center">
                  <div className="flex gap-2 mb-2">
                    {/* Show all dealer cards if game ended, otherwise show one up and one hidden */}
                    {!gameState.isActive && gameState.dealerCards ? (
                      gameState.dealerCards.map((card, idx) => <div key={idx}>{renderCard(card)}</div>)
                    ) : (
                      <>
                        {renderCard(gameState.dealerUpCard)}
                        <div className="w-16 h-24 bg-black rounded-lg border-2 border-gray-800 flex justify-center items-center shadow-md m-1">
                          <span className="text-2xl text-white">🂠</span>
                        </div>
                      </>
                    )}
                  </div>
                  {!gameState.isActive && gameState.dealerCards && (
                    <div className="text-lg font-bold">Total: {calculateHandValue(gameState.dealerCards)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Player's Hand */}
            <div className="flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-4">Your Hand</h3>
              {gameState && gameState.playerCards.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="flex gap-2 mb-2">
                    {gameState.playerCards.map((card, idx) => (
                      <div key={idx}>{renderCard(card)}</div>
                    ))}
                  </div>
                  <div className="text-lg font-bold">Total: {gameState.playerTotal}</div>
                  {gameState.playerTotal > 21 && (
                    <div className="text-red-600 font-bold text-2xl mt-2 animate-bounce">BUST!</div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 italic font-medium">No active game</div>
              )}
            </div>
          </div>

          {/* Game Result */}
          {gameState && !gameState.isActive && (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white bg-black inline-block px-8 py-4 rounded-xl shadow-lg">
                {gameState.playerTotal > 21
                  ? "Player Busts!"
                  : gameState.dealerCards && calculateHandValue(gameState.dealerCards) > 21
                    ? "Dealer Busts! You Win!"
                    : gameState.dealerCards && gameState.playerTotal > calculateHandValue(gameState.dealerCards)
                      ? "You Win!"
                      : gameState.dealerCards && gameState.playerTotal < calculateHandValue(gameState.dealerCards)
                        ? "Dealer Wins!"
                        : "Push (Tie)"}
              </h2>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {!gameState || !gameState.isActive ? (
              <div className="flex gap-4 items-center bg-gray-100 p-4 rounded-xl border-2 border-black">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Bet (ETH)"
                  min="0.0001"
                  step="0.0001"
                  disabled={loading}
                  className="bg-white border-2 border-black rounded px-4 py-2 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black w-32 font-bold"
                />
                <button
                  onClick={startGame}
                  disabled={loading}
                  className="bg-[#ffd208] hover:bg-yellow-400 text-black border-2 border-black font-bold py-2 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                >
                  {loading ? "Starting..." : "Start Game"}
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={hit}
                  disabled={loading || !gameState.isActive}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                >
                  {loading ? "..." : "Hit 🎴"}
                </button>
                <button
                  onClick={stand}
                  disabled={loading || !gameState.isActive}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                >
                  {loading ? "..." : "Stand ✋"}
                </button>
              </div>
            )}
          </div>

          {/* Message */}
          {message && <div className="mt-6 text-center p-3 bg-black text-white rounded-lg font-bold">{message}</div>}

          {/* Instructions */}
          <div className="mt-12 text-sm text-gray-600 bg-gray-100 p-6 rounded-xl border-2 border-gray-200">
            <h3 className="font-bold text-black mb-2 text-lg">How to Play:</h3>
            <ul className="list-disc list-inside space-y-1 font-medium">
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
