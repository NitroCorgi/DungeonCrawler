# DungeonCrawler - Refactored Modular Architecture

## Overview

The game has been successfully refactored from a monolithic `game.js` file into a modular, well-organized structure following best practices for maintainability, testability, and scalability.

## Project Structure

```
src/
├── constants.js           # Game configuration and constants
├── assets.js              # Image loading and asset management
├── utils.js               # Shared utility functions
├── game-manager.js        # Main game orchestrator/controller
│
├── entities/              # Game entities (player, enemies, projectiles)
│   ├── player.js          # Player entity and logic
│   ├── enemies.js         # Enemy AI and behavior
│   └── projectiles.js     # Projectile system and collision
│
├── systems/               # Core game systems
│   ├── layout.js          # Room layout generation and parsing
│   ├── physics.js         # Collision detection and movement
│   ├── dungeon.js         # Dungeon generation algorithm
│   ├── rooms.js           # Room management, enemies, chests
│   ├── inventory.js       # Item/chest interaction system
│   ├── input.js           # Input handling (keyboard, mouse)
│   └── navigation.js      # Room transitions and door logic
│
├── ui/                    # User interface and rendering
│   └── renderer.js        # Canvas rendering (game, HUD, minimap)
│
└── utils/                 # Utility modules
    └── level-gen.js       # Level generation utilities

game.js                     # Entry point (minimal, imports GameManager)
index.html                  # HTML canvas container
package.json               # Project configuration
```

## Module Descriptions

### Core Modules

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `constants.js` | Game configuration, settings, defaults | WIDTH, HEIGHT, PLAYER_SPEED, DEFAULT_ROOM_TYPES, etc. |
| `assets.js` | Image loading and caching | ASSETS object with sprite references |
| `utils.js` | Math, random, collision utilities | randomInt(), shuffle(), circleHit(), etc. |

### Entity Modules

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `entities/player.js` | Player state and movement | createPlayer(), updatePlayerMovement(), damagePlayer() |
| `entities/enemies.js` | Enemy AI and behavior | updateEnemies() |
| `entities/projectiles.js` | Projectile logic & collision | shootFromPlayer(), shootFromEnemy(), updateProjectiles() |

### System Modules

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `systems/layout.js` | Room layout generation and parsing | createDefaultLayout(), normalizeLayout(), parseRoomTypeText() |
| `systems/physics.js` | Collision detection | circleHitsLayout(), moveWithLayoutCollision() |
| `systems/dungeon.js` | Dungeon generation | generateDungeon(), pickRoomType(), loadRoomTypesFromFiles() |
| `systems/rooms.js` | Room management & population | populateRoom(), collectChestSpawnPoints(), createMapChestItem() |
| `systems/inventory.js` | Item collection & interaction | getNearbyChest(), handleChestInteraction() |
| `systems/input.js` | Input event handling | setupKeyboardListeners(), setupMouseListeners(), isInteractQueued() |
| `systems/navigation.js` | Room transitions | checkRoomTransition(), placePlayerAtDoor(), isInDoorRange() |

### UI Module

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `ui/renderer.js` | Canvas rendering | drawRoom(), drawHud() |

### Game Manager

The `GameManager` class orchestrates all systems:
- Manages game state (level, rooms, player, projectiles)
- Coordinates input -> update -> render loop
- Handles level loading and transitions
- Integrates all systems into a cohesive whole

## Architecture Principles

### 1. **Separation of Concerns**
- Each module has a single, well-defined responsibility
- Systems are decoupled and communicate through well-defined interfaces
- Entities are pure data with associated logic

### 2. **Modularity**
- Easy to test individual systems in isolation
- Simple to extend or replace functionality
- Clear dependency graph with minimal circular dependencies

### 3. **Reusability**
- Utility functions are extracted and made generic
- Systems accept parameters rather than relying on globals
- No reliance on game state except through explicit parameters

### 4. **Maintainability**
- Clear file organization mirrors conceptual structure
- Consistent naming conventions
- Comprehensive JSDoc comments on exported functions
- Logical grouping of related functionality

## Key Improvements Over Monolithic Approach

| Aspect | Before | After |
|--------|--------|-------|
| File Count | 1 (~1500 lines) | 18 (~100-200 lines each) |
| Function Organization | Mixed concerns | Clear separation |
| Testing | Difficult, requires full game | Easy integration testing of modules |
| Debugging | Hard to trace issues | Easy to isolate problems to specific systems |
| Code Reuse | Limited | Functions designed for reusability |
| Onboarding | Overwhelming | Clear structure, easy to understand |

## Usage

The game is initialized in `game.js` with just three lines:

```javascript
import { GameManager } from "./src/game-manager.js";

const game = new GameManager();
game.initialize();
```

The GameManager handles all initialization, event setup, and the game loop.

## Development Workflow

### Adding a New Feature

1. **Identify related systems** - Determine which modules need changes
2. **Update/create modules** - Make changes in isolated modules
3. **Update GameManager** if needed - Wire new functionality into the main controller
4. **Test independently** - Test modules in isolation before integration

### Example: Adding a New Enemy Type

1. Define enemy in `entities/enemies.js` or create `entities/enemy-types.js`
2. Add to room population in `systems/rooms.js`
3. Ensure enemy is rendered in `ui/renderer.js`
4. Test the enemy AI behavior

### Example: Adding a New Item

1. Add item factory to `systems/rooms.js`
2. Update special chest assignment in `GameManager`
3. Define item effect in the factory function
4. Items automatically integrate with chest system

## Performance Considerations

- Asset preloading in `assets.js` (ready flag)
- Optimized collision detection with spatial partitioning (grid-based)
- Efficient projectile cleanup and room filtering
- Minimal recalculation of derived values

## Future Enhancements

Possible improvements with this modular structure:

- **Particle system** - New `systems/particles.js`
- **Sound system** - New `systems/audio.js`
- **Save/load** - Enhanced `systems/inventory.js` and game state
- **Difficulty settings** - Extend `constants.js` with profiles
- **Enemy varieties** - Multiple enemy files in `entities/`
- **Weapon system** - Extend `entities/projectiles.js`
- **Animations** - New `systems/animation.js`
- **UI polish** - Expand `ui/renderer.js` with additional HUD elements

## Migration Notes

The refactoring maintains 100% feature parity with the original code:
- All game mechanics work identically
- Same asset loading and rendering
- Identical game balance and difficulty
- No changes to game.html or room definitions

Entry point has changed to use ES modules (`type: "module"` in package.json).
