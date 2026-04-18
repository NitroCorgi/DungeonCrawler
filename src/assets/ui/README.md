# UI Assets

Sprites for the heads-up display (HUD) elements drawn over the game canvas.

| Asset file           | Dimensions  | Description                                                          |
|----------------------|-------------|----------------------------------------------------------------------|
| `health-bar-bg.png`  | 190 × 14 px | Health bar background panel (matches the hardcoded bar dimensions)   |
| `health-bar-fill.png`| 1 × 14 px   | Single-pixel wide fill slice; stretch horizontally to current HP %   |

Other HUD surfaces (minimap panel, pickup-splash text, game-over overlay) are drawn
procedurally and do not have sprite counterparts yet.

If any file is missing or fails to load the renderer falls back to solid colored rectangles.
