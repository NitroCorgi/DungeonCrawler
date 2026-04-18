/**
 * Room layout management and creation
 */

import { GRID_COLS, GRID_ROWS, TILE_SIZE, ROOM_CHARS } from "../constants.js";

/**
 * Create a default room layout (grid with walls on edges and doors)
 */
export function createDefaultLayout() {
  const rows = [];
  const midCol = Math.floor(GRID_COLS / 2);
  const midRow = Math.floor(GRID_ROWS / 2);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    let line = "";
    for (let col = 0; col < GRID_COLS; col += 1) {
      const edge = row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1;
      line += edge ? "X" : "*";
    }
    rows.push(line);
  }

  const replaceAt = (row, col, char) => {
    rows[row] = `${rows[row].slice(0, col)}${char}${rows[row].slice(col + 1)}`;
  };

  for (let offset = -1; offset <= 1; offset += 1) {
    replaceAt(0, midCol + offset, "D");
    replaceAt(GRID_ROWS - 1, midCol + offset, "D");
    replaceAt(midRow + offset, 0, "D");
    replaceAt(midRow + offset, GRID_COLS - 1, "D");
  }

  return rows;
}

/**
 * Normalize a layout to ensure proper dimensions and valid characters
 */
export function normalizeLayout(layoutLines) {
  const normalized = [];

  for (let row = 0; row < GRID_ROWS; row += 1) {
    const source = row < layoutLines.length ? layoutLines[row] : "";
    let line = "";

    for (let col = 0; col < GRID_COLS; col += 1) {
      const rawChar = col < source.length ? source[col] : "*";
      const char = ROOM_CHARS.has(rawChar) ? rawChar : "*";
      line += char;
    }

    normalized.push(line);
  }

  return normalized;
}

/**
 * Clone a layout (deep copy)
 */
export function cloneLayout(layout) {
  return layout.map((line) => line.slice());
}

/**
 * Remove enemy spawn markers from a layout
 */
export function clearSpawnMarkers(layout) {
  return layout.map((line) => line.replace(/E/g, "*"));
}

/**
 * Get room layout, fallback to default if not available
 */
export function getRoomLayout(room) {
  return room.layout || createDefaultLayout();
}

/**
 * Check if a door cell is open (has neighbor on that side)
 */
export function isDoorCellOpen(room, col, row) {
  if (row === 0) {
    return room.neighbors.n !== null;
  }
  if (row === GRID_ROWS - 1) {
    return room.neighbors.s !== null;
  }
  if (col === 0) {
    return room.neighbors.w !== null;
  }
  if (col === GRID_COLS - 1) {
    return room.neighbors.e !== null;
  }
  return true;
}

/**
 * Check if a cell blocks movement
 */
export function isBlockingCell(room, col, row) {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
    return true;
  }

  const cell = getRoomLayout(room)[row][col];
  if (cell === "X") {
    return true;
  }
  if (cell === "D") {
    return !isDoorCellOpen(room, col, row);
  }
  return false;
}

/**
 * Parse room type definition from text format
 */
export function parseRoomTypeText(content, sourceName, parseNumber) {
  const raw = {};
  const lines = content.split(/\r?\n/);
  const layoutLines = [];
  let readingLayout = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.toLowerCase() === "layout:") {
      readingLayout = true;
      continue;
    }

    if (readingLayout) {
      if (trimmed.toLowerCase() === "endlayout") {
        readingLayout = false;
      } else {
        layoutLines.push(line.replace(/\r/g, ""));
      }
      continue;
    }

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    raw[key] = value;
  }

  const fallbackName = sourceName.replace(/\.txt$/i, "");
  const minEnemies = Math.max(1, Math.floor(parseNumber(raw.minEnemies, 1)));
  const maxEnemies = Math.max(minEnemies, Math.floor(parseNumber(raw.maxEnemies, minEnemies)));
  const enemySpeedMin = Math.max(10, parseNumber(raw.enemySpeedMin, 70));
  const enemySpeedMax = Math.max(enemySpeedMin, parseNumber(raw.enemySpeedMax, enemySpeedMin));
  const shootCooldownMin = Math.max(0.1, parseNumber(raw.shootCooldownMin, 0.8));
  const shootCooldownMax = Math.max(shootCooldownMin, parseNumber(raw.shootCooldownMax, shootCooldownMin));

  return {
    name: raw.name || fallbackName,
    weight: Math.max(1, Math.floor(parseNumber(raw.weight, 1))),
    minEnemies,
    maxEnemies,
    enemyHp: Math.max(1, Math.floor(parseNumber(raw.enemyHp, 2))),
    enemySpeedMin,
    enemySpeedMax,
    shootCooldownMin,
    shootCooldownMax,
    layout: layoutLines.length > 0 ? normalizeLayout(layoutLines) : createDefaultLayout(),
  };
}

/**
 * Get ranges of open doors on a side of a room
 */
export function getDoorRanges(room, side) {
  const ranges = [];
  const layout = getRoomLayout(room);

  if (side === "n" || side === "s") {
    const row = side === "n" ? 0 : GRID_ROWS - 1;
    let start = -1;

    for (let col = 0; col <= GRID_COLS; col += 1) {
      const isDoor = col < GRID_COLS && layout[row][col] === "D";
      if (isDoor && start < 0) {
        start = col;
      }
      if (!isDoor && start >= 0) {
        ranges.push({ min: start * TILE_SIZE, max: col * TILE_SIZE });
        start = -1;
      }
    }
  } else {
    const col = side === "w" ? 0 : GRID_COLS - 1;
    let start = -1;

    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const isDoor = row < GRID_ROWS && layout[row][col] === "D";
      if (isDoor && start < 0) {
        start = row;
      }
      if (!isDoor && start >= 0) {
        ranges.push({ min: start * TILE_SIZE, max: row * TILE_SIZE });
        start = -1;
      }
    }
  }

  return ranges;
}

/**
 * Get the center position of the first door on a side
 */
export function getDoorCenter(room, side, canvasWidth, canvasHeight) {
  const ranges = getDoorRanges(room, side);
  if (ranges.length === 0) {
    return side === "n" || side === "s" ? canvasWidth / 2 : canvasHeight / 2;
  }

  const first = ranges[0];
  return (first.min + first.max) / 2;
}

/**
 * Ensure room has doors connecting to neighbors
 */
export function ensureRequiredDoors(room) {
  const layoutRows = getRoomLayout(room).map((line) => line.split(""));
  const midCol = Math.floor(GRID_COLS / 2);
  const midRow = Math.floor(GRID_ROWS / 2);

  const hasDoor = (side) => getDoorRanges(room, side).length > 0;

  if (room.neighbors.n !== null && !hasDoor("n")) {
    for (let offset = -1; offset <= 1; offset += 1) {
      layoutRows[0][midCol + offset] = "D";
    }
  }
  if (room.neighbors.s !== null && !hasDoor("s")) {
    for (let offset = -1; offset <= 1; offset += 1) {
      layoutRows[GRID_ROWS - 1][midCol + offset] = "D";
    }
  }
  if (room.neighbors.w !== null && !hasDoor("w")) {
    for (let offset = -1; offset <= 1; offset += 1) {
      layoutRows[midRow + offset][0] = "D";
    }
  }
  if (room.neighbors.e !== null && !hasDoor("e")) {
    for (let offset = -1; offset <= 1; offset += 1) {
      layoutRows[midRow + offset][GRID_COLS - 1] = "D";
    }
  }

  room.layout = layoutRows.map((line) => line.join(""));
}
