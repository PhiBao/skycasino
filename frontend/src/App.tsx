import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Blackjack from "./Blackjack";
import Poker from "./Poker";
import CoinFlip from "./CoinFlip";
// import "./App.css"; // Replaced by Tailwind

type GameView = "menu" | "blackjack" | "poker" | "coinflip";

function App() {
  const [currentView, setCurrentView] = useState<GameView>("menu");

  if (currentView === "blackjack") {
    return <Blackjack onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "poker") {
    return <Poker onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "coinflip") {
    return <CoinFlip onBack={() => setCurrentView("menu")} />;
  }

  // Main Menu
  return (
    <div className="min-h-screen w-full bg-[#ffd208] text-black font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold mb-2 drop-shadow-md">🎰 Sky Casino</h1>
            <p className="text-xl text-gray-800">Decentralized Gaming on Blockchain</p>
          </div>
          <ConnectButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Blackjack Card */}
          <div
            className="bg-white rounded-3xl p-8 cursor-pointer border-4 border-black shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
            onClick={() => setCurrentView("blackjack")}
          >
            <div className="text-6xl mb-4">🃏</div>
            <h2 className="text-3xl font-bold mb-2">FHE Blackjack</h2>
            <p className="text-gray-700 mb-6 text-lg">Classic card game with encrypted hands</p>
            <div className="flex justify-between text-sm font-bold text-gray-600">
              <span className="bg-yellow-100 px-3 py-1 rounded-full">⚡ Quick Play</span>
              <span className="bg-green-100 px-3 py-1 rounded-full">💰 0.0001 ETH</span>
            </div>
          </div>

          {/* Poker Card */}
          <div
            className="bg-white rounded-3xl p-8 cursor-pointer border-4 border-black shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
            onClick={() => setCurrentView("poker")}
          >
            <div className="text-6xl mb-4">🃏</div>
            <h2 className="text-3xl font-bold mb-2">FHE Poker</h2>
            <p className="text-gray-700 mb-6 text-lg">Two-player (heads-up) Texas Hold'em with encrypted hole cards</p>
            <div className="flex justify-between text-sm font-bold text-gray-600">
              <span className="bg-purple-100 px-3 py-1 rounded-full">🎲 PvP</span>
              <span className="bg-green-100 px-3 py-1 rounded-full">💰 0.001 ETH</span>
            </div>
          </div>

          {/* Coin Flip Card */}
          <div
            className="bg-white rounded-3xl p-8 cursor-pointer border-4 border-black shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all duration-300"
            onClick={() => setCurrentView("coinflip")}
          >
            <div className="text-6xl mb-4">🪙</div>
            <h2 className="text-3xl font-bold mb-2">FHE Coin Flip</h2>
            <p className="text-gray-700 mb-6 text-lg">Instant PvP with encrypted choices</p>
            <div className="flex justify-between text-sm font-bold text-gray-600">
              <span className="bg-blue-100 px-3 py-1 rounded-full">⚡ Fast</span>
              <span className="bg-green-100 px-3 py-1 rounded-full">💰 0.0001 ETH</span>
            </div>
          </div>
        </div>

        <footer className="text-center text-gray-700 font-medium">
          <p>Powered by Zama FHE • Sepolia Testnet</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
