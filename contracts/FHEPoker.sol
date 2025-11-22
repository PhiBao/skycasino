// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Heads-Up Poker (Texas Hold'em)
/// @author skycasino
/// @notice Two-player poker with encrypted hole cards and betting
/// @dev Uses FHE to hide both players' hole cards until showdown
contract FHEPoker is SepoliaConfig {
    // Game state
    struct Game {
        uint256 gameId;
        address player1;
        address player2;
        uint256 buyIn;
        uint256 pot;
        // Hole cards (encrypted)
        euint8 p1Card1;
        euint8 p1Card2;
        euint8 p2Card1;
        euint8 p2Card2;
        // Community cards (public)
        uint8[5] communityCards;
        uint8 communityCardsRevealed; // 0, 3 (flop), 4 (turn), 5 (river)
        // Game flow
        GameStage stage;
        address currentPlayer; // Whose turn to act
        // Betting
        uint256 player1Bet;
        uint256 player2Bet;
        uint256 player1Stack;
        uint256 player2Stack;
        bool waitingForSecondCheck; // Tracks if one player has checked this street
        // Result
        address winner;
        bool isActive;
        // Timestamps
        uint256 createdAt;
        uint256 lastActionAt;
    }

    enum GameStage {
        Waiting, // Waiting for second player
        PreFlop, // After deal, before flop
        Flop, // 3 community cards shown
        Turn, // 4 community cards shown
        River, // 5 community cards shown
        Showdown, // Reveal and determine winner
        Finished // Game over
    }

    // State
    uint256 public gameCounter;
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerActiveGame; // Player -> active game ID

    // Constants
    uint256 public constant MIN_BUY_IN = 0.001 ether;
    uint256 public constant SMALL_BLIND = 0.0001 ether;
    uint256 public constant BIG_BLIND = 0.0002 ether;
    uint256 public constant WAITING_TIMEOUT = 10 minutes;
    uint256 public constant ACTION_TIMEOUT = 5 minutes;

    // Events
    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 buyIn);
    event PlayerJoined(uint256 indexed gameId, address indexed player2);
    event CardsDealt(uint256 indexed gameId);
    event CommunityCardsRevealed(uint256 indexed gameId, GameStage stage, uint8[] cards);
    event PlayerAction(uint256 indexed gameId, address indexed player, string action, uint256 amount);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 prize);

    /// @notice Create a new poker game
    function createGame() external payable returns (uint256) {
        require(msg.value >= MIN_BUY_IN, "Buy-in too low");

        // Auto-forfeit old game if exists
        uint256 oldGameId = playerActiveGame[msg.sender];
        if (oldGameId > 0) {
            Game storage oldGame = games[oldGameId];
            if (oldGame.isActive) {
                _forfeitGame(oldGameId, msg.sender);
            }
        }

        uint256 gameId = ++gameCounter;
        Game storage game = games[gameId];

        game.gameId = gameId;
        game.player1 = msg.sender;
        game.buyIn = msg.value;
        game.player1Stack = msg.value;
        game.stage = GameStage.Waiting;
        game.isActive = true;
        game.createdAt = block.timestamp;
        game.lastActionAt = block.timestamp;

        playerActiveGame[msg.sender] = gameId;

        emit GameCreated(gameId, msg.sender, msg.value);
        return gameId;
    }

    /// @notice Join an existing game
    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];

        require(game.isActive, "Game not active");
        require(game.stage == GameStage.Waiting, "Game already started");
        require(msg.value == game.buyIn, "Must match buy-in");
        require(msg.sender != game.player1, "Cannot join own game");

        // Auto-forfeit joiner's old game if exists
        uint256 oldGameId = playerActiveGame[msg.sender];
        if (oldGameId > 0) {
            Game storage oldGame = games[oldGameId];
            if (oldGame.isActive) {
                _forfeitGame(oldGameId, msg.sender);
            }
        }

        game.player2 = msg.sender;
        game.player2Stack = msg.value;
        game.lastActionAt = block.timestamp;
        playerActiveGame[msg.sender] = gameId;

        emit PlayerJoined(gameId, msg.sender);

        // Post blinds and deal cards
        _postBlinds(gameId);
        _dealCards(gameId);
    }

    /// @notice Post small blind and big blind
    function _postBlinds(uint256 gameId) internal {
        Game storage game = games[gameId];

        // Player1 posts small blind, Player2 posts big blind
        game.player1Stack -= SMALL_BLIND;
        game.player2Stack -= BIG_BLIND;
        game.player1Bet = SMALL_BLIND;
        game.player2Bet = BIG_BLIND;
        game.pot = SMALL_BLIND + BIG_BLIND;
        game.waitingForSecondCheck = false;

        // Player1 acts first pre-flop (after big blind)
        game.currentPlayer = game.player1;
    }

    /// @notice Deal hole cards to both players
    function _dealCards(uint256 gameId) internal {
        Game storage game = games[gameId];

        // Deal 2 cards to each player (encrypted)
        // In production, use VRF for randomness
        uint8 card1 = _drawCard(gameId, 0);
        uint8 card2 = _drawCard(gameId, 1);
        uint8 card3 = _drawCard(gameId, 2);
        uint8 card4 = _drawCard(gameId, 3);

        // Encrypt hole cards
        game.p1Card1 = FHE.asEuint8(card1);
        game.p1Card2 = FHE.asEuint8(card2);
        game.p2Card1 = FHE.asEuint8(card3);
        game.p2Card2 = FHE.asEuint8(card4);

        // Set permissions (players can only see their own cards)
        FHE.allow(game.p1Card1, game.player1);
        FHE.allow(game.p1Card2, game.player1);
        FHE.allow(game.p2Card1, game.player2);
        FHE.allow(game.p2Card2, game.player2);

        // Deal community cards (not revealed yet)
        for (uint i = 0; i < 5; i++) {
            game.communityCards[i] = _drawCard(gameId, 4 + i);
        }

        game.stage = GameStage.PreFlop;
        emit CardsDealt(gameId);
    }

    /// @notice Simple card draw (in production, use Zama Gateway + VRF)
    function _drawCard(uint256 gameId, uint256 seed) internal view returns (uint8) {
        // Simple pseudo-random for demo (cards 2-14, suits ignored for simplicity)
        // 2-10, J=11, Q=12, K=13, A=14
        return uint8((uint256(keccak256(abi.encodePacked(block.timestamp, gameId, seed, msg.sender))) % 13) + 2);
    }

    /// @notice Player calls (match current bet)
    function call(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(msg.sender == game.currentPlayer, "Not your turn");
        require(game.stage < GameStage.Showdown, "Betting complete");

        uint256 callAmount;
        bool betsWereUnequal = game.player1Bet != game.player2Bet;
        if (msg.sender == game.player1) {
            callAmount = game.player2Bet - game.player1Bet;
            require(game.player1Stack >= callAmount, "Insufficient stack");
            game.player1Stack -= callAmount;
            game.player1Bet += callAmount;
        } else {
            callAmount = game.player1Bet - game.player2Bet;
            require(game.player2Stack >= callAmount, "Insufficient stack");
            game.player2Stack -= callAmount;
            game.player2Bet += callAmount;
        }

        game.pot += callAmount;
        emit PlayerAction(gameId, msg.sender, "call", callAmount);

        // If bets are equal, enforce two checks per street before advancing
        if (game.player1Bet == game.player2Bet) {
            if (!betsWereUnequal && game.waitingForSecondCheck) {
                // Second check -> advance street
                game.waitingForSecondCheck = false;
                _advanceAction(gameId);
            } else if (!betsWereUnequal && !game.waitingForSecondCheck) {
                // First check -> hand over action to opponent
                game.waitingForSecondCheck = true;
                game.currentPlayer = (game.currentPlayer == game.player1) ? game.player2 : game.player1;
            } else {
                // Matched a bet (not a pure check), advance street
                game.waitingForSecondCheck = false;
                _advanceAction(gameId);
            }
        } else {
            // Bets still unequal, next player must respond
            game.currentPlayer = (game.currentPlayer == game.player1) ? game.player2 : game.player1;
        }
    }

    /// @notice Player raises (increase bet)
    function raise(uint256 gameId, uint256 raiseAmount) external {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(msg.sender == game.currentPlayer, "Not your turn");
        require(game.stage < GameStage.Showdown, "Betting complete");

        uint256 totalBet;
        if (msg.sender == game.player1) {
            totalBet = game.player2Bet + raiseAmount;
            uint256 required = totalBet - game.player1Bet;
            require(game.player1Stack >= required, "Insufficient stack");
            game.player1Stack -= required;
            game.player1Bet = totalBet;
            game.pot += required;
            game.currentPlayer = game.player2; // Other player must respond
        } else {
            totalBet = game.player1Bet + raiseAmount;
            uint256 required = totalBet - game.player2Bet;
            require(game.player2Stack >= required, "Insufficient stack");
            game.player2Stack -= required;
            game.player2Bet = totalBet;
            game.pot += required;
            game.currentPlayer = game.player1; // Other player must respond
        }

        game.waitingForSecondCheck = false; // Betting resets check flow
        emit PlayerAction(gameId, msg.sender, "raise", raiseAmount);
    }

    /// @notice Player folds (forfeit)
    function fold(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(msg.sender == game.currentPlayer, "Not your turn");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");

        emit PlayerAction(gameId, msg.sender, "fold", 0);

        // Other player wins
        address winner = (msg.sender == game.player1) ? game.player2 : game.player1;
        _endGame(gameId, winner);
    }

    /// @notice Advance to next action/stage
    function _advanceAction(uint256 gameId) internal {
        Game storage game = games[gameId];

        // Check if betting round complete (bets equal)
        if (game.player1Bet == game.player2Bet) {
            // Move to next stage
            if (game.stage == GameStage.PreFlop) {
                _revealFlop(gameId);
            } else if (game.stage == GameStage.Flop) {
                _revealTurn(gameId);
            } else if (game.stage == GameStage.Turn) {
                _revealRiver(gameId);
            } else if (game.stage == GameStage.River) {
                _showdown(gameId);
            }
        } else {
            // Switch active player
            game.currentPlayer = (game.currentPlayer == game.player1) ? game.player2 : game.player1;
        }
    }

    /// @notice Reveal flop (3 community cards)
    function _revealFlop(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.stage = GameStage.Flop;
        game.communityCardsRevealed = 3;

        // Reset bets for new round
        game.player1Bet = 0;
        game.player2Bet = 0;
        game.currentPlayer = game.player2; // Big blind acts first post-flop in heads-up
        game.waitingForSecondCheck = false;

        uint8[] memory cards = new uint8[](3);
        cards[0] = game.communityCards[0];
        cards[1] = game.communityCards[1];
        cards[2] = game.communityCards[2];

        emit CommunityCardsRevealed(gameId, GameStage.Flop, cards);
    }

    /// @notice Reveal turn (4th community card)
    function _revealTurn(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.stage = GameStage.Turn;
        game.communityCardsRevealed = 4;

        game.player1Bet = 0;
        game.player2Bet = 0;
        game.currentPlayer = game.player2;
        game.waitingForSecondCheck = false;

        uint8[] memory cards = new uint8[](1);
        cards[0] = game.communityCards[3];

        emit CommunityCardsRevealed(gameId, GameStage.Turn, cards);
    }

    /// @notice Reveal river (5th community card)
    function _revealRiver(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.stage = GameStage.River;
        game.communityCardsRevealed = 5;

        game.player1Bet = 0;
        game.player2Bet = 0;
        game.currentPlayer = game.player2;
        game.waitingForSecondCheck = false;

        uint8[] memory cards = new uint8[](1);
        cards[0] = game.communityCards[4];

        emit CommunityCardsRevealed(gameId, GameStage.River, cards);
    }

    /// @notice Showdown - reveal cards and determine winner
    function _showdown(uint256 gameId) internal {
        Game storage game = games[gameId];
        game.stage = GameStage.Showdown;

        // In production, use Gateway to decrypt and compare hands
        // For this demo, we'll use a simplified winner determination

        // Simplified: Higher card wins (not proper poker hand evaluation)
        // In production: decrypt cards via Gateway, evaluate hands properly
        address winner = _determineWinner(gameId);
        _endGame(gameId, winner);
    }

    /// @notice Simplified winner determination (for demo)
    function _determineWinner(uint256 gameId) internal view returns (address) {
        Game storage game = games[gameId];

        // Simplified: Random for demo
        // In production: Use Gateway to decrypt and properly evaluate poker hands
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, gameId)));
        return (rand % 2 == 0) ? game.player1 : game.player2;
    }

    /// @notice End game and distribute pot
    function _endGame(uint256 gameId, address winner) internal {
        Game storage game = games[gameId];

        game.winner = winner;
        game.stage = GameStage.Finished;
        game.isActive = false;

        uint256 prize = game.pot;
        game.pot = 0;

        // Clear player active games
        playerActiveGame[game.player1] = 0;
        playerActiveGame[game.player2] = 0;

        // Transfer prize to winner
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Prize transfer failed");

        emit GameFinished(gameId, winner, prize);
    }

    /// @notice Leave a game (only if game is in Waiting stage)
    function leaveGame(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.player1 == msg.sender || game.player2 == msg.sender, "Not a player in this game");
        require(game.stage == GameStage.Waiting, "Can only leave waiting games");
        require(playerActiveGame[msg.sender] == gameId, "Not your active game");

        // Clear player's active game
        playerActiveGame[msg.sender] = 0;

        // If creator leaves, cancel the game and refund
        if (game.player1 == msg.sender) {
            game.stage = GameStage.Finished;
            game.isActive = false;
            (bool success, ) = msg.sender.call{value: game.player1Stack}("");
            require(success, "Refund failed");
        }
    }

    /// @notice Forfeit a game (internal, called when player creates new game)
    function _forfeitGame(uint256 gameId, address player) internal {
        Game storage game = games[gameId];

        if (!game.isActive) return;

        game.isActive = false;
        game.stage = GameStage.Finished;

        // Determine opponent and winner based on game stage
        if (game.stage == GameStage.Waiting) {
            // In waiting stage, just refund creator
            if (game.player1 == player) {
                playerActiveGame[game.player1] = 0;
                (bool success, ) = game.player1.call{value: game.player1Stack}("");
                require(success, "Refund failed");
            }
        } else {
            // Game in progress - opponent wins
            address opponent = (game.player1 == player) ? game.player2 : game.player1;
            game.winner = opponent;

            uint256 prize = game.pot + game.player1Stack + game.player2Stack;
            game.pot = 0;
            game.player1Stack = 0;
            game.player2Stack = 0;

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
            uint256 pot,
            GameStage stage,
            address currentPlayer,
            uint256 player1Stack,
            uint256 player2Stack,
            uint8[5] memory communityCards,
            uint8 communityCardsRevealed
        )
    {
        Game storage game = games[gameId];
        return (
            game.player1,
            game.player2,
            game.pot,
            game.stage,
            game.currentPlayer,
            game.player1Stack,
            game.player2Stack,
            game.communityCards,
            game.communityCardsRevealed
        );
    }

    /// @notice Get player's hole cards (only callable by the player)
    function getMyCards(uint256 gameId) external view returns (euint8, euint8) {
        Game storage game = games[gameId];
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");

        if (msg.sender == game.player1) {
            return (game.p1Card1, game.p1Card2);
        } else {
            return (game.p2Card1, game.p2Card2);
        }
    }
}
