/**
 * Physics and collision detection system
 */

import { TILE_SIZE, WIDTH, HEIGHT } from "../constants.js";
import { circleIntersectsRect } from "../utils.js";
import { isBlockingCell } from "./layout.js";

/**
 * Check if circle hits any chests in room
 */
export function circleHitsChest(room, x, y, radius) {
  if (!room.chests || room.chests.length === 0) {
    return false;
  }

  return room.chests.some((chest) => {
    if (chest.collected) {
      return false;
    }

    const rect = getChestRect(chest);
    return circleIntersectsRect(x, y, radius, rect.x, rect.y, rect.width, rect.height);
  });
}

/**
 * Get rectangle bounds of a chest
 */
export function getChestRect(chest) {
  return {
    x: chest.x - chest.size / 2,
    y: chest.y - chest.size / 2,
    width: chest.size,
    height: chest.size,
  };
}

/**
 * Check if circle hits the room layout (walls/doors)
 */
export function circleHitsLayout(room, x, y, radius) {
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

/**
 * Check if circle hits any room obstacles (layout + chests)
 */
export function circleHitsRoomObstacles(room, x, y, radius) {
  return circleHitsLayout(room, x, y, radius) || circleHitsChest(room, x, y, radius);
}

/**
 * Move entity with collision detection (separates X and Y axes)
 */
export function moveWithLayoutCollision(entity, dx, dy, room) {
  entity.x += dx;
  if (circleHitsRoomObstacles(room, entity.x, entity.y, entity.radius)) {
    entity.x -= dx;
  }

  entity.y += dy;
  if (circleHitsRoomObstacles(room, entity.x, entity.y, entity.radius)) {
    entity.y -= dy;
  }
}
