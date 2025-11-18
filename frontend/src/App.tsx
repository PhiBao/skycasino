import { useState } from "react";
import Blackjack from "./Blackjack";
import KingOfDiamonds from "./KingOfDiamonds";
import "./App.css";

type GameView = "menu" | "blackjack" | "king-of-diamonds";

function App() {
  const [currentView, setCurrentView] = useState<GameView>("menu");

  if (currentView === "blackjack") {
    return <Blackjack onBack={() => setCurrentView("menu")} />;
  }

  if (currentView === "king-of-diamonds") {
    return <KingOfDiamonds onBack={() => setCurrentView("menu")} />;
  }

  // Main Menu
  return (
    <div className="App">
      <div className="menu-container">
        <h1 className="casino-title">🎰 Sky Casino</h1>
        <p className="casino-subtitle">Decentralized Gaming on Blockchain</p>

        <div className="game-grid">
          <div className="game-card" onClick={() => setCurrentView("blackjack")}>
            <div className="game-icon">🃏</div>
            <h2>FHE Blackjack</h2>
            <p>Classic card game with encrypted hands</p>
            <div className="game-stats">
              <span>⚡ Quick Play</span>
              <span>💰 0.0001 ETH</span>
            </div>
          </div>

          <div className="game-card" onClick={() => setCurrentView("king-of-diamonds")}>
            <div className="game-icon">♦️</div>
            <h2>King of Diamonds</h2>
            <p>Beauty Contest - Guess 80% of average</p>
            <div className="game-stats">
              <span>🧠 Strategy</span>
              <span>💰 0.0001 ETH</span>
            </div>
          </div>
        </div>

        <footer className="menu-footer">
          <p>Powered by Zama FHE • Sepolia Testnet</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
