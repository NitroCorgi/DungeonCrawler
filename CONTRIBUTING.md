# Contributing & Maintenance Guide

## Project Standards

This refactored codebase follows industry best practices:

### Code Organization
- **Layered Architecture**: Clear separation between config, utilities, entities, systems, UI, and orchestration
- **Single Responsibility**: Each module has one job
- **Minimal Coupling**: Modules communicate through well-defined interfaces
- **No Circular Dependencies**: Dependency graph is acyclic

### Module Size
- Target: 50-200 lines per module
- Smaller modules are more testable and maintainable
- Complex logic is broken into focused functions

### Naming Conventions
- **Files**: kebab-case (e.g., `game-manager.js`)
- **Functions**: camelCase (e.g., `calculateDistance()`)
- **Classes**: PascalCase (e.g., `GameManager`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `PLAYER_SPEED`)

### Documentation
- Use JSDoc comments on exported functions
- Include parameter types and return types
- Explain non-obvious logic

Example:
```javascript
/**
 * Check if player reached the goal position
 * @returns {boolean} True if player is within goal bounds
 */
export function reachedGoal() { ... }
```

## Adding New Features

### 1. New Item Type

**Step 1**: Create factory in `systems/rooms.js`
```javascript
export function createSpeedBoost() {
  return {
    name: "Speed Boost",
    apply: (player) => {
      player.speed = Math.min(player.speed * 1.2, MAX_PLAYER_SPEED);
    },
  };
}
```

**Step 2**: Integrate in `GameManager.assignSpecialChests()`
```javascript
assignSpecial(createSpeedBoost);
```

### 2. New Enemy Type

**Step 1**: Define in `entities/enemies.js` or separate file
```javascript
export function updateFlyingEnemies(room, player, projectiles, currentRoomId, dt) {
  // Custom AI for flying enemies
}
```

**Step 2**: Use in `systems/dungeon.js` when generating enemies

### 3. New Game System

**Step 1**: Create `systems/newsystem.js`
```javascript
export function updateNewSystem(state, dt) {
  // Update logic
}

export function renderNewUI(ctx, state) {
  // Rendering logic
}
```

**Step 2**: Integrate in `GameManager`
```javascript
constructor() {
  // Add to state
  this.newSystemState = initializeNewSystem();
}

update(dt) {
  // Call update
  updateNewSystem(this.newSystemState, dt);
}

render() {
  // Call render
  renderNewUI(this.ctx, this.newSystemState);
}
```

## Refactoring Safely

### Principle 1: Test Before Refactoring
- Ensure game works completely
- Know what behavior you're preserving

### Principle 2: Refactor in Single Module
- Make changes to one module at a time
- Run game after each module refactor
- Verify no regressions

### Principle 3: Preserve Interfaces
- If changing function signature, update all callers
- If removing export, check all imports
- Use search/replace carefully

### Principle 4: Incremental Changes
- Don't refactor everything at once
- Make small, verifiable improvements
- Commit changes frequently

## Code Review Checklist

When reviewing new code:

- [ ] Module has clear, single responsibility
- [ ] Functions have clear inputs/outputs
- [ ] No circular dependencies introduced
- [ ] JSDoc comments on exports
- [ ] Follows naming conventions
- [ ] No redundant code (utilities extracted)
- [ ] Proper error handling
- [ ] Minimal dependencies
- [ ] Works in isolation and integrated

## Debugging Techniques

### 1. Module Isolation Testing
```javascript
// Test module functionality independently
import { someFunctionthat } from "./src/systems/specific.js";
const result = someFunction(testData);
console.log(result);
```

### 2. State Inspection
```javascript
// In GameManager, log state at key points
console.log("Player state:", this.player);
console.log("Current room:", this.roomById.get(this.currentRoomId));
```

### 3. Function Tracing
```javascript
// Add logging at function entry/exit
export function importantFunction(data) {
  console.log("Entering importantFunction with:", data);
  // ... logic ...
  console.log("Exiting importantFunction");
}
```

