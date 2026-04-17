const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const ROOM_COUNT_START = 12;
const DOOR_SIZE = 140;
const PLAYER_SPEED = 260;
const PLAYER_RADIUS = 14;
const PLAYER_PROJECTILE_SPEED = 520;
const ENEMY_PROJECTILE_SPEED = 280;
const ROOM_TYPE_MANIFEST = "rooms/manifest.txt";
const GRID_COLS = 24;
const GRID_ROWS = 16;
const TILE_SIZE = WIDTH / GRID_COLS;
const ROOM_CHARS = new Set(["X", "D", "*", "E"]);

const DEFAULT_ROOM_TYPES = [
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
    layout: createDefaultLayout(),
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
    layout: createDefaultLayout(),
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
    layout: createDefaultLayout(),
  },
];

const keys = new Set();
const mouse = { x: WIDTH / 2, y: HEIGHT / 2 };

let level = 1;
let roomCount = ROOM_COUNT_START;

let rooms = [];
let roomById = new Map();
let currentRoomId = 0;
let goalRoomId = 0;
let discoveredRoomIds = new Set();
let roomTypes = [...DEFAULT_ROOM_TYPES];

const player = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  health: 5,
  radius: PLAYER_RADIUS,
};

let projectiles = [];
let levelMessageTimer = 0;
let gameOver = false;

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d"].includes(key)) {
    keys.add(key);
  }

  if (gameOver && key === "r") {
    resetRun();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
  mouse.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0 || gameOver) {
    return;
  }
  shootFromPlayer(mouse.x, mouse.y);
});

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function coordKey(x, y) {
  return `${x},${y}`;
}

function createDefaultLayout() {
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

function normalizeLayout(layoutLines) {
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

function parseNumber(rawValue, fallback) {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRoomTypeText(content, sourceName) {
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

async function loadRoomTypesFromFiles() {
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
    loaded.push(parseRoomTypeText(content, filePath.split("/").pop() || "room"));
  }

  if (loaded.length === 0) {
    throw new Error("No room type files loaded");
  }

  return loaded;
}

function pickRoomType() {
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

function cloneLayout(layout) {
  return layout.map((line) => line.slice());
}

function clearSpawnMarkers(layout) {
  return layout.map((line) => line.replace(/E/g, "*"));
}

function getRoomLayout(room) {
  return room.layout || createDefaultLayout();
}

function isDoorCellOpen(room, col, row) {
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

function isBlockingCell(room, col, row) {
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

function circleIntersectsRect(cx, cy, cr, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= cr * cr;
}

function circleHitsLayout(room, x, y, radius) {
  const minCol = Math.floor((x - radius) / TILE_SIZE);
  const maxCol = Math.floor((x + radius) / TILE_SIZE);
  const minRow = Math.floor((y - radius) / TILE_SIZE);
  const maxRow = Math.floor((y + radius) / TILE_SIZE);

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!isBlockingCell(room, col, row)) {
        continue;
      }

      const rx = col * TILE_SIZE;
      const ry = row * TILE_SIZE;
      if (circleIntersectsRect(x, y, radius, rx, ry, TILE_SIZE, TILE_SIZE)) {
        return true;
      }
    }
  }

  return false;
}

function moveWithLayoutCollision(entity, dx, dy, room) {
  entity.x += dx;
  if (circleHitsLayout(room, entity.x, entity.y, entity.radius)) {
    entity.x -= dx;
  }

  entity.y += dy;
  if (circleHitsLayout(room, entity.x, entity.y, entity.radius)) {
    entity.y -= dy;
  }
}

function getDoorRanges(room, side) {
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

function getDoorCenter(room, side) {
  const ranges = getDoorRanges(room, side);
  if (ranges.length === 0) {
    return side === "n" || side === "s" ? WIDTH / 2 : HEIGHT / 2;
  }

  const first = ranges[0];
  return (first.min + first.max) / 2;
}

function collectEnemySpawnPoints(room) {
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

function ensureRequiredDoors(room) {
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

function randomOpenPositionInRoom(room, radius) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = randomInt(radius + 1, WIDTH - radius - 1);
    const y = randomInt(radius + 1, HEIGHT - radius - 1);
    if (!circleHitsLayout(room, x, y, radius)) {
      return { x, y };
    }
  }

  return { x: WIDTH / 2, y: HEIGHT / 2 };
}

function generateDungeon(roomCountTarget) {
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

  const startRoom = byCoord.get(coordKey(0, 0));
  const nonStartRooms = generatedRooms.filter((room) => room.id !== startRoom.id);
  const goalRoom = nonStartRooms[randomInt(0, nonStartRooms.length - 1)];

  for (const room of generatedRooms) {
    const roomType = pickRoomType();
    room.roomTypeName = roomType.name;
    room.layout = cloneLayout(roomType.layout || createDefaultLayout());
    if (room.id === startRoom.id) {
      room.layout = clearSpawnMarkers(room.layout);
    }
    ensureRequiredDoors(room);

    if (room.id === startRoom.id) {
      continue;
    }

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

  return {
    generatedRooms,
    startRoomId: startRoom.id,
    goalRoomId: goalRoom.id,
  };
}

function loadLevel() {
  const generated = generateDungeon(roomCount);
  rooms = generated.generatedRooms;
  roomById = new Map(rooms.map((room) => [room.id, room]));
  currentRoomId = generated.startRoomId;
  goalRoomId = generated.goalRoomId;
  discoveredRoomIds = new Set([currentRoomId]);

  const startRoom = roomById.get(currentRoomId);
  const startPos = randomOpenPositionInRoom(startRoom, player.radius);
  player.x = startPos.x;
  player.y = startPos.y;
  projectiles = [];
  levelMessageTimer = 2.2;
}

function resetRun() {
  level = 1;
  roomCount = ROOM_COUNT_START;
  player.health = 5;
  gameOver = false;
  loadLevel();
}

function shootFromPlayer(targetX, targetY) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return;
  }

  projectiles.push({
    x: player.x,
    y: player.y,
    vx: (dx / length) * PLAYER_PROJECTILE_SPEED,
    vy: (dy / length) * PLAYER_PROJECTILE_SPEED,
    radius: 4,
    owner: "player",
    roomId: currentRoomId,
    alive: true,
  });
}

function shootFromEnemy(enemy) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return;
  }

  projectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / length) * ENEMY_PROJECTILE_SPEED,
    vy: (dy / length) * ENEMY_PROJECTILE_SPEED,
    radius: 5,
    owner: "enemy",
    roomId: currentRoomId,
    alive: true,
  });
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = a.radius + b.radius;
  return dx * dx + dy * dy <= rr * rr;
}

