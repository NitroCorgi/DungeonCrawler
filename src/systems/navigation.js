/**
 * Room transition and navigation system
 */

import { WIDTH, HEIGHT, DOOR_SIZE } from "../constants.js";
import { getDoorRanges, getDoorCenter } from "./layout.js";

/**
 * Check if a coordinate is within door range
 */
export function isInDoorRange(side, x, y, room) {
  const ranges = getDoorRanges(room, side);
  const coordinate = side === "n" || side === "s" ? x : y;

  if (ranges.length === 0) {
    const halfDoor = DOOR_SIZE / 2;
    const center = side === "n" || side === "s" ? WIDTH / 2 : HEIGHT / 2;
    return coordinate >= center - halfDoor && coordinate <= center + halfDoor;
  }

  return ranges.some((range) => coordinate >= range.min && coordinate <= range.max);
}

/**
 * Place player at a door on the specified side
 */
export function placePlayerAtDoor(player, room, side, radius) {
  const doorCenter = getDoorCenter(room, side, WIDTH, HEIGHT);
  
  if (side === "n") {
    player.x = doorCenter;
    player.y = radius + 3;
  } else if (side === "s") {
    player.x = doorCenter;
    player.y = HEIGHT - radius - 3;
  } else if (side === "w") {
    player.x = radius + 3;
    player.y = doorCenter;
  } else if (side === "e") {
    player.x = WIDTH - radius - 3;
    player.y = doorCenter;
  }
}

/**
 * Check if player should transition to adjacent room
 */
export function checkRoomTransition(player, room, roomById, currentRoomId) {
  const r = player.radius;
  const edgeTolerance = 6;
  let nextRoomId = null;
  let exitSide = null;

  if (player.y <= r + edgeTolerance) {
    const next = room.neighbors.n;
    if (isInDoorRange("n", player.x, player.y, room) && next !== null) {
      nextRoomId = next;
      exitSide = "s";
    } else {
      player.y = r;
    }
  }

  if (player.y >= HEIGHT - r - edgeTolerance) {
    const next = room.neighbors.s;
    if (isInDoorRange("s", player.x, player.y, room) && next !== null) {
      nextRoomId = next;
      exitSide = "n";
    } else {
      player.y = HEIGHT - r;
    }
  }

  if (player.x <= r + edgeTolerance) {
    const next = room.neighbors.w;
    if (isInDoorRange("w", player.x, player.y, room) && next !== null) {
      nextRoomId = next;
      exitSide = "e";
    } else {
      player.x = r;
    }
  }

  if (player.x >= WIDTH - r - edgeTolerance) {
    const next = room.neighbors.e;
    if (isInDoorRange("e", player.x, player.y, room) && next !== null) {
      nextRoomId = next;
      exitSide = "w";
    } else {
      player.x = WIDTH - r;
    }
  }

  return { nextRoomId, exitSide };
}
