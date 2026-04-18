# Architecture & Dependency Map

## Dependency Graph

```
game.js
   └── GameManager
       ├── constants.js
       ├── entities/player.js
       │   ├── constants.js
       │   ├── systems/physics.js
       │   │   ├── constants.js
       │   │   ├── utils.js
       │   │   └── systems/layout.js
       │   │       └── constants.js
       │   └── systems/input.js
       ├── entities/projectiles.js
       │   ├── constants.js
       │   ├── utils.js
       │   └── systems/physics.js
       ├── entities/enemies.js
       │   ├── systems/physics.js
       │   ├── entities/projectiles.js
       │   └── utils.js
       ├── systems/input.js
       ├── systems/inventory.js
       │   ├── constants.js
       │   ├── utils.js
       │   └── systems/physics.js
       ├── systems/navigation.js
       │   ├── constants.js
       │   └── systems/layout.js
       ├── systems/physics.js
       ├── systems/dungeon.js
       │   ├── constants.js
       │   ├── utils.js
       │   ├── systems/layout.js
       │   └── utils/level-gen.js
       ├── systems/rooms.js
       │   ├── constants.js
       │   ├── utils.js
       │   └── systems/layout.js
       ├── ui/renderer.js
       │   ├── constants.js
       │   ├── ASSETS (from assets.js)
       │   └── systems/layout.js
       ├── utils/level-gen.js
       └── utils.js
```

## Dependency Depth Analysis

**Layer 0 (No dependencies)**
- constants.js
- utils.js
- assets.js

**Layer 1 (Use Layer 0)**
- systems/layout.js
- systems/physics.js
- utils/level-gen.js
- systems/input.js

**Layer 2 (Use Layer 1)**
- entities/player.js
- entities/projectiles.js
- entities/enemies.js
- systems/dungeon.js
- systems/rooms.js
- systems/inventory.js
- systems/navigation.js

**Layer 3 (Use Layer 2)**
- ui/renderer.js
- GameManager

**Layer 4 (Entry point)**
- game.js

This layered structure ensures no circular dependencies and clear information flow.

## Data Flow

```
INPUT HANDLING (systems/input.js)
       ↓
PLAYER UPDATE (entities/player.js)
       ├─→ PHYSICS (systems/physics.js)
       ├─→ NAVIGATION (systems/navigation.js)
       └─→ INVENTORY (systems/inventory.js)
       ↓
ENEMY UPDATE (entities/enemies.js)
       └─→ PROJECTILE CREATION (entities/projectiles.js)
       ↓
PROJECTILE UPDATE (entities/projectiles.js)
       └─→ PHYSICS (collision detection)
       ↓
RENDERING (ui/renderer.js)
       └─→ LAYOUT (systems/layout.js)
```

## Communication Patterns

### 1. Direct Function Calls
- UI renders by calling `drawRoom()`, `drawHud()` with data
- GameManager calls system functions sequentially

### 2. Data Passing
- GameManager maintains state objects (player, rooms, projectiles)
- Passes them by reference to update functions
- Functions modify state in-place or return new objects

### 3. Callbacks
- Input system uses callbacks for mouse clicks
- Project update system uses callback for player damage

## State Management

### Global State (in GameManager)
```javascript
{
  level: number,
  roomCount: number,
  gameOver: boolean,
  player: { x, y, health, maxHealth, radius },
  projectiles: array,
  rooms: array,
  roomById: Map,
  currentRoomId: number,
  goalRoomId: number,
  discoveredRoomIds: Set,
  hasDungeonMap: boolean,
  hasDungeonCompass: boolean,
  levelMessageTimer: number,
  pickupSplashText: string,
  pickupSplashTimer: number
}
```

### Entity State (distributed)
- Player state in `entities/player.js` structures
- Enemy state in room objects
- Projectile state in projectiles array
- Chest state in room objects

## Module Communication Matrix

| From | To | How | Data |
|------|-----|------|------|
| GameManager | entities/player.js | Function call | player object, dt |
| entities/player.js | systems/physics.js | Function call | entity, dx, dy, room |
| systems/physics.js | systems/layout.js | Function call | room, x, y, radius |
| entities/enemies.js | entities/projectiles.js | Push to array | projectile object |
| systems/inventory.js | systems/physics.js | Function call | room, player, radius |
| systems/navigation.js | systems/layout.js | Function call | room, side |
| ui/renderer.js | systems/layout.js | Function call | room |
| GameManager | ui/renderer.js | Function call | ctx, entities, state |

## Coupling Analysis

### Loose Coupling ✅
- Systems don't know about each other's internals
- Communicate through function parameters
- Can be replaced or modified independently

### Tight Coupling ⚠️
- constants.js used everywhere (intentional - shared config)
- utils.js used everywhere (intentional - utilities)
- GameManager knows about all systems (intentional - orchestrator)

## Design Patterns Used

1. **Layered Architecture** - Separation into logical layers
2. **Dependency Injection** - Parameters rather than globals
3. **Factory Pattern** - Item creation (createMapChestItem, etc.)
4. **Observer Pattern** - Input callbacks
5. **Strategy Pattern** - Different room types with configurations
6. **Repository Pattern** - roomById Map for quick lookups
7. **Module Pattern** - Encapsulation via ES modules

## Performance Characteristics

| Operation | Complexity | Location |
|-----------|-----------|----------|
| Collision detection | O(n) | systems/physics.js |
| Door range lookup | O(1) | systems/layout.js (cached) |
| Enemy targeting | O(1) | entities/enemies.js |
| Projectile updates | O(m*n) | entities/projectiles.js |
| Room rendering | O(grid) | ui/renderer.js |
| Minimap rendering | O(visible rooms) | ui/renderer.js |

## Extension Points

Easy to add new functionality by:

1. **New Entity Type** → Create `entities/newtype.js`
2. **New Mechanic** → Create `systems/newmechanic.js`
3. **Configuration Variant** → Extend `constants.js`
4. **New UI Element** → Extend `ui/renderer.js`
5. **New Item** → Add factory to `systems/rooms.js`

## Testing Strategy

```
Unit Tests (Per Module)
├── constants (validate values)
├── utils (math, collision)
├── entities (state, logic)
└── systems (core algorithms)

Integration Tests (Multi-module)
├── Player movement + collision
├── Enemy behavior + projectiles
├── Room transitions
└── Item collection

End-to-End Tests (Full Game)
├── Level progression
├── Game over condition
└── Feature completeness
```

---

This architecture enables rapid development, easy testing, and confident refactoring.
