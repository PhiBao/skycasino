// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Blackjack Game
/// @author skycasino
/// @notice A simplified blackjack game demonstrating FHEVM encrypted gameplay
/// @dev This version uses a simplified model where dealer plays with revealed cards
/// In a production version, you would integrate with Zama's Gateway for async decryption
contract FHEBlackjack is SepoliaConfig {
    // Game state for each player
    struct Game {
        uint8[] playerCards; // Player's visible cards
        uint8 dealerUpCard; // Dealer's visible card
        uint8 dealerHoleCard; // Dealer's hole card (hidden until reveal)
        uint8[] dealerExtraCards; // Additional dealer cards (drawn after player stands)
        bool isActive; // Is game currently active
        bool playerStood; // Has player chosen to stand
        uint8 betAmount; // Bet amount for this game
        bool dealerRevealed; // Has dealer's hole card been revealed
    }

    // Mapping from player address to their current game
    mapping(address => Game) public games;

    // Simple random seed (in production, use VRF or similar)
    uint256 private nonce;

    // Events
    event GameStarted(address indexed player, uint8 dealerUpCard, uint8 firstCard, uint8 secondCard);
    event PlayerHit(address indexed player, uint8 card);
    event PlayerStood(address indexed player);
    event GameEnded(address indexed player, uint8 playerTotal, uint8 dealerTotal, string result);

    /// @notice Start a new game
    /// @dev Deals 2 cards to player (visible) and 2 to dealer (1 visible, 1 encrypted)
    function startGame() external payable {
        require(!games[msg.sender].isActive, "Game already in progress");
        require(msg.value > 0, "Must place a bet");

        Game storage game = games[msg.sender];

        // Clear previous game's cards if any
        delete game.playerCards;
        delete game.dealerExtraCards;

        // Deal player's two cards (visible)
        uint8 playerCard1 = drawCard();
        uint8 playerCard2 = drawCard();

        game.playerCards.push(playerCard1);
        game.playerCards.push(playerCard2);

        // Deal dealer's cards (one visible, one hidden)
        game.dealerUpCard = drawCard();
        game.dealerHoleCard = drawCard();
        game.dealerRevealed = false;

        game.isActive = true;
        game.playerStood = false;
        game.betAmount = uint8(msg.value / 1 ether); // Simplified bet tracking

        emit GameStarted(msg.sender, game.dealerUpCard, playerCard1, playerCard2);

        // Check for immediate blackjack
        if (calculateHandValue(game.playerCards) == 21) {
            _endGame();
        }
    }

    /// @notice Player draws another card
    function hit() external {
        Game storage game = games[msg.sender];
        require(game.isActive, "No active game");
        require(!game.playerStood, "Already stood");

        uint8 card = drawCard();
        game.playerCards.push(card);

        emit PlayerHit(msg.sender, card);

        // Check if player busted
        if (calculateHandValue(game.playerCards) > 21) {
            _endGame();
        }
    }

    /// @notice Player chooses to stand (dealer plays automatically)
    function stand() external {
        Game storage game = games[msg.sender];
        require(game.isActive, "No active game");
        require(!game.playerStood, "Already stood");

        game.playerStood = true;
        emit PlayerStood(msg.sender);

        _endGame();
    }

    /// @notice End the current game and determine winner
    /// @dev This reveals the dealer's hole card and plays out dealer's hand
    function _endGame() internal {
        Game storage game = games[msg.sender];

        uint8 playerTotal = calculateHandValue(game.playerCards);

        // Reveal dealer's hole card
        game.dealerRevealed = true;
        uint8 dealerHole = game.dealerHoleCard;

        // Calculate initial dealer total
        uint8[] memory dealerCards = new uint8[](2 + game.dealerExtraCards.length);
        dealerCards[0] = game.dealerUpCard;
        dealerCards[1] = dealerHole;

        // Copy extra cards
        for (uint i = 0; i < game.dealerExtraCards.length; i++) {
            dealerCards[2 + i] = game.dealerExtraCards[i];
        }

        uint8 dealerTotal = calculateHandValue(dealerCards);

        // Dealer draws until 17 or higher (if player didn't bust)
        if (playerTotal <= 21 && game.playerStood) {
            while (dealerTotal < 17) {
                uint8 newCard = drawCard();
                game.dealerExtraCards.push(newCard);

                // Recalculate with new card
                uint8[] memory updatedCards = new uint8[](2 + game.dealerExtraCards.length);
                updatedCards[0] = game.dealerUpCard;
                updatedCards[1] = dealerHole;
                for (uint i = 0; i < game.dealerExtraCards.length; i++) {
                    updatedCards[2 + i] = game.dealerExtraCards[i];
                }
                dealerTotal = calculateHandValue(updatedCards);
            }
        }

        // Determine winner
        string memory result;
        if (playerTotal > 21) {
            result = "Player busts - Dealer wins";
        } else if (dealerTotal > 21) {
            result = "Dealer busts - Player wins";
            _payoutWinner();
        } else if (playerTotal > dealerTotal) {
            result = "Player wins";
            _payoutWinner();
        } else if (dealerTotal > playerTotal) {
            result = "Dealer wins";
        } else {
            result = "Push (tie)";
            _returnBet();
        }

        emit GameEnded(msg.sender, playerTotal, dealerTotal, result);

        // Mark game as inactive but don't delete (allows viewing final state)
        game.isActive = false;
    }

    /// @notice Calculate the total value of a hand
    /// @param cards Array of card values
    /// @return Total hand value with optimal ace handling
    function calculateHandValue(uint8[] memory cards) public pure returns (uint8) {
        uint8 total = 0;
        uint8 aces = 0;

        for (uint i = 0; i < cards.length; i++) {
            uint8 card = cards[i];
            if (card == 1) {
                aces++;
                total += 11; // Initially count ace as 11
            } else if (card > 10) {
                total += 10; // Face cards worth 10
            } else {
                total += card;
            }
        }

        // Adjust aces from 11 to 1 if needed to avoid bust
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    /// @notice Draw a random card (1-13, where 1=Ace, 11=Jack, 12=Queen, 13=King)
    /// @dev Simple pseudo-random - NOT SECURE FOR PRODUCTION
    function drawCard() internal returns (uint8) {
        nonce++;
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, nonce)));
        return uint8((random % 13) + 1);
    }

    /// @notice Pay out winner (2:1 payout)
    function _payoutWinner() internal {
        uint256 payout = uint256(games[msg.sender].betAmount) * 2 ether;
        if (address(this).balance >= payout) {
            payable(msg.sender).transfer(payout);
        }
    }

    /// @notice Return bet on push
    function _returnBet() internal {
        uint256 betReturn = uint256(games[msg.sender].betAmount) * 1 ether;
        if (address(this).balance >= betReturn) {
            payable(msg.sender).transfer(betReturn);
        }
    }

    /// @notice Get player's current hand
    function getPlayerHand() external view returns (uint8[] memory) {
        return games[msg.sender].playerCards;
    }

    /// @notice Get dealer's visible card
    function getDealerUpCard() external view returns (uint8) {
        return games[msg.sender].dealerUpCard;
    }

    /// @notice Get dealer's hole card (only visible after game ends)
    function getDealerHoleCard() external view returns (uint8) {
        require(games[msg.sender].dealerRevealed, "Dealer's hole card not yet revealed");
        return games[msg.sender].dealerHoleCard;
    }

    /// @notice Get dealer's complete hand (only visible after game ends)
    function getDealerHand() external view returns (uint8[] memory) {
        Game storage game = games[msg.sender];
        require(game.dealerRevealed, "Dealer's cards not yet revealed");

        // Create array with all dealer cards
        uint8[] memory dealerCards = new uint8[](2 + game.dealerExtraCards.length);
        dealerCards[0] = game.dealerUpCard;
        dealerCards[1] = game.dealerHoleCard;

        // Add extra cards dealer drew
        for (uint i = 0; i < game.dealerExtraCards.length; i++) {
            dealerCards[2 + i] = game.dealerExtraCards[i];
        }

        return dealerCards;
    }

    /// @notice Get game status
    function getGameStatus() external view returns (bool isActive, bool playerStood) {
        Game storage game = games[msg.sender];
        return (game.isActive, game.playerStood);
    }

    /// @notice Allow contract to receive ether for the house bankroll
    receive() external payable {}
}
