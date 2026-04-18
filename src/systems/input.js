/**
 * Input handling system
 */

export const keys = new Set();
export const mouse = { x: 0, y: 0 };

let interactQueued = false;

/**
 * Setup keyboard event listeners
 */
export function setupKeyboardListeners(isGameOver, onResetRun, onReload) {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d"].includes(key)) {
      keys.add(key);
    }

    if (key === "e" && !event.repeat) {
      interactQueued = true;
    }

    if (key === "r" && !event.repeat) {
      if (isGameOver()) {
        onResetRun();
        return;
      }

      onReload();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });
}

/**
 * Setup mouse event listeners
 */
export function setupMouseListeners(canvas, WIDTH, HEIGHT, onMouseDown) {
  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    mouse.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      onMouseDown(mouse.x, mouse.y);
    }
  });
}

/**
 * Check if interact key was pressed
 */
export function isInteractQueued() {
  return interactQueued;
}

/**
 * Clear interact queue
 */
export function clearInteractQueue() {
  interactQueued = false;
}

/**
 * Initialize mouse position
 */
export function initializeMouse(WIDTH, HEIGHT) {
  mouse.x = WIDTH / 2;
  mouse.y = HEIGHT / 2;
}
