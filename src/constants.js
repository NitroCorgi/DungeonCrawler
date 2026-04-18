// Canvas and Display
export const CANVAS_ID = "game";
export const WIDTH = 1024;
export const HEIGHT = 672;

// Game Settings
export const ROOM_COUNT_START = 12;
export const PLAYER_BASE_HEALTH = 5;

// Player
export const PLAYER_SPEED = 260;
export const PLAYER_RADIUS = 14;
export const PLAYER_PROJECTILE_SPEED = 520;

// Enemies
export const ENEMY_PROJECTILE_SPEED = 280;

// Chest
export const CHEST_SPAWN_CHANCE = 0.1;
export const CHEST_INTERACT_RANGE = 12;
export const PICKUP_SPLASH_DURATION = 1.8;

// Room Layout
export const GRID_COLS = 24;
export const GRID_ROWS = 16;
export const TILE_SIZE = WIDTH / GRID_COLS;
export const CHEST_SIZE = Math.floor(TILE_SIZE * 0.7);
export const ROOM_TYPE_MANIFEST = "rooms/manifest.txt";
export const ROOM_CHARS = new Set(["X", "D", "*", "E", "G", "C"]);

// Door
export const DOOR_SIZE = 140;

// Default Room Types Configuration
export const DEFAULT_ROOM_TYPES = [
  {
    name: "Skirmish",
    weight: 3,
    minEnemies: 1,
    maxEnemies: 3,
    enemyHp: 2,
    enemySpeedMin: 70,
    enemySpeedMax: 105,
    shootCooldownMin: 0.8,
    shootCooldownMax: 2.4,
    layout: null, // Will be set dynamically
  },
  {
    name: "Swarm",
    weight: 2,
    minEnemies: 2,
    maxEnemies: 4,
    enemyHp: 1,
    enemySpeedMin: 85,
    enemySpeedMax: 125,
    shootCooldownMin: 0.6,
    shootCooldownMax: 1.6,
    layout: null,
  },
  {
    name: "Tanks",
    weight: 1,
    minEnemies: 1,
    maxEnemies: 2,
    enemyHp: 3,
    enemySpeedMin: 50,
    enemySpeedMax: 78,
    shootCooldownMin: 1.2,
    shootCooldownMax: 2.8,
    layout: null,
  },
];
