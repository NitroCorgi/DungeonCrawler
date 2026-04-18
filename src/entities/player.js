/**
 * Player entity and logic
 */

import { WIDTH, HEIGHT, PLAYER_SPEED, PLAYER_RADIUS, PLAYER_BASE_HEALTH } from "../constants.js";
import { moveWithLayoutCollision } from "../systems/physics.js";
import { keys } from "../systems/input.js";

/**
 * Create a new player entity
 */
export function createPlayer() {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    health: PLAYER_BASE_HEALTH,
    maxHealth: PLAYER_BASE_HEALTH,
    radius: PLAYER_RADIUS,
  };
}

/**
 * Reset player to base state
 */
export function resetPlayer(player) {
  player.maxHealth = PLAYER_BASE_HEALTH;
  player.health = PLAYER_BASE_HEALTH;
}

/**
 * Set player position
 */
export function setPlayerPosition(player, x, y) {
  player.x = x;
  player.y = y;
}

/**
 * Update player position based on input
 */
export function updatePlayerMovement(player, room, dt) {
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
}

/**
 * Damage player
 */
export function damagePlayer(player, damage) {
  player.health -= damage;
  return player.health <= 0;
}

/**
 * Heal player
 */
export function healPlayer(player, amount) {
  player.health = Math.min(player.health + amount, player.maxHealth);
}

/**
 * Increase player max health
 */
export function increaseMaxHealth(player, amount) {
  player.maxHealth += amount;
  player.health = Math.min(player.health + amount, player.maxHealth);
}
