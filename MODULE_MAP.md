# Module Organization Quick Reference

## 📁 Directory Structure

```
DungeonCrawler/
├── game.js ........................ Entry point (minimal orchestration)
├── index.html ..................... HTML container
├── package.json ................... Project config (type: "module")
│
├── 📄 Documentation
│   ├── REFACTORING.md ............. Complete refactoring guide
│   ├── REFACTORING_SUMMARY.md ..... High-level overview
│   ├── ARCHITECTURE.md ............ Technical architecture
│   └── MODULE_MAP.md .............. This file
│
└── src/ ........................... Source code root
    ├── constants.js ............... Game configuration & constants
    ├── assets.js .................. Image loading & management
    ├── utils.js ................... Shared utility functions
    ├── game-manager.js ............ Main game orchestrator
    │
    ├── 🎮 entities/ ............... Game entities & behaviors
    │   ├── player.js .............. Player state, movement, health
    │   ├── enemies.js ............. Enemy AI & shooting
    │   └── projectiles.js ......... Projectile physics & collision
    │
    ├── ⚙️ systems/ ................ Core game systems
    │   ├── layout.js .............. Room layout generation
    │   ├── physics.js ............. Collision detection & movement
    │   ├── dungeon.js ............. Dungeon generation algorithm
    │   ├── rooms.js ............... Room population & management
    │   ├── inventory.js ........... Item/chest interaction
    │   ├── input.js ............... Keyboard & mouse input
    │   └── navigation.js .......... Room transitions & doors
    │
    ├── 🎨 ui/ ..................... User interface & rendering
    │   └── renderer.js ............ Canvas drawing (game, HUD, minimap)
    │
    └── 🛠️ utils/ .................. Utility modules
        └── level-gen.js ........... Level generation utilities
```

## 📋 Module Quick Reference

### Core Configuration
| File | Exports | Purpose |
|------|---------|---------|
| `constants.js` | WIDTH, HEIGHT, PLAYER_SPEED, DEFAULT_ROOM_TYPES, etc. | Game configuration |
| `assets.js` | ASSETS object | Sprite loading & caching |

### Core Utilities
| File | Key Functions | Purpose |
|------|------|---------|
| `utils.js` | randomInt, shuffle, circleHit, circleIntersectsRect | Math & collision helpers |
| `utils/level-gen.js` | randomOpenPositionInRoom | Spawn position generation |

### Entities
| File | Key Functions | Purpose |
|------|------|---------|
| `entities/player.js` | createPlayer, updatePlayerMovement, damagePlayer | Player logic |
| `entities/enemies.js` | updateEnemies | Enemy AI behavior |
| `entities/projectiles.js` | shootFromPlayer, updateProjectiles | Projectile system |

### Systems
| File | Key Functions | Purpose |
|------|------|---------|
| `systems/layout.js` | createDefaultLayout, normalizeLayout, parseRoomTypeText | Room layouts |
| `systems/physics.js` | circleHitsLayout, moveWithLayoutCollision | Collision & movement |
| `systems/dungeon.js` | generateDungeon, pickRoomType, loadRoomTypesFromFiles | Dungeon generation |
| `systems/rooms.js` | populateRoom, collectChestSpawnPoints, createMapChestItem | Room management |
| `systems/inventory.js` | handleChestInteraction, getNearbyChest | Item interaction |
| `systems/input.js` | setupKeyboardListeners, isInteractQueued | Input handling |
| `systems/navigation.js` | checkRoomTransition, placePlayerAtDoor | Room transitions |

### UI
| File | Key Functions | Purpose |
|------|------|---------|
| `ui/renderer.js` | drawRoom, drawHud | Canvas rendering |

### Orchestration
| File | Class/Exports | Purpose |
|------|------|---------|
| `game-manager.js` | GameManager class | Main game controller |
| `game.js` | Initialization | Entry point |

## 🔄 Function Dependency Map

### Critical Paths

**Player Movement:**
```
updatePlayerMovement()
  └─ moveWithLayoutCollision()
      ├─ circleHitsLayout()
      └─ circleHitsChest()
```

**Combat:**
```
shootFromPlayer() → projectiles.push()
updateProjectiles()
  └─ circleHit() [enemy/player collision]
```

**Room Transitions:**
```
checkRoomTransition()
  ├─ isInDoorRange()
  └─ placePlayerAtDoor()
```

## 📝 Common Tasks & Where to Make Changes

| Goal | Files to Modify |
|------|------------------|
| Add new item | `systems/rooms.js` (create factory function) |
| Add new enemy type | `entities/enemies.js`, `systems/rooms.js` |
| Adjust player speed | `constants.js` (PLAYER_SPEED) |
| Change room size | `constants.js` (GRID_COLS, GRID_ROWS, TILE_SIZE) |
| Create new power-up | `systems/rooms.js` (add special chest item) |
| Modify collision | `systems/physics.js` |
| Add HUD element | `ui/renderer.js` (drawHud) |
| Adjust AI behavior | `entities/enemies.js` |
| Change rendering | `ui/renderer.js` |
| Modify dungeon generation | `systems/dungeon.js` or `systems/layout.js` |

## 🎯 Code Organization Philosophy

### Single Responsibility
- Each module does ONE thing well
- Functions have clear input/output
- No side effects unless necessary

### Minimal Dependencies
- Lower layers don't depend on higher layers
- Data flows downward only
- Clear import chains

### Reusability
- Functions designed to be used in multiple contexts
- No hidden state or assumptions
- Parameters over side effects

### Testability
- Modules can be imported independently
- Functions are pure where possible
- Easy to mock dependencies

## 📚 Learning Path

For new developers:

1. **Start**: Read `constants.js` - understand game config
2. **Understand**: Read `game-manager.js` - see how systems integrate
3. **Explore**: Look at `entities/player.js` - see entity pattern
4. **Deep Dive**: Study `systems/physics.js` - collision logic
5. **Practice**: Modify constants, add new items
6. **Extend**: Create new entity or system

## 🔍 File Size Reference

```
constants.js ............ ~70 lines (config)
assets.js ............... ~20 lines (asset refs)
utils.js ................ ~50 lines (utilities)
entities/player.js ...... ~80 lines
entities/enemies.js ..... ~35 lines
entities/projectiles.js . ~100 lines
systems/layout.js ....... ~150 lines
systems/physics.js ...... ~70 lines
systems/dungeon.js ...... ~90 lines
systems/rooms.js ........ ~180 lines
systems/inventory.js .... ~50 lines
systems/input.js ........ ~60 lines
systems/navigation.js ... ~90 lines
ui/renderer.js .......... ~270 lines
utils/level-gen.js ...... ~20 lines
game-manager.js ......... ~250 lines
game.js ................. ~12 lines (entry point)
```

**Total organized code**: ~1,600 lines (same as original, better structured)

## 🚀 Development Workflow

### Adding a Feature
1. Identify which layer needs changes
2. Create/modify module(s) in that layer
3. Update GameManager if needed
4. Test in isolation first
5. Run full game to verify integration

### Debugging
1. Enable console logging in specific module
2. Trace function calls through dependency chain
3. Check GameManager state
4. Verify inputs/outputs at boundaries

### Refactoring
1. Module structure makes localized changes safe
2. Can refactor one system without affecting others
3. Clear interfaces prevent breaking changes
4. Easy to add new variation without modifying originals

---

**Key Principle**: Each module is a self-contained unit that does one job well.
