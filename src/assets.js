/**
 * Asset loading and management
 */

function tryLoadImage(src) {
  const entry = { img: new Image(), ready: false };
  entry.img.onload = () => { entry.ready = true; };
  entry.img.src = src;
  return entry;
}

export const ASSETS = {
  player:           tryLoadImage("src/assets/player/player.png"),
  enemy:            tryLoadImage("src/assets/enemies/enemy.png"),
  floor:            tryLoadImage("src/assets/components/floor.png"),
  wall:             tryLoadImage("src/assets/components/wall.png"),
  doorOpen:         tryLoadImage("src/assets/components/door-open.png"),
  doorClosed:       tryLoadImage("src/assets/components/door-closed.png"),
  chest:            tryLoadImage("src/assets/components/chest-closed.png"),
  goal:             tryLoadImage("src/assets/components/goal.png"),
  projectilePlayer: tryLoadImage("src/assets/components/projectile-player.png"),
  projectileEnemy:  tryLoadImage("src/assets/components/projectile-enemy.png"),
  healthBarBg:      tryLoadImage("src/assets/ui/health-bar-bg.png"),
};
