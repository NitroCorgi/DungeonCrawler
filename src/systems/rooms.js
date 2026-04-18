/**
 * Room and entity management system
 */

import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  CHEST_SIZE,
  CHEST_SPAWN_CHANCE,
  WIDTH,
  HEIGHT,
  PLAYER_AMMO_PICKUP_AMOUNT,
} from "../constants.js";
import { randomInt, shuffle, randomFloat } from "../utils.js";
import { getRoomLayout, ensureRequiredDoors, cloneLayout, clearSpawnMarkers } from "./layout.js";

const chestItems = [
  {
    name: "Health-Up",
    apply: (player) => {
      player.maxHealth += 1;
      player.health = Math.min(player.health + 1, player.maxHealth);
    },
  },
  {
    name: "Pistol Ammo",
    apply: (player) => {
      player.reserveAmmo = (player.reserveAmmo || 0) + PLAYER_AMMO_PICKUP_AMOUNT;
    },
  },
];

/**
 * Collect enemy spawn points from room layout
 */
export function collectEnemySpawnPoints(room) {
  const points = [];
  const layout = getRoomLayout(room);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (layout[row][col] !== "E") {
        continue;
      }

      points.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
      });
    }
  }

  return points;
}

/**
 * Collect chest spawn points from room layout
 */
export function collectChestSpawnPoints(room) {
  const points = [];
  const layout = getRoomLayout(room);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (layout[row][col] !== "C") {
        continue;
      }

      points.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
      });
    }
  }

  return points;
}

/**
 * Check if room has any uncollected chests
 */
export function roomHasUnopenedChest(room) {
  return room.chests && room.chests.some((chest) => !chest.collected);
}

/**
 * Get goal marker position from room layout
 */
function getGoalMarkerPositionInRoom(room) {
  const layout = getRoomLayout(room);
  const markers = [];

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (layout[row][col] !== "G") {
        continue;
      }

      markers.push({
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE / 2,
      });
    }
  }

  if (markers.length > 0) {
    return markers[randomInt(0, markers.length - 1)];
  }

  return { x: WIDTH / 2, y: HEIGHT / 2 };
}

/**
 * Get goal rect (for rendering and collision)
 */
export function getGoalRect(room, WIDTH, HEIGHT) {
  const goal = room.goalPosition || getGoalMarkerPositionInRoom(room);
  const size = Math.floor(TILE_SIZE * 0.75);
  return {
    x: goal.x - size / 2,
    y: goal.y - size / 2,
    size,
  };
}

/**
 * Get all chest items
 */
export function getChestItems() {
  return chestItems;
}

/**
 * Create a map item for chests
 */
export function createMapChestItem() {
  return {
    name: "Map",
    apply: (gameState) => {
      gameState.hasDungeonMap = true;
    },
  };
}

/**
 * Create a compass item for chests
 */
export function createCompassChestItem() {
  return {
    name: "Compass",
    apply: (gameState) => {
      gameState.hasDungeonCompass = true;
    },
  };
}

/**
 * Populate room with enemies and chests
 */
export function populateRoom(room, roomType, isStartRoom, randomOpenPositionInRoom, WIDTH, HEIGHT, PLAYER_RADIUS) {
  const layout = room.layout || cloneLayout(roomType.layout);
  
  if (isStartRoom) {
    room.layout = clearSpawnMarkers(layout);
  }
  
  ensureRequiredDoors(room);
  room.roomTypeName = roomType.name;
  room.layout = cloneLayout(roomType.layout || layout);
  room.goalPosition = getGoalMarkerPositionInRoom(room);

  // Populate chests
  const chestSpawns = collectChestSpawnPoints(room);
  const chestCandidates = [];

  room.chests = chestSpawns
    .filter(() => Math.random() < CHEST_SPAWN_CHANCE)
    .map((spawn) => {
      const item = chestItems[randomInt(0, chestItems.length - 1)];
      const chest = {
        x: spawn.x,
        y: spawn.y,
        size: CHEST_SIZE,
        item,
        collected: false,
      };
      chestCandidates.push({ room, spawn, chest });
      return chest;
    });

  for (const spawn of chestSpawns) {
    const existingChest = room.chests.find((chest) => chest.x === spawn.x && chest.y === spawn.y);
    if (existingChest) {
      continue;
    }
    chestCandidates.push({ room, spawn, chest: null });
  }

  // Populate enemies (skip start room)
  if (!isStartRoom) {
    const enemyCount = randomInt(roomType.minEnemies, roomType.maxEnemies);
    const spawnPoints = shuffle(collectEnemySpawnPoints(room));
    
    for (let i = 0; i < enemyCount; i += 1) {
      const spawn = spawnPoints[i] || randomOpenPositionInRoom(room, 14);
      room.enemies.push({
        x: spawn.x,
        y: spawn.y,
        radius: 14,
        hp: roomType.enemyHp,
        speed: randomInt(roomType.enemySpeedMin, roomType.enemySpeedMax),
        shootCooldown: randomFloat(roomType.shootCooldownMin, roomType.shootCooldownMax),
        shootCooldownMin: roomType.shootCooldownMin,
        shootCooldownMax: roomType.shootCooldownMax,
      });
    }
  }

  return chestCandidates;
}
