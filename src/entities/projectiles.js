/**
 * Projectile entity and system
 */

import {
  PLAYER_PROJECTILE_SPEED,
  ENEMY_PROJECTILE_SPEED,
  WIDTH,
  HEIGHT,
  PLAYER_SHOT_INACCURACY_DEGREES,
} from "../constants.js";
import { circleHit } from "../utils.js";
import { circleHitsRoomObstacles } from "../systems/physics.js";

/**
 * Shoot a projectile from the player
 */
export function shootFromPlayer(player, targetX, targetY, currentRoomId) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return null;
  }

  const baseAngle = Math.atan2(dy, dx);
  const spreadRadians = (PLAYER_SHOT_INACCURACY_DEGREES * Math.PI) / 180;
  const inaccuracyOffset = (Math.random() * 2 - 1) * spreadRadians;
  const shotAngle = baseAngle + inaccuracyOffset;

  return {
    x: player.x,
    y: player.y,
    vx: Math.cos(shotAngle) * PLAYER_PROJECTILE_SPEED,
    vy: Math.sin(shotAngle) * PLAYER_PROJECTILE_SPEED,
    radius: 4,
    owner: "player",
    roomId: currentRoomId,
    alive: true,
  };
}

/**
 * Shoot a projectile from an enemy
 */
export function shootFromEnemy(enemy, playerX, playerY, currentRoomId) {
  const dx = playerX - enemy.x;
  const dy = playerY - enemy.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return null;
  }

  return {
    x: enemy.x,
    y: enemy.y,
    vx: (dx / length) * ENEMY_PROJECTILE_SPEED,
    vy: (dy / length) * ENEMY_PROJECTILE_SPEED,
    radius: 5,
    owner: "enemy",
    roomId: currentRoomId,
    alive: true,
  };
}

/**
 * Update all projectiles
 */
export function updateProjectiles(projectiles, currentRoom, currentRoomId, player, onPlayerHit) {
  for (const projectile of projectiles) {
    if (!projectile.alive) {
      continue;
    }

    projectile.x += projectile.vx * (1 / 60); // Assuming 60fps
    projectile.y += projectile.vy * (1 / 60);

    // Remove projectiles that go off-screen
    if (
      projectile.x < -20 ||
      projectile.x > WIDTH + 20 ||
      projectile.y < -20 ||
      projectile.y > HEIGHT + 20
    ) {
      projectile.alive = false;
      continue;
    }

    // Skip updates if projectile is in different room
    if (projectile.roomId !== currentRoomId) {
      continue;
    }

    // Check collision with layout
    if (circleHitsRoomObstacles(currentRoom, projectile.x, projectile.y, projectile.radius)) {
      projectile.alive = false;
      continue;
    }

    // Handle player projectiles
    if (projectile.owner === "player") {
      for (const enemy of currentRoom.enemies) {
        if (enemy.hp > 0 && circleHit(projectile, enemy)) {
          enemy.hp -= 1;
          projectile.alive = false;
          break;
        }
      }
    }
    // Handle enemy projectiles
    else if (projectile.owner === "enemy") {
      if (circleHit(projectile, player)) {
        onPlayerHit();
        projectile.alive = false;
      }
    }
  }

  // Remove dead projectiles
  return projectiles.filter((projectile) => projectile.alive);
}

/**
 * Remove dead enemies from room
 */
export function removeDeadEnemies(room) {
  room.enemies = room.enemies.filter((enemy) => enemy.hp > 0);
}

/**
 * Filter projectiles to only those in specific room
 */
export function projectilesInRoom(projectiles, roomId) {
  return projectiles.filter((p) => p.roomId === roomId);
}
