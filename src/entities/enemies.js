/**
 * Enemy entity and AI system
 */

import { moveWithLayoutCollision } from "../systems/physics.js";
import { shootFromEnemy } from "./projectiles.js";
import { randomFloat } from "../utils.js";

/**
 * Update all enemies in current room
 */
export function updateEnemies(room, player, projectiles, currentRoomId, dt) {
  for (const enemy of room.enemies) {
    // Move towards player
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const vx = (dx / dist) * enemy.speed * dt;
      const vy = (dy / dist) * enemy.speed * dt;
      moveWithLayoutCollision(enemy, vx, vy, room);
    }

    // Shoot at player
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0) {
      const projectile = shootFromEnemy(enemy, player.x, player.y, currentRoomId);
      if (projectile) {
        projectiles.push(projectile);
      }
      enemy.shootCooldown = randomFloat(enemy.shootCooldownMin, enemy.shootCooldownMax);
    }
  }
}

/**
 * Check for dead enemies and remove them
 */
export function cleanupDeadEnemies(room) {
  room.enemies = room.enemies.filter((enemy) => enemy.hp > 0);
}
