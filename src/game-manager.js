/**
 * Main game manager - orchestrates all systems
 */

import {
  WIDTH,
  HEIGHT,
  ROOM_COUNT_START,
  PLAYER_BASE_HEALTH,
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  PLAYER_MAGAZINE_SIZE,
  PLAYER_RELOAD_TIME_SECONDS,
} from "./constants.js";
import { createPlayer, resetPlayer, setPlayerPosition, updatePlayerMovement, damagePlayer } from "./entities/player.js";
import { shootFromPlayer } from "./entities/projectiles.js";
import { updateEnemies, cleanupDeadEnemies } from "./entities/enemies.js";
import { updateProjectiles, projectilesInRoom } from "./entities/projectiles.js";
import { setupKeyboardListeners, setupMouseListeners, isInteractQueued, clearInteractQueue, initializeMouse } from "./systems/input.js";
import { handleChestInteraction } from "./systems/inventory.js";
import { checkRoomTransition, placePlayerAtDoor } from "./systems/navigation.js";
import { circleHitsRoomObstacles } from "./systems/physics.js";
import { getRoomLayout } from "./systems/layout.js";
import { generateDungeon, pickGoalRoom, setRoomTypes, initRoomTypes, loadRoomTypesFromFiles, pickRoomType } from "./systems/dungeon.js";
import { populateRoom } from "./systems/rooms.js";
import { createMapChestItem, createCompassChestItem } from "./systems/rooms.js";
import { randomOpenPositionInRoom } from "./utils/level-gen.js";
import { randomInt, shuffle } from "./utils.js";
import { drawRoom, drawHud } from "./ui/renderer.js";

export class GameManager {
  constructor() {
    // Canvas and rendering
    this.canvas = document.getElementById("game");
    // Keep drawing buffer in sync with logical room dimensions.
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d");

    // Game state
    this.level = 1;
    this.roomCount = ROOM_COUNT_START;
    this.gameOver = false;

    // Entities
    this.player = createPlayer();
    this.projectiles = [];

    // Room management
    this.rooms = [];
    this.roomById = new Map();
    this.currentRoomId = 0;
    this.goalRoomId = 0;
    this.discoveredRoomIds = new Set();

    // Power-ups
    this.hasDungeonMap = false;
    this.hasDungeonCompass = false;

    // UI
    this.levelMessageTimer = 0;
    this.pickupSplashText = "";
    this.pickupSplashTimer = 0;

    // Initialize
    this.setupInputHandlers();
    initializeMouse(WIDTH, HEIGHT);
  }

  /**
   * Setup input handlers
   */
  setupInputHandlers() {
    setupKeyboardListeners(
      () => this.gameOver,
      () => this.resetRun(),
      () => this.reloadPlayerWeapon()
    );

    const canvas = this.canvas;
    setupMouseListeners(canvas, WIDTH, HEIGHT, (x, y) => this.shootFromPlayer(x, y));
  }

  /**
   * Load and initialize game
   */
  async initialize() {
    try {
      const loaded = await loadRoomTypesFromFiles();
      setRoomTypes(loaded);
    } catch (error) {
      console.warn("Falling back to built-in room types.", error);
    }

    initRoomTypes();
    this.loadLevel();
    this.startGameLoop();
  }

  /**
   * Load a new level
   */
  loadLevel() {
    const generation = generateDungeon(this.roomCount);
    this.rooms = generation.generatedRooms;
    this.roomById = new Map(this.rooms.map((room) => [room.id, room]));

    // Setup rooms with enemies and chests
    const chestCandidates = [];
    for (const room of this.rooms) {
      const roomType = pickRoomType();
      const isStartRoom = room.id === generation.generatedRooms[0].id;
      const candidates = populateRoom(
        room,
        roomType,
        isStartRoom,
        randomOpenPositionInRoom,
        WIDTH,
        HEIGHT,
        this.player.radius
      );
      chestCandidates.push(...candidates);
    }

    // Assign special chest items
    this.assignSpecialChests(chestCandidates);

    const startRoom = this.rooms[0];
    this.currentRoomId = startRoom.id;
    this.goalRoomId = pickGoalRoom(this.rooms, startRoom.id).id;
    this.discoveredRoomIds = new Set([this.currentRoomId]);
    this.hasDungeonMap = false;
    this.hasDungeonCompass = false;

    // Place player
    const startPos = randomOpenPositionInRoom(startRoom, this.player.radius);
    setPlayerPosition(this.player, startPos.x, startPos.y);

    this.projectiles = [];
    this.levelMessageTimer = 2.2;
  }

  /**
   * Assign map and compass to random chest slots
   */
  assignSpecialChests(chestCandidates) {
    const availableSlots = shuffle([...chestCandidates]);

    const assignSpecial = (itemFactory) => {
      const slot = availableSlots.shift();
      if (!slot) return;

      if (!slot.chest) {
        const chest = {
          x: slot.spawn.x,
          y: slot.spawn.y,
          size: Math.floor(TILE_SIZE * 0.7),
          item: itemFactory(),
          collected: false,
        };
        slot.room.chests.push(chest);
        slot.chest = chest;
        return;
      }

      slot.chest.item = itemFactory();
    };

    assignSpecial(() => createMapChestItem(this));
    assignSpecial(() => createCompassChestItem(this));
  }

  /**
   * Reset the run
   */
  resetRun() {
    this.level = 1;
    this.roomCount = ROOM_COUNT_START;
    resetPlayer(this.player);
    this.gameOver = false;
    this.loadLevel();
  }

