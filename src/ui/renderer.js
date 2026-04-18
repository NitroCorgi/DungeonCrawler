/**
 * Rendering system
 */

import { WIDTH, HEIGHT, GRID_COLS, GRID_ROWS, TILE_SIZE } from "../constants.js";
import { ASSETS } from "../assets.js";
import { getRoomLayout, isDoorCellOpen } from "../systems/layout.js";
import { getChestRect } from "../systems/physics.js";
import { getGoalRect, roomHasUnopenedChest } from "../systems/rooms.js";

/**
 * Draw the current room (tiles, enemies, chests, etc)
 */
export function drawRoom(ctx, room, currentRoomId, goalRoomId, projectiles, player) {
  const layout = getRoomLayout(room);

  // Background
  ctx.fillStyle = "#0f1420";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Tiles
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const cell = layout[row][col];

      if (cell === "X") {
        if (ASSETS.wall.ready) {
          ctx.drawImage(ASSETS.wall.img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = "#2f3749";
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = "#3c4760";
          ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, 6);
        }
        continue;
      }

      if (cell === "D") {
        const open = isDoorCellOpen(room, col, row);
        const doorAsset = open ? ASSETS.doorOpen : ASSETS.doorClosed;
        if (doorAsset.ready) {
          ctx.drawImage(doorAsset.img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = open ? "#1f7a57" : "#5b2430";
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      } else {
        if (ASSETS.floor.ready) {
          ctx.drawImage(ASSETS.floor.img, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = "#141b2a";
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  // Border
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#303b52";
  ctx.strokeRect(0, 0, WIDTH, HEIGHT);

  // Goal
  if (currentRoomId === goalRoomId) {
    const goalRect = getGoalRect(room, WIDTH, HEIGHT);
    if (ASSETS.goal.ready) {
      ctx.drawImage(ASSETS.goal.img, goalRect.x, goalRect.y, goalRect.size, goalRect.size);
    } else {
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(goalRect.x, goalRect.y, goalRect.size, goalRect.size);
    }
  }

  // Chests
  for (const chest of room.chests) {
    if (chest.collected) {
      continue;
    }

    const rect = getChestRect(chest);
    if (ASSETS.chest.ready) {
      ctx.drawImage(ASSETS.chest.img, rect.x, rect.y, rect.width, rect.height);
    } else {
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10);
    }
  }

  // Enemies
  for (const enemy of room.enemies) {
    if (enemy.hp <= 0) {
      continue;
    }

    if (ASSETS.enemy.ready) {
      ctx.drawImage(ASSETS.enemy.img, enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
    } else {
      ctx.beginPath();
      ctx.fillStyle = "#ef4444";
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (enemy.hp === 1) {
      ctx.beginPath();
      ctx.fillStyle = "#fff4";
      ctx.arc(enemy.x, enemy.y - enemy.radius - 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Projectiles
  for (const projectile of projectiles) {
    if (projectile.roomId !== currentRoomId) {
      continue;
    }

    const projAsset = projectile.owner === "player" ? ASSETS.projectilePlayer : ASSETS.projectileEnemy;
    if (projAsset.ready) {
      ctx.drawImage(projAsset.img, projectile.x - projectile.radius, projectile.y - projectile.radius, projectile.radius * 2, projectile.radius * 2);
    } else {
      ctx.beginPath();
      ctx.fillStyle = projectile.owner === "player" ? "#f8fafc" : "#f97316";
      ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player
  if (ASSETS.player.ready) {
    ctx.drawImage(ASSETS.player.img, player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
  } else {
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw HUD (health bar, messages, minimap)
 */
export function drawHud(ctx, player, level, currentRoomId, goalRoomId, gameOver, levelMessageTimer, pickupSplashTimer, pickupSplashText, rooms, roomById, discoveredRoomIds, hasDungeonMap, hasDungeonCompass, goalRoomId_) {
  const healthRatio = Math.max(0, Math.min(1, player.health / player.maxHealth));
  const healthBarX = 16;
  const healthBarY = 20;
  const healthBarW = 190;
  const healthBarH = 14;

  // Health label
  ctx.fillStyle = "#dce3ef";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.fillText("Health", healthBarX, healthBarY - 4);

  // Health bar background
  if (ASSETS.healthBarBg.ready) {
    ctx.drawImage(ASSETS.healthBarBg.img, healthBarX, healthBarY, healthBarW, healthBarH);
  } else {
    ctx.fillStyle = "rgb(10 14 22 / 82%)";
    ctx.fillRect(healthBarX, healthBarY, healthBarW, healthBarH);
  }

  // Health bar fill
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(healthBarX, healthBarY, Math.floor(healthBarW * healthRatio), healthBarH);

  // Health bar border
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 1;
  ctx.strokeRect(healthBarX, healthBarY, healthBarW, healthBarH);

  // Health text
  ctx.fillStyle = "#dce3ef";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.fillText(`${player.health}/${player.maxHealth}`, healthBarX + healthBarW + 10, healthBarY + healthBarH - 1);

  // Ammo
  ctx.fillStyle = "#dce3ef";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.fillText("Ammo", healthBarX, healthBarY + 52);
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText(`${player.ammoInMagazine}/${player.reserveAmmo}`, healthBarX, healthBarY + 74);

  if (player.isReloading) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 13px Trebuchet MS";
    ctx.fillText(`Reloading ${player.reloadTimer.toFixed(1)}s`, healthBarX + 108, healthBarY + 74);
  }

  // Level message
  if (levelMessageTimer > 0) {
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 30px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(`Level ${level}`, WIDTH / 2, 48);
    ctx.textAlign = "left";
  }

  // Goal instruction
  if (currentRoomId === goalRoomId) {
    ctx.fillStyle = "#93f5b8";
    ctx.font = "bold 20px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Step on the green square to finish the level", WIDTH / 2, HEIGHT - 20);
    ctx.textAlign = "left";
  }

  // Pickup splash
  if (pickupSplashTimer > 0 && pickupSplashText) {
    ctx.fillStyle = "#dbeafe";
    ctx.font = "bold 34px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(pickupSplashText, WIDTH / 2, HEIGHT * 0.24);
    ctx.textAlign = "left";
  }

  // Game over screen
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

  drawMinimap(ctx, rooms, roomById, currentRoomId, goalRoomId, discoveredRoomIds, hasDungeonMap, hasDungeonCompass);
}

/**
 * Draw minimap in top-right corner
 */
function drawMinimap(ctx, rooms, roomById, currentRoomId, goalRoomId, discoveredRoomIds, hasDungeonMap, hasDungeonCompass) {
  if (rooms.length === 0) {
    return;
  }

  const visibleRooms = rooms.filter((room) => {
    if (hasDungeonMap) {
      return true;
    }
    if (discoveredRoomIds.has(room.id)) {
      return true;
    }
    return hasDungeonCompass && roomHasUnopenedChest(room);
  });

  if (visibleRooms.length === 0) {
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const room of visibleRooms) {
    minX = Math.min(minX, room.x);
    maxX = Math.max(maxX, room.x);
    minY = Math.min(minY, room.y);
    maxY = Math.max(maxY, room.y);
  }

  const panelW = 220;
  const panelH = 186;
  const panelX = WIDTH - panelW - 16;
  const panelY = 16;

  // Panel background
  ctx.fillStyle = "rgb(11 16 26 / 78%)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#3a4b6a";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // Panel title
  const labelY = panelY + 20;
  ctx.fillStyle = "#d5deeb";
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("Minimap", panelX + 10, labelY);
  ctx.fillStyle = "#9db0c9";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText(`Level: ${currentRoomId}`, panelX + 10, labelY + 16);

  const mapPadding = 14;
  const mapTop = panelY + 46;
  const mapLeft = panelX + mapPadding;
  const mapW = panelW - mapPadding * 2;
  const mapH = panelH - 58;

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

  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id));

  // Draw connections
  ctx.strokeStyle = "#577095";
  ctx.lineWidth = 2;
  for (const room of visibleRooms) {
    const source = centerOf(room);
    for (const side of ["n", "e", "s", "w"]) {
      const neighborId = room.neighbors[side];
      if (neighborId === null || !visibleRoomIds.has(neighborId) || neighborId < room.id) {
        continue;
      }
      const target = centerOf(roomById.get(neighborId));
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }

  // Draw room tiles
  for (const room of visibleRooms) {
    const rx = offsetX + (room.x - minX) * tile + 2;
    const ry = offsetY + (room.y - minY) * tile + 2;
    const size = tile - 4;

    let color = "#7f90ab";
    if (hasDungeonCompass && roomHasUnopenedChest(room)) {
      color = "#2563eb";
    }
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