### 4. Visual Debugging
In `ui/renderer.js`, add temporary visual indicators:
```javascript
// Draw collision boxes
ctx.strokeStyle = "red";
ctx.strokeRect(x, y, width, height);

// Draw vectors
ctx.strokeStyle = "green";
ctx.beginPath();
ctx.moveTo(x, y);
ctx.lineTo(x + vx, y + vy);
ctx.stroke();
```

## Performance Optimization

### Identify Bottlenecks
1. Use Chrome DevTools Performance tab
2. Profile specific function groups
3. Measure before/after changes

### Common Optimizations

**Reduce object creation**
- Reuse arrays instead of creating new ones
- Cache calculations
- Pool objects instead of garbage collecting

**Reduce collision checks**
- Use spatial partitioning (already implemented in physics)
- Early exit checks
- Limit checks to nearby entities

**Optimize rendering**
- Draw visible objects only
- Use asset caching (already implemented)
- Batch draw operations

## Version Management

### Semantic Versioning
- **Major (X.0.0)**: Breaking changes to gameplay
- **Minor (1.X.0)**: New features (items, enemies)
- **Patch (1.0.X)**: Bug fixes

### Before Major Release
- [ ] Test all features
- [ ] Verify no regressions
- [ ] Update documentation
- [ ] Check performance
- [ ] Test on target browsers

## Documentation

### Code Comments
- Explain **why**, not **what** (code shows what)
- Document complex algorithms
- Include examples for unclear functions

### External Documentation
- Keep README updated
- Maintain architecture docs
- Document known issues

Example:
```javascript
/**
 * Check if a circle collides with axis-aligned rectangle.
 * Uses the "closest point" algorithm for fast detection.
 * 
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} cr - Circle radius
 * @param {number} rx - Rectangle left edge X
 * @param {number} ry - Rectangle top edge Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if circle and rectangle overlap
 */
export function circleIntersectsRect(cx, cy, cr, rx, ry, rw, rh) { ... }
```

## Common Pitfalls

### ❌ Don't:
- Import from deeply nested modules directly (use public interfaces)
- Create global state outside GameManager
- Mix concerns in single function
- Ignore TypeErrors silently
- Make synchronous async operations
- Modify parameters directly (use copies)

### ✅ Do:
- Keep modules focused
- Use clear naming
- Extract utilities for reuse
- Handle edge cases
- Document assumptions
- Test integrations
- Follow established patterns

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Frame Rate | 60 FPS | ✓ |
| Player Movement Lag | < 16ms | ✓ |
| Collision Detection | < 5ms | ✓ |
| Rendering | < 10ms | ✓ |
| Dungeon Generation | < 100ms | ✓ |

## Helpful Tools

### Development
- VSCode with ES Module support
- Chrome DevTools (F12)
- http-server for local testing

### Debugging
- console.log() for quick debugging
- Breakpoints in DevTools
- Performance profiler in DevTools

### Code Quality
- ESLint (consider setting up)
- JSDoc validation
- Manual code review

## Future Improvements

### High Priority
- [ ] Add unit tests with Jest
- [ ] Add TypeScript for type safety
- [ ] Add ESLint for code quality

### Medium Priority
- [ ] Add particle effects system
- [ ] Add sound system
- [ ] Add save/load functionality

### Nice to Have
- [ ] Animation system
- [ ] Procedural audio
- [ ] Difficulty selector
- [ ] Advanced AI patterns

## Quick Fixes

### Issue: Game doesn't load
1. Check browser console (F12)
2. Verify imports are correct
3. Check for syntax errors
4. Verify file paths are correct
5. Ensure package.json has `"type": "module"`

### Issue: Feature not working
1. Check GameManager is calling update/render
2. Verify system is being initialized
3. Add console logs to trace execution
4. Check state is being modified correctly

### Issue: Performance regression
1. Profile with DevTools
2. Find bottleneck module
3. Optimize that specific area
4. Re-profile to verify improvement

---

**Remember**: Code is read more often than written. Write for clarity first, optimization second.