function isInDoorRange(side, x, y, room) {
  const ranges = getDoorRanges(room, side);
  const coordinate = side === "n" || side === "s" ? x : y;

  if (ranges.length === 0) {
    const halfDoor = DOOR_SIZE / 2;
    const center = side === "n" || side === "s" ? WIDTH / 2 : HEIGHT / 2;
    return coordinate >= center - halfDoor && coordinate <= center + halfDoor;
  }

  return ranges.some((range) => coordinate >= range.min && coordinate <= range.max);
}

function placePlayerAtDoor(room, side, radius) {
  if (side === "n") {
    player.x = getDoorCenter(room, "n");
    player.y = radius + 3;
  } else if (side === "s") {
    player.x = getDoorCenter(room, "s");
    player.y = HEIGHT - radius - 3;
  } else if (side === "w") {
    player.x = radius + 3;
    player.y = getDoorCenter(room, "w");
  } else {
    player.x = WIDTH - radius - 3;
    player.y = getDoorCenter(room, "e");
  }
}

function tryRoomTransition() {
  const room = roomById.get(currentRoomId);
  const r = player.radius;
  const edgeTolerance = 6;

  if (player.y <= r + edgeTolerance) {
    const next = room.neighbors.n;
    if (isInDoorRange("n", player.x, player.y, room) && next !== null) {
      currentRoomId = next;
      discoveredRoomIds.add(currentRoomId);
      placePlayerAtDoor(roomById.get(currentRoomId), "s", r);
      projectiles = projectiles.filter((p) => p.roomId === currentRoomId);
      return;
    }
    player.y = r;
  }

  if (player.y >= HEIGHT - r - edgeTolerance) {
    const next = room.neighbors.s;
    if (isInDoorRange("s", player.x, player.y, room) && next !== null) {
      currentRoomId = next;
      discoveredRoomIds.add(currentRoomId);
      placePlayerAtDoor(roomById.get(currentRoomId), "n", r);
      projectiles = projectiles.filter((p) => p.roomId === currentRoomId);
      return;
    }
    player.y = HEIGHT - r;
  }

  if (player.x <= r + edgeTolerance) {
    const next = room.neighbors.w;
    if (isInDoorRange("w", player.x, player.y, room) && next !== null) {
      currentRoomId = next;
      discoveredRoomIds.add(currentRoomId);
      placePlayerAtDoor(roomById.get(currentRoomId), "e", r);
      projectiles = projectiles.filter((p) => p.roomId === currentRoomId);
      return;
    }
    player.x = r;
  }

  if (player.x >= WIDTH - r - edgeTolerance) {
    const next = room.neighbors.e;
    if (isInDoorRange("e", player.x, player.y, room) && next !== null) {
      currentRoomId = next;
      discoveredRoomIds.add(currentRoomId);
      placePlayerAtDoor(roomById.get(currentRoomId), "w", r);
      projectiles = projectiles.filter((p) => p.roomId === currentRoomId);
      return;
    }
    player.x = WIDTH - r;
  }
}

