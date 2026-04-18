/**
 * Dungeon generation and room management
 */

import { ROOM_TYPE_MANIFEST, DEFAULT_ROOM_TYPES } from "../constants.js";
import { randomInt, coordKey, shuffle, parseNumber } from "../utils.js";
import { createDefaultLayout, cloneLayout, normalizeLayout, clearSpawnMarkers, ensureRequiredDoors, parseRoomTypeText } from "./layout.js";

let roomTypes = [...DEFAULT_ROOM_TYPES];

/**
 * Initialize room types with default layouts
 */
export function initRoomTypes() {
  for (const roomType of roomTypes) {
    if (!roomType.layout) {
      roomType.layout = createDefaultLayout();
    }
  }
}

/**
 * Load room types from external files
 */
export async function loadRoomTypesFromFiles() {
  const manifestResponse = await fetch(ROOM_TYPE_MANIFEST, { cache: "no-store" });
  if (!manifestResponse.ok) {
    throw new Error(`Failed to load ${ROOM_TYPE_MANIFEST}`);
  }

  const manifestText = await manifestResponse.text();
  const roomTypeFiles = manifestText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  const loaded = [];
  for (const filePath of roomTypeFiles) {
    const response = await fetch(filePath, { cache: "no-store" });
    if (!response.ok) {
      continue;
    }
    const content = await response.text();
    loaded.push(parseRoomTypeText(content, filePath.split("/").pop() || "room", parseNumber));
  }

  if (loaded.length === 0) {
    throw new Error("No room type files loaded");
  }

  return loaded;
}

/**
 * Set room types (call after loading from files)
 */
export function setRoomTypes(types) {
  roomTypes = types;
}

/**
 * Get current room types
 */
export function getRoomTypes() {
  return roomTypes;
}

/**
 * Pick a random room type based on weights
 */
export function pickRoomType() {
  if (roomTypes.length === 0) {
    return DEFAULT_ROOM_TYPES[0];
  }

  const totalWeight = roomTypes.reduce((sum, roomType) => sum + roomType.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const roomType of roomTypes) {
    roll -= roomType.weight;
    if (roll <= 0) {
      return roomType;
    }
  }

  return roomTypes[roomTypes.length - 1];
}

/**
 * Generate the complete dungeon structure
 */
export function generateDungeon(roomCountTarget) {
  const occupied = new Map();
  occupied.set(coordKey(0, 0), { x: 0, y: 0 });

  const dirs = [
    { name: "n", dx: 0, dy: -1, opposite: "s" },
    { name: "e", dx: 1, dy: 0, opposite: "w" },
    { name: "s", dx: 0, dy: 1, opposite: "n" },
    { name: "w", dx: -1, dy: 0, opposite: "e" },
  ];

  // Randomly expand from existing rooms so the graph stays connected.
  while (occupied.size < roomCountTarget) {
    const cells = Array.from(occupied.values());
    const source = cells[randomInt(0, cells.length - 1)];
    const options = shuffle([...dirs]);

    for (const dir of options) {
      const nx = source.x + dir.dx;
      const ny = source.y + dir.dy;
      const key = coordKey(nx, ny);
      if (!occupied.has(key)) {
        occupied.set(key, { x: nx, y: ny });
        break;
      }
    }
  }

  const generatedRooms = Array.from(occupied.values()).map((pos, index) => ({
    id: index,
    x: pos.x,
    y: pos.y,
    neighbors: { n: null, e: null, s: null, w: null },
    enemies: [],
    chests: [],
  }));

  const byCoord = new Map();
  for (const room of generatedRooms) {
    byCoord.set(coordKey(room.x, room.y), room);
  }

  for (const room of generatedRooms) {
    for (const dir of dirs) {
      const next = byCoord.get(coordKey(room.x + dir.dx, room.y + dir.dy));
      if (next) {
        room.neighbors[dir.name] = next.id;
      }
    }
  }

  return {
    generatedRooms,
    byCoord,
    dirs,
  };
}

/**
 * Get a random non-start room for the goal
 */
export function pickGoalRoom(rooms, startRoomId) {
  const nonStartRooms = rooms.filter((room) => room.id !== startRoomId);
  return nonStartRooms[randomInt(0, nonStartRooms.length - 1)];
}
