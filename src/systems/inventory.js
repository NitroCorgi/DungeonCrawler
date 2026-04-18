/**
 * Inventory and item management system
 */

import { CHEST_INTERACT_RANGE } from "../constants.js";
import { circleIntersectsRect } from "../utils.js";
import { getChestRect } from "./physics.js";

/**
 * Find the nearest chest to the player
 */
export function getNearbyChest(room, playerX, playerY, playerRadius) {
  if (!room.chests) {
    return null;
  }

  return (
    room.chests.find((chest) => {
      if (chest.collected) {
        return false;
      }

      const rect = getChestRect(chest);
      return circleIntersectsRect(
        playerX,
        playerY,
        playerRadius + CHEST_INTERACT_RANGE,
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );
    }) || null
  );
}

/**
 * Handle chest interaction
 */
export function handleChestInteraction(room, player, roomById, currentRoomId, interactQueued) {
  if (!interactQueued) {
    return { applied: false, itemName: null };
  }

  const chest = getNearbyChest(room, player.x, player.y, player.radius);

  if (!chest) {
    return { applied: false, itemName: null };
  }

  chest.item.apply(player);
  chest.collected = true;
  return { applied: true, itemName: chest.item.name };
}