  /**
   * Shoot projectile from player
   */
  shootFromPlayer(targetX, targetY) {
    if (this.gameOver || this.player.isReloading || this.player.ammoInMagazine <= 0) {
      return;
    }

    const projectile = shootFromPlayer(this.player, targetX, targetY, this.currentRoomId);
    if (projectile) {
      this.projectiles.push(projectile);
      this.player.ammoInMagazine -= 1;
    }
  }

  /**
   * Start player reload if weapon is not full and reserve ammo exists
   */
  reloadPlayerWeapon() {
    if (this.gameOver) {
      return;
    }

    if (this.player.isReloading) {
      return;
    }

    if (this.player.ammoInMagazine >= PLAYER_MAGAZINE_SIZE) {
      return;
    }

    if (this.player.reserveAmmo <= 0) {
      return;
    }

    this.player.isReloading = true;
    this.player.reloadTimer = PLAYER_RELOAD_TIME_SECONDS;
  }

  /**
   * Advance reload state and transfer bullets when timer completes
   */
  updateReload(dt) {
    if (!this.player.isReloading) {
      return;
    }

    this.player.reloadTimer = Math.max(0, this.player.reloadTimer - dt);
    if (this.player.reloadTimer > 0) {
      return;
    }

    const missingBullets = PLAYER_MAGAZINE_SIZE - this.player.ammoInMagazine;
    const bulletsToLoad = Math.min(missingBullets, this.player.reserveAmmo);
    this.player.ammoInMagazine += bulletsToLoad;
    this.player.reserveAmmo -= bulletsToLoad;
    this.player.isReloading = false;
    this.player.reloadTimer = 0;
  }

  /**
   * Show pickup splash message
   */
  showPickupSplash(itemName) {
    this.pickupSplashText = `got ${itemName}!`;
    this.pickupSplashTimer = 1.8;
  }

  /**
   * Check if player reached goal
   */
  reachedGoal() {
    if (this.currentRoomId !== this.goalRoomId) {
      return false;
    }

    const room = this.roomById.get(this.currentRoomId);
    const goal = room.goalPosition || this.getGoalMarkerPosition(room);
    const size = Math.floor(TILE_SIZE * 0.75);
    const goalRect = {
      x: goal.x - size / 2,
      y: goal.y - size / 2,
      size,
    };
    const px = this.player.x;
    const py = this.player.y;

    return (
      px >= goalRect.x &&
      px <= goalRect.x + goalRect.size &&
      py >= goalRect.y &&
      py <= goalRect.y + goalRect.size
    );
  }

  /**
   * Get goal marker position from room layout
   */
  getGoalMarkerPosition(room) {
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
   * Finish level and advance
   */
  finishLevel() {
    this.level += 1;
    this.roomCount += 2;
    this.loadLevel();
  }

  /**
   * Update game logic
   */
  update(dt) {
    if (this.levelMessageTimer > 0) {
      this.levelMessageTimer -= dt;
    }

    if (this.pickupSplashTimer > 0) {
      this.pickupSplashTimer -= dt;
    }

    if (this.gameOver) {
      return;
    }

    this.updateReload(dt);

    const currentRoom = this.roomById.get(this.currentRoomId);

    // Update player
    updatePlayerMovement(this.player, currentRoom, dt);

    // Handle chest interaction
    if (isInteractQueued()) {
      const result = handleChestInteraction(currentRoom, this.player, this.roomById, this.currentRoomId, true);
      if (result.applied) {
        this.showPickupSplash(result.itemName);
      }
      clearInteractQueue();
    }

    // Check room transition
    const transition = checkRoomTransition(this.player, currentRoom, this.roomById, this.currentRoomId);
    if (transition.nextRoomId !== null) {
      this.currentRoomId = transition.nextRoomId;
      this.discoveredRoomIds.add(this.currentRoomId);
      const nextRoom = this.roomById.get(this.currentRoomId);
      placePlayerAtDoor(this.player, nextRoom, transition.exitSide, this.player.radius);
      this.projectiles = projectilesInRoom(this.projectiles, this.currentRoomId);
    }

    // Update enemies and projectiles
    updateEnemies(currentRoom, this.player, this.projectiles, this.currentRoomId, dt);
    this.projectiles = updateProjectiles(this.projectiles, currentRoom, this.currentRoomId, this.player, () => {
      if (damagePlayer(this.player, 1)) {
        this.gameOver = true;
      }
    });
    cleanupDeadEnemies(currentRoom);

    // Check goal
    if (this.reachedGoal()) {
      this.finishLevel();
    }
  }

  /**
   * Render frame
   */
  render() {
    const currentRoom = this.roomById.get(this.currentRoomId);

    drawRoom(this.ctx, currentRoom, this.currentRoomId, this.goalRoomId, this.projectiles, this.player);
    drawHud(
      this.ctx,
      this.player,
      this.level,
      this.currentRoomId,
      this.goalRoomId,
      this.gameOver,
      this.levelMessageTimer,
      this.pickupSplashTimer,
      this.pickupSplashText,
      this.rooms,
      this.roomById,
      this.discoveredRoomIds,
      this.hasDungeonMap,
      this.hasDungeonCompass,
      this.goalRoomId
    );
  }

  /**
   * Start the game loop
   */
  startGameLoop() {
    let lastTime = performance.now();

    const frame = (now) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      this.update(dt);
      this.render();

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }
}
