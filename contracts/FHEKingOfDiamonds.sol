// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title King of Diamonds - Beauty Contest Game
/// @author skycasino
/// @notice A game theory puzzle where players guess a number between 0-100
/// @dev Simplified single-round casino version inspired by Alice in Borderland
///
/// GAME RULES (Simplified for Casino):
/// - 2-5 players per room
/// - Each player picks a number 0-100 within time limit
/// - Players who don't submit are ELIMINATED (forfeit entry fee)
/// - Average is calculated and multiplied by 0.8
/// - Player closest to the target wins
/// - ELIMINATION RULE: If multiple players pick the same number, they are ALL ELIMINATED
///
/// SPECIAL 2-PLAYER RULES (When only 2 valid players remain):
/// - 0 beats 1
/// - 1 beats 100
/// - 100 beats 0
/// - Same number = both eliminated
///
/// This creates a rock-paper-scissors dynamic at the final stage!
///
/// NOTE: Full Alice in Borderland rules include:
/// - Multiple rounds with point tracking (-10 points = death)
/// - Progressive rule unlocks as players eliminated
/// - Exact match bonus (others lose 2 points)
/// This casino version simplifies to single-round winner-takes-all
contract FHEKingOfDiamonds {
    // Game state
    struct Game {
        uint256 gameId;
        address[] players;
        mapping(address => bool) hasJoined;
        mapping(address => uint8) guesses;
        mapping(address => bool) hasGuessed;
        uint256 entryFee;
        uint256 prizePool;
        uint8 minPlayers;
        uint8 maxPlayers;
        uint256 guessDeadline;
        GameStatus status;
        address winner;
        uint256 average;
        uint8 targetNumber; // 80% of average
    }

    enum GameStatus {
        WaitingForPlayers,
        AcceptingGuesses,
        Calculating,
        Finished
    }

    // State variables
    uint256 public gameCounter;
    mapping(uint256 => Game) public games;

    // Configuration
    uint256 public constant GUESS_DURATION = 2 minutes;
    uint256 public constant MIN_ENTRY_FEE = 0.0001 ether;

    // Events
    event GameCreated(
        uint256 indexed gameId,
        address indexed creator,
        uint256 entryFee,
        uint8 minPlayers,
        uint8 maxPlayers
    );
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint256 playerCount);
    event GameStarted(uint256 indexed gameId, uint256 guessDeadline);
    event GuessSubmitted(uint256 indexed gameId, address indexed player, uint8 guess);
    event PlayersEliminated(uint256 indexed gameId, address[] eliminated, uint8 duplicateNumber);
    event PlayersForfeited(uint256 indexed gameId, address[] forfeited);
    event GameFinished(
        uint256 indexed gameId,
        address indexed winner,
        uint256 prize,
        uint8 winningNumber,
        uint8 targetNumber
    );
    event AllGuessesRevealed(uint256 indexed gameId, uint256 average, uint8 targetNumber);

    /// @notice Create a new game room
    /// @param minPlayers Minimum players required (2-5)
    /// @param maxPlayers Maximum players allowed (2-5)
    function createGame(uint8 minPlayers, uint8 maxPlayers) external payable returns (uint256) {
        require(msg.value >= MIN_ENTRY_FEE, "Entry fee too low");
        require(minPlayers >= 2 && minPlayers <= 5, "Min players must be 2-5");
        require(maxPlayers >= minPlayers && maxPlayers <= 5, "Invalid max players");

        uint256 gameId = gameCounter++;
        Game storage game = games[gameId];

        game.gameId = gameId;
        game.entryFee = msg.value;
        game.minPlayers = minPlayers;
        game.maxPlayers = maxPlayers;
        game.status = GameStatus.WaitingForPlayers;

        // Creator automatically joins
        game.players.push(msg.sender);
        game.hasJoined[msg.sender] = true;
        game.prizePool = msg.value;

        emit GameCreated(gameId, msg.sender, msg.value, minPlayers, maxPlayers);
        emit PlayerJoined(gameId, msg.sender, 1);

        return gameId;
    }

    /// @notice Join an existing game
    /// @param gameId The game to join
    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];

        require(game.status == GameStatus.WaitingForPlayers, "Game not accepting players");
        require(msg.value == game.entryFee, "Incorrect entry fee");
        require(!game.hasJoined[msg.sender], "Already joined");
        require(game.players.length < game.maxPlayers, "Game is full");

        game.players.push(msg.sender);
        game.hasJoined[msg.sender] = true;
        game.prizePool += msg.value;

        emit PlayerJoined(gameId, msg.sender, game.players.length);

        // Auto-start if we reach max players
        if (game.players.length == game.maxPlayers) {
            _startGame(gameId);
        }
    }

    /// @notice Start the game (can be called by any player if min players reached)
    /// @param gameId The game to start
    function startGame(uint256 gameId) external {
        Game storage game = games[gameId];

        require(game.status == GameStatus.WaitingForPlayers, "Game already started");
        require(game.hasJoined[msg.sender], "Not a player");
        require(game.players.length >= game.minPlayers, "Not enough players");

        _startGame(gameId);
    }

    /// @notice Internal function to start the game
    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];

        game.status = GameStatus.AcceptingGuesses;
        game.guessDeadline = block.timestamp + GUESS_DURATION;

        emit GameStarted(gameId, game.guessDeadline);
    }

    /// @notice Submit your guess (0-100)
    /// @param gameId The game ID
    /// @param guess Your guess between 0 and 100
    function submitGuess(uint256 gameId, uint8 guess) external {
        Game storage game = games[gameId];

        require(game.status == GameStatus.AcceptingGuesses, "Not accepting guesses");
        require(game.hasJoined[msg.sender], "Not a player");
        require(!game.hasGuessed[msg.sender], "Already guessed");
        require(block.timestamp < game.guessDeadline, "Guess deadline passed");
        require(guess <= 100, "Guess must be 0-100");

        // Store the guess
        game.guesses[msg.sender] = guess;
        game.hasGuessed[msg.sender] = true;

        emit GuessSubmitted(gameId, msg.sender, guess);

        // Auto-finalize if all players have guessed
        bool allGuessed = true;
        for (uint i = 0; i < game.players.length; i++) {
            if (!game.hasGuessed[game.players[i]]) {
                allGuessed = false;
                break;
            }
        }

        if (allGuessed) {
            _calculateWinner(gameId);
        }
    }

    /// @notice Finalize game after deadline (anyone can call)
    /// @param gameId The game to finalize
    function finalizeGame(uint256 gameId) external {
        Game storage game = games[gameId];

        require(game.status == GameStatus.AcceptingGuesses, "Game not in progress");
        require(block.timestamp >= game.guessDeadline, "Deadline not reached");

        _calculateWinner(gameId);
    }

    /// @notice Internal function to calculate winner
    function _calculateWinner(uint256 gameId) internal {
        Game storage game = games[gameId];

        require(game.status == GameStatus.AcceptingGuesses, "Invalid game status");

        game.status = GameStatus.Calculating;

        // STEP 0: Identify players who didn't submit (forfeited)
        address[] memory forfeited = new address[](game.players.length);
        uint256 forfeitedCount = 0;

        for (uint i = 0; i < game.players.length; i++) {
            if (!game.hasGuessed[game.players[i]]) {
                forfeited[forfeitedCount] = game.players[i];
                forfeitedCount++;
            }
        }

        if (forfeitedCount > 0) {
            address[] memory forfeitedArray = new address[](forfeitedCount);
            for (uint i = 0; i < forfeitedCount; i++) {
                forfeitedArray[i] = forfeited[i];
            }
            emit PlayersForfeited(gameId, forfeitedArray);
        }

        // Collect all guesses from players who submitted
        address[] memory activePlayers = new address[](game.players.length);
        uint8[] memory activeGuesses = new uint8[](game.players.length);
        uint256 activeCount = 0;

        for (uint i = 0; i < game.players.length; i++) {
            address player = game.players[i];
            if (game.hasGuessed[player]) {
                activePlayers[activeCount] = player;
                activeGuesses[activeCount] = game.guesses[player];
                activeCount++;
            }
        }

        // If 0 or 1 player submitted, game cannot proceed normally
        if (activeCount == 0) {
            // No one submitted - refund everyone
            game.status = GameStatus.Finished;
            uint256 refundAmount = game.prizePool / game.players.length;
            game.prizePool = 0;

            for (uint i = 0; i < game.players.length; i++) {
                (bool refundSuccess, ) = game.players[i].call{value: refundAmount}("");
                require(refundSuccess, "Refund failed");
            }

            emit GameFinished(gameId, address(0), 0, 0, 0);
            return;
        }

        if (activeCount == 1) {
            // Only one player submitted - they win by default (others forfeited)
            address winnerAddress = activePlayers[0];
            game.winner = winnerAddress;
            game.status = GameStatus.Finished;

            uint256 prizeAmount = game.prizePool;
            game.prizePool = 0;

            (bool winSuccess, ) = winnerAddress.call{value: prizeAmount}("");
            require(winSuccess, "Prize transfer failed");

            emit GameFinished(gameId, winnerAddress, prizeAmount, activeGuesses[0], 0);
            return;
        }

        // STEP 1: Eliminate players with duplicate guesses
        address[] memory eliminated = new address[](activeCount);
        uint256 eliminatedCount = 0;

        for (uint i = 0; i < activeCount; i++) {
            bool isDuplicate = false;
            for (uint j = 0; j < activeCount; j++) {
                if (i != j && activeGuesses[i] == activeGuesses[j]) {
                    isDuplicate = true;
                    break;
                }
            }
            if (isDuplicate) {
                eliminated[eliminatedCount] = activePlayers[i];
                eliminatedCount++;
            }
        }

        // Emit elimination event if anyone was eliminated
        if (eliminatedCount > 0) {
            address[] memory eliminatedArray = new address[](eliminatedCount);
            for (uint i = 0; i < eliminatedCount; i++) {
                eliminatedArray[i] = eliminated[i];
            }
            // Find the duplicate number for event
            uint8 duplicateNum = 0;
            for (uint i = 0; i < activeCount; i++) {
                for (uint j = i + 1; j < activeCount; j++) {
                    if (activeGuesses[i] == activeGuesses[j]) {
                        duplicateNum = activeGuesses[i];
                        break;
                    }
                }
                if (duplicateNum > 0) break;
            }
            emit PlayersEliminated(gameId, eliminatedArray, duplicateNum);
        }

        // STEP 2: Filter out eliminated players
        address[] memory validPlayers = new address[](activeCount);
        uint8[] memory validGuesses = new uint8[](activeCount);
        uint256 validCount = 0;

        for (uint i = 0; i < activeCount; i++) {
            bool isEliminated = false;
            for (uint j = 0; j < eliminatedCount; j++) {
                if (activePlayers[i] == eliminated[j]) {
                    isEliminated = true;
                    break;
                }
            }
            if (!isEliminated) {
                validPlayers[validCount] = activePlayers[i];
                validGuesses[validCount] = activeGuesses[i];
                validCount++;
            }
        }

        // If everyone eliminated or only 1 player left, handle special cases
        if (validCount == 0) {
            // Everyone eliminated - return entry fees to all
            game.status = GameStatus.Finished;
            uint256 refundAmount = game.prizePool / activeCount;
            game.prizePool = 0;

            for (uint i = 0; i < activeCount; i++) {
                (bool refundOk, ) = activePlayers[i].call{value: refundAmount}("");
                require(refundOk, "Refund failed");
            }

            emit GameFinished(gameId, address(0), 0, 0, 0);
            return;
        }

        if (validCount == 1) {
            // Only one player remains - they win by default
            address soleWinner = validPlayers[0];
            game.winner = soleWinner;
            game.status = GameStatus.Finished;

            uint256 solePrize = game.prizePool;
            game.prizePool = 0;

            (bool soleSuccess, ) = soleWinner.call{value: solePrize}("");
            require(soleSuccess, "Prize transfer failed");

            emit GameFinished(gameId, soleWinner, solePrize, validGuesses[0], 0);
            return;
        }

        // STEP 3: Calculate winner based on 80% rule
        // Special case: If exactly 2 players remain after elimination, use rock-paper-scissors rules
        if (validCount == 2) {
            _calculate2PlayerWinner(gameId, validPlayers, validGuesses);
            return;
        }

        // Standard 3-4 player rules: closest to 80% of average
        uint256 sum = 0;
        for (uint i = 0; i < validCount; i++) {
            sum += validGuesses[i];
        }

        uint256 average = sum / validCount;
        uint256 target = (average * 80) / 100;
        uint8 targetNumber = uint8(target);

        game.average = average;
        game.targetNumber = targetNumber;

        emit AllGuessesRevealed(gameId, average, targetNumber);

        // Find player closest to target
        address winner;
        uint8 minDistance = 255;

        for (uint i = 0; i < validCount; i++) {
            uint8 distance;
            if (validGuesses[i] > targetNumber) {
                distance = validGuesses[i] - targetNumber;
            } else {
                distance = targetNumber - validGuesses[i];
            }

            if (distance < minDistance) {
                minDistance = distance;
                winner = validPlayers[i];
            }
        }

        require(winner != address(0), "No winner found");

        // Distribute prize
        game.winner = winner;
        game.status = GameStatus.Finished;

        uint256 prize = game.prizePool;
        game.prizePool = 0;

        (bool success, ) = winner.call{value: prize}("");
        require(success, "Prize transfer failed");

        uint8 winningNumber = game.guesses[winner];
        emit GameFinished(gameId, winner, prize, winningNumber, targetNumber);
    }

    /// @notice Special calculation for 2-player endgame (rock-paper-scissors rules)
    /// 0 beats 1, 1 beats 100, 100 beats 0
    function _calculate2PlayerWinner(uint256 gameId, address[] memory players, uint8[] memory guesses) internal {
        Game storage game = games[gameId];

        uint8 guess1 = guesses[0];
        uint8 guess2 = guesses[1];

        address winner;

        // Rock-paper-scissors logic
        if ((guess1 == 0 && guess2 == 1) || (guess1 == 1 && guess2 == 100) || (guess1 == 100 && guess2 == 0)) {
            winner = players[0];
        } else if ((guess2 == 0 && guess1 == 1) || (guess2 == 1 && guess1 == 100) || (guess2 == 100 && guess1 == 0)) {
            winner = players[1];
        } else {
            // Standard distance calculation for other numbers
            uint256 sum = uint256(guess1) + uint256(guess2);
            uint256 average = sum / 2;
            uint256 target = (average * 80) / 100;
            uint8 targetNumber = uint8(target);

            uint256 dist1 = guess1 > targetNumber
                ? uint256(guess1) - uint256(targetNumber)
                : uint256(targetNumber) - uint256(guess1);
            uint256 dist2 = guess2 > targetNumber
                ? uint256(guess2) - uint256(targetNumber)
                : uint256(targetNumber) - uint256(guess2);

            winner = dist1 <= dist2 ? players[0] : players[1];
            game.average = average;
            game.targetNumber = targetNumber;
        }

        game.winner = winner;
        game.status = GameStatus.Finished;

        uint256 prize = game.prizePool;
        game.prizePool = 0;

        (bool success, ) = winner.call{value: prize}("");
        require(success, "Prize transfer failed");

        emit GameFinished(gameId, winner, prize, game.guesses[winner], game.targetNumber);
    }

    /// @notice Get game details
    function getGameInfo(
        uint256 gameId
    )
        external
        view
        returns (
            uint256 id,
            uint256 playerCount,
            uint256 entryFee,
            uint256 prizePool,
            uint8 minPlayers,
            uint8 maxPlayers,
            GameStatus status,
            uint256 guessDeadline,
            address winner
        )
    {
        Game storage game = games[gameId];
        return (
            game.gameId,
            game.players.length,
            game.entryFee,
            game.prizePool,
            game.minPlayers,
            game.maxPlayers,
            game.status,
            game.guessDeadline,
            game.winner
        );
    }

    /// @notice Get all players in a game
    function getPlayers(uint256 gameId) external view returns (address[] memory) {
        return games[gameId].players;
    }

    /// @notice Check if player has guessed
    function hasPlayerGuessed(uint256 gameId, address player) external view returns (bool) {
        return games[gameId].hasGuessed[player];
    }

    /// @notice Get player's guess (only after they've submitted)
    function getPlayerGuess(uint256 gameId, address player) external view returns (uint8) {
        Game storage game = games[gameId];
        require(game.hasGuessed[player], "Player hasn't guessed");
        return game.guesses[player];
    }

    /// @notice Get game results (only after finished)
    function getGameResults(
        uint256 gameId
    ) external view returns (address winner, uint8 targetNumber, uint256 average, uint256 prize) {
        Game storage game = games[gameId];
        require(game.status == GameStatus.Finished, "Game not finished");

        return (
            game.winner,
            game.targetNumber,
            game.average,
            0 // Prize already distributed
        );
    }

    /// @notice Get all guesses (visible once submitted)
    function getAllGuesses(uint256 gameId) external view returns (address[] memory players, uint8[] memory guesses) {
        Game storage game = games[gameId];

        uint256 count = game.players.length;
        players = new address[](count);
        guesses = new uint8[](count);

        for (uint i = 0; i < count; i++) {
            address player = game.players[i];
            players[i] = player;

            if (game.hasGuessed[player]) {
                guesses[i] = game.guesses[player];
            } else {
                guesses[i] = 255; // Marker for "didn't guess"
            }
        }

        return (players, guesses);
    }
}
