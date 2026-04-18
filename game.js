/**
 * Main game entry point
 * 
 * This file orchestrates the modular game system by importing and initializing
 * the GameManager which handles all game logic, rendering, and state management.
 */

import { GameManager } from "./src/game-manager.js";

// Initialize and start the game
const game = new GameManager();
game.initialize();
