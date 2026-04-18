# Component Assets

Tile and interactive object sprites for the dungeon room renderer.
All tile sprites must match TILE_SIZE, which is `canvas.width / 24` (960 / 24 = **40 × 40 px**).

| Asset file              | Dimensions | Description                                              |
|-------------------------|------------|----------------------------------------------------------|
| `floor.png`             | 40 × 40 px | Standard walkable floor tile                             |
| `wall.png`              | 40 × 40 px | Solid wall tile (impassable)                             |
| `door-open.png`         | 40 × 40 px | Door tile when the room is clear and the door is open    |
| `door-closed.png`       | 40 × 40 px | Door tile when enemies are alive and the door is locked  |
| `chest-closed.png`      | 28 × 28 px | Treasure chest waiting to be opened (`TILE_SIZE × 0.7`) |
| `goal.png`              | 40 × 40 px | Level-exit marker (green square)                         |
| `projectile-player.png` | 10 × 10 px | Player bullet (radius 5, diameter 10)                    |
| `projectile-enemy.png`  | 10 × 10 px | Enemy bullet  (radius 5, diameter 10)                    |

If any file is missing or fails to load the renderer falls back to the built-in colored rectangles and circles.
