# Enemy Assets

Sprites for enemy characters rendered inside dungeon rooms.
Enemy radius is 14 px (diameter **28 × 28 px**).

| Asset file   | Dimensions | Description                                                              |
|--------------|------------|--------------------------------------------------------------------------|
| `enemy.png`  | 28 × 28 px | Generic enemy sprite, centered on the enemy's position (radius 14)      |

Future enemy types (e.g. boss, ranged, fast) should each get their own sprite file and
a matching key in the `ASSETS` registry in `game.js`.

If any file is missing or fails to load the renderer draws a red filled circle as fallback.
