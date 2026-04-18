/**
 * Level generation utility functions
 */

import { WIDTH, HEIGHT, TILE_SIZE } from "../constants.js";
import { randomInt } from "../utils.js";
import { circleHitsRoomObstacles } from "../systems/physics.js";

/**
 * Find a random open position in a room for spawning entities
 */
export function randomOpenPositionInRoom(room, radius) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = randomInt(radius + 1, WIDTH - radius - 1);
    const y = randomInt(radius + 1, HEIGHT - radius - 1);
    if (!circleHitsRoomObstacles(room, x, y, radius)) {
      return { x, y };
    }
  }

  return { x: WIDTH / 2, y: HEIGHT / 2 };
}
