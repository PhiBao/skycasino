// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Coin Flip
/// @author skycasino
/// @notice Two-player coin flip with encrypted choices and instant results
/// @dev Players commit encrypted choices (Heads=0 or Tails=1), winner takes pot
contract FHECoinFlip is SepoliaConfig {
    // Game state
    struct Game {
        uint256 gameId;
        address player1;
        address player2;
        uint256 betAmount;
        // Encrypted choices
        euint8 player1Choice; // 0 = Heads, 1 = Tails
        euint8 player2Choice;
        // Revealed results
        uint8 player1ChoiceRevealed;
        uint8 player2ChoiceRevealed;
        uint8 coinResult; // 0 = Heads, 1 = Tails
        // State
        bool player1Committed;
        bool player2Committed;
        bool isRevealed;
        address winner;
        GameStatus status;
        // Timestamps
        uint256 createdAt;
        uint256 lastActionAt;
    }

    enum GameStatus {
        Waiting, // Waiting for second player
        Committing, // Both players committed
        Revealed, // Result revealed
        Finished // Prize distributed
    }

    // State
    uint256 public gameCounter;
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerActiveGame;

    // Constants
    uint256 public constant MIN_BET = 0.0001 ether;
    uint256 public constant WAITING_TIMEOUT = 10 minutes;
    uint256 public constant ACTION_TIMEOUT = 5 minutes;

    // Events
    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 betAmount);
    event PlayerJoined(uint256 indexed gameId, address indexed player2);
    event ChoiceCommitted(uint256 indexed gameId, address indexed player);
    event GameRevealed(uint256 indexed gameId, uint8 coinResult, address indexed winner);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 prize);

    /// @notice Create a new coin flip game
    function createGame() external payable returns (uint256) {
        require(msg.value >= MIN_BET, "Bet too low");

        // Auto-forfeit old game if exists
        uint256 oldGameId = playerActiveGame[msg.sender];
        if (oldGameId > 0) {
            Game storage oldGame = games[oldGameId];
            if (oldGame.status != GameStatus.Finished) {
                _forfeitGame(oldGameId, msg.sender);
            }
        }

        uint256 gameId = ++gameCounter;
        Game storage game = games[gameId];

        game.gameId = gameId;
        game.player1 = msg.sender;
        game.betAmount = msg.value;
        game.status = GameStatus.Waiting;
        game.createdAt = block.timestamp;
        game.lastActionAt = block.timestamp;

        playerActiveGame[msg.sender] = gameId;

        emit GameCreated(gameId, msg.sender, msg.value);
        return gameId;
    }

    /// @notice Join an existing game
    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];

        require(game.status == GameStatus.Waiting, "Game not available");
        require(msg.value == game.betAmount, "Must match bet amount");
        require(msg.sender != game.player1, "Cannot join own game");

        // Auto-forfeit joiner's old game if exists
        uint256 oldGameId = playerActiveGame[msg.sender];
        if (oldGameId > 0) {
            Game storage oldGame = games[oldGameId];
            if (oldGame.status != GameStatus.Finished) {
                _forfeitGame(oldGameId, msg.sender);
            }
        }

        game.player2 = msg.sender;
        game.status = GameStatus.Committing;
        game.lastActionAt = block.timestamp;

        playerActiveGame[msg.sender] = gameId;

        emit PlayerJoined(gameId, msg.sender);
    }

    /// @notice Submit encrypted choice (0 = Heads, 1 = Tails)
    function submitChoice(uint256 gameId, uint8 choice) external {
        Game storage game = games[gameId];

        require(game.status == GameStatus.Committing, "Not in committing phase");

        // Check if action timeout expired - either player can claim forfeit
        if (block.timestamp > game.lastActionAt + ACTION_TIMEOUT) {
            // Determine who forfeited (whoever hasn't committed)
            address forfeiter;
            address winner;

            if (!game.player1Committed) {
                forfeiter = game.player1;
                winner = game.player2;
            } else if (!game.player2Committed) {
                forfeiter = game.player2;
                winner = game.player1;
            } else {
                revert("Both players committed");
            }

            game.winner = winner;
            game.status = GameStatus.Finished;
            playerActiveGame[game.player1] = 0;
            playerActiveGame[game.player2] = 0;

            // Winner gets the pot
            (bool success, ) = winner.call{value: game.betAmount * 2}("");
            require(success, "Prize transfer failed");

            emit GameFinished(gameId, winner, game.betAmount * 2);
            revert("Opponent forfeited due to timeout");
        }

        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");
        require(choice == 0 || choice == 1, "Invalid choice (0=Heads, 1=Tails)");

        if (msg.sender == game.player1) {
            require(!game.player1Committed, "Already committed");
            game.player1Choice = FHE.asEuint8(choice);
            game.player1Committed = true;
            game.lastActionAt = block.timestamp; // Update timeout
            FHE.allow(game.player1Choice, game.player1);
        } else {
            require(!game.player2Committed, "Already committed");
            game.player2Choice = FHE.asEuint8(choice);
            game.player2Committed = true;
            game.lastActionAt = block.timestamp; // Update timeout
            FHE.allow(game.player2Choice, game.player2);
        }

        emit ChoiceCommitted(gameId, msg.sender);

        // If both committed, reveal
        if (game.player1Committed && game.player2Committed) {
            _revealAndFinish(gameId);
        }
    }

    /// @notice Reveal results and determine winner
    function _revealAndFinish(uint256 gameId) internal {
        Game storage game = games[gameId];

        // Generate coin flip result (0 or 1)
        // In production, use Zama Gateway + VRF for provably fair randomness
        game.coinResult = uint8(
            uint256(
                keccak256(abi.encodePacked(block.timestamp, block.prevrandao, gameId, game.player1, game.player2))
            ) % 2
        );

        game.isRevealed = true;
        game.status = GameStatus.Revealed;

        // Determine winner: if choice matches coin result, you win
        // For demo, we'll use simplified logic
        // In production: use Gateway to decrypt choices and compare properly

        // Simplified winner determination
        address winner = _determineWinner(gameId);
        game.winner = winner;

        emit GameRevealed(gameId, game.coinResult, winner);

        _distributePrize(gameId);
    }

    /// @notice Determine winner (simplified for demo)
    function _determineWinner(uint256 gameId) internal view returns (address) {
        Game storage game = games[gameId];

        // In production: decrypt both choices via Gateway and compare with coin result
        // For demo: random winner
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, gameId, game.coinResult)));
        return (rand % 2 == 0) ? game.player1 : game.player2;
    }

    /// @notice Distribute prize to winner
    function _distributePrize(uint256 gameId) internal {
        Game storage game = games[gameId];

        game.status = GameStatus.Finished;

        uint256 prize = game.betAmount * 2;

        // Clear player active games
        playerActiveGame[game.player1] = 0;
        playerActiveGame[game.player2] = 0;

        // Transfer prize
        (bool success, ) = game.winner.call{value: prize}("");
        require(success, "Prize transfer failed");

        emit GameFinished(gameId, game.winner, prize);
    }

    /// @notice Leave a game (only if game is waiting for opponent)
    function leaveGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.player1 == msg.sender || game.player2 == msg.sender, "Not a player in this game");
        require(game.status == GameStatus.Waiting, "Can only leave waiting games");
        require(playerActiveGame[msg.sender] == gameId, "Not your active game");

        // Clear player's active game
        playerActiveGame[msg.sender] = 0;

        // If creator leaves, cancel the game and refund
        if (game.player1 == msg.sender) {
            game.status = GameStatus.Finished;
            (bool success, ) = msg.sender.call{value: game.betAmount}("");
            require(success, "Refund failed");
        }
    }

    /// @notice Forfeit a game (internal, called when player creates new game)
    function _forfeitGame(uint256 gameId, address player) internal {
        Game storage game = games[gameId];

        if (game.status == GameStatus.Finished) return;

        game.status = GameStatus.Finished;

        // Determine opponent and winner based on game status
        if (game.status == GameStatus.Waiting) {
            // In waiting stage, just refund creator
            if (game.player1 == player) {
                playerActiveGame[game.player1] = 0;
                (bool success, ) = game.player1.call{value: game.betAmount}("");
                require(success, "Refund failed");
            }
        } else {
            // Game in progress - opponent wins
            address opponent = (game.player1 == player) ? game.player2 : game.player1;
            game.winner = opponent;

            uint256 prize = game.betAmount * 2;

            playerActiveGame[game.player1] = 0;
            playerActiveGame[game.player2] = 0;

            (bool success, ) = opponent.call{value: prize}("");
            require(success, "Prize transfer failed");

            emit GameFinished(gameId, opponent, prize);
        }
    }

    /// @notice Get game info
    function getGameInfo(
        uint256 gameId
    )
        external
        view
        returns (
            address player1,
            address player2,
            uint256 betAmount,
            bool player1Committed,
            bool player2Committed,
            bool isRevealed,
            uint8 coinResult,
            address winner,
            GameStatus status
        )
    {
        Game storage game = games[gameId];
        return (
            game.player1,
            game.player2,
            game.betAmount,
            game.player1Committed,
            game.player2Committed,
            game.isRevealed,
            game.coinResult,
            game.winner,
            game.status
        );
    }

    /// @notice Get my choice (only callable by player)
    function getMyChoice(uint256 gameId) external view returns (euint8) {
        Game storage game = games[gameId];
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");

        if (msg.sender == game.player1) {
            return game.player1Choice;
        } else {
            return game.player2Choice;
        }
    }

    /// @notice Cancel game if no one joins (only creator, only if waiting)
    function cancelGame(uint256 gameId) external {
        Game storage game = games[gameId];

        require(game.status == GameStatus.Waiting, "Game already started");
        require(msg.sender == game.player1, "Only creator can cancel");

        game.status = GameStatus.Finished;
        playerActiveGame[game.player1] = 0;

        // Refund bet
        (bool success, ) = game.player1.call{value: game.betAmount}("");
        require(success, "Refund failed");
    }
}