function updatePlayer(dt) {
  const room = roomById.get(currentRoomId);
  let mx = 0;
  let my = 0;
  if (keys.has("w")) {
    my -= 1;
  }
  if (keys.has("s")) {
    my += 1;
  }
  if (keys.has("a")) {
    mx -= 1;
  }
  if (keys.has("d")) {
    mx += 1;
  }

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    const vx = (mx / len) * PLAYER_SPEED * dt;
    const vy = (my / len) * PLAYER_SPEED * dt;
    moveWithLayoutCollision(player, vx, vy, room);
  }

  tryRoomTransition();
}

function updateEnemies(dt) {
  const room = roomById.get(currentRoomId);

  for (const enemy of room.enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const vx = (dx / dist) * enemy.speed * dt;
      const vy = (dy / dist) * enemy.speed * dt;
      moveWithLayoutCollision(enemy, vx, vy, room);
    }

    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0) {
      shootFromEnemy(enemy);
      enemy.shootCooldown = randomFloat(enemy.shootCooldownMin, enemy.shootCooldownMax);
    }
  }
}

function updateProjectiles(dt) {
  const currentRoom = roomById.get(currentRoomId);

  for (const projectile of projectiles) {
    if (!projectile.alive) {
      continue;
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (
      projectile.x < -20 ||
      projectile.x > WIDTH + 20 ||
      projectile.y < -20 ||
      projectile.y > HEIGHT + 20
    ) {
      projectile.alive = false;
      continue;
    }

    if (projectile.roomId !== currentRoomId) {
      continue;
    }

    if (circleHitsLayout(currentRoom, projectile.x, projectile.y, projectile.radius)) {
      projectile.alive = false;
      continue;
    }

    if (projectile.owner === "player") {
      for (const enemy of currentRoom.enemies) {
        if (enemy.hp > 0 && circleHit(projectile, enemy)) {
          enemy.hp -= 1;
          projectile.alive = false;
          break;
        }
      }
    } else if (projectile.owner === "enemy" && circleHit(projectile, player)) {
      player.health -= 1;
      projectile.alive = false;
      if (player.health <= 0) {
        gameOver = true;
      }
    }
  }

  currentRoom.enemies = currentRoom.enemies.filter((enemy) => enemy.hp > 0);
  projectiles = projectiles.filter((projectile) => projectile.alive);
}

function reachedGoal() {
  if (currentRoomId !== goalRoomId) {
    return false;
  }

  const size = 38;
  const gx = WIDTH / 2 - size / 2;
  const gy = HEIGHT / 2 - size / 2;
  const px = player.x;
  const py = player.y;

  return px >= gx && px <= gx + size && py >= gy && py <= gy + size;
}

function finishLevel() {
  level += 1;
  roomCount += 2;
  loadLevel();
}

function update(dt) {
  if (levelMessageTimer > 0) {
    levelMessageTimer -= dt;
  }

  if (gameOver) {
    return;
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);

  if (reachedGoal()) {
    finishLevel();
  }
}

function drawRoom() {
  const room = roomById.get(currentRoomId);
  const layout = getRoomLayout(room);

  ctx.fillStyle = "#0f1420";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const cell = layout[row][col];

      if (cell === "X") {
        ctx.fillStyle = "#2f3749";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = "#3c4760";
        ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, 6);
        continue;
      }

      if (cell === "D") {
        const open = isDoorCellOpen(room, col, row);
        ctx.fillStyle = open ? "#1f7a57" : "#5b2430";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = "#141b2a";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#303b52";
  ctx.strokeRect(0, 0, WIDTH, HEIGHT);

  if (currentRoomId === goalRoomId) {
    const size = 38;
    const gx = WIDTH / 2 - size / 2;
    const gy = HEIGHT / 2 - size / 2;
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(gx, gy, size, size);
  }

  for (const enemy of room.enemies) {
    ctx.beginPath();
    ctx.fillStyle = "#ef4444";
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.hp === 1) {
      ctx.beginPath();
      ctx.fillStyle = "#fff4";
      ctx.arc(enemy.x, enemy.y - enemy.radius - 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const projectile of projectiles) {
    if (projectile.roomId !== currentRoomId) {
      continue;
    }

    ctx.beginPath();
    ctx.fillStyle = projectile.owner === "player" ? "#f8fafc" : "#f97316";
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud() {
  const room = roomById.get(currentRoomId);

  ctx.fillStyle = "#dce3ef";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.fillText(`Health: ${player.health}`, 16, 30);
  ctx.fillText(`Level: ${level}`, 16, 56);
  ctx.fillText(`Room: ${currentRoomId + 1}/${rooms.length}`, 16, 82);
  if (room && room.roomTypeName) {
    ctx.fillText(`Type: ${room.roomTypeName}`, 16, 108);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "#9db0c9";
  ctx.fillText("W A S D to move   |   Left click to shoot", WIDTH - 16, 30);
  ctx.textAlign = "left";

  if (levelMessageTimer > 0) {
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 30px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(`Level ${level}`, WIDTH / 2, 48);
    ctx.textAlign = "left";
  }

  if (currentRoomId === goalRoomId) {
    ctx.fillStyle = "#93f5b8";
    ctx.font = "bold 20px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Step on the green square to finish the level", WIDTH / 2, HEIGHT - 20);
    ctx.textAlign = "left";
  }

  if (gameOver) {
    ctx.fillStyle = "rgb(0 0 0 / 55%)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 56px Trebuchet MS";
    ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2 - 18);

    ctx.fillStyle = "#f3f5f8";
    ctx.font = "bold 28px Trebuchet MS";
    ctx.fillText("Press R to restart", WIDTH / 2, HEIGHT / 2 + 34);
    ctx.textAlign = "left";
  }

  drawMinimap();
}

function drawMinimap() {
  if (rooms.length === 0) {
    return;
  }

  const discoveredRooms = rooms.filter((room) => discoveredRoomIds.has(room.id));
  if (discoveredRooms.length === 0) {
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const room of discoveredRooms) {
    minX = Math.min(minX, room.x);
    maxX = Math.max(maxX, room.x);
    minY = Math.min(minY, room.y);
    maxY = Math.max(maxY, room.y);
  }

  const panelW = 220;
  const panelH = 170;
  const panelX = WIDTH - panelW - 16;
  const panelY = 46;

  ctx.fillStyle = "rgb(11 16 26 / 78%)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#3a4b6a";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  const labelY = panelY + 20;
  ctx.fillStyle = "#d5deeb";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("Minimap (discovered)", panelX + 10, labelY);

  const mapPadding = 14;
  const mapTop = panelY + 30;
  const mapLeft = panelX + mapPadding;
  const mapW = panelW - mapPadding * 2;
  const mapH = panelH - 42;

  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const tile = Math.max(10, Math.min(26, Math.floor(Math.min(mapW / spanX, mapH / spanY))));
  const contentW = spanX * tile;
  const contentH = spanY * tile;
  const offsetX = mapLeft + Math.floor((mapW - contentW) / 2);
  const offsetY = mapTop + Math.floor((mapH - contentH) / 2);

  const centerOf = (room) => ({
    x: offsetX + (room.x - minX) * tile + tile / 2,
    y: offsetY + (room.y - minY) * tile + tile / 2,
  });

  ctx.strokeStyle = "#577095";
  ctx.lineWidth = 2;
  for (const room of discoveredRooms) {
    const source = centerOf(room);
    for (const side of ["n", "e", "s", "w"]) {
      const neighborId = room.neighbors[side];
      if (neighborId === null || !discoveredRoomIds.has(neighborId) || neighborId < room.id) {
        continue;
      }
      const target = centerOf(roomById.get(neighborId));
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }

  for (const room of discoveredRooms) {
    const rx = offsetX + (room.x - minX) * tile + 2;
    const ry = offsetY + (room.y - minY) * tile + 2;
    const size = tile - 4;

    let color = "#7f90ab";
    if (room.id === goalRoomId) {
      color = "#2ec27e";
    }
    if (room.id === currentRoomId) {
      color = "#f8fafc";
    }

    ctx.fillStyle = color;
    ctx.fillRect(rx, ry, size, size);
  }
}

function render() {
  drawRoom();
  drawHud();
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(frame);
}

async function startGame() {
  try {
    roomTypes = await loadRoomTypesFromFiles();
  } catch (error) {
    console.warn("Falling back to built-in room types.", error);
    roomTypes = [...DEFAULT_ROOM_TYPES];
  }

  resetRun();
  requestAnimationFrame(frame);
}

startGame();
