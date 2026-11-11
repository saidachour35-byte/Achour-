/**
 * Achour Player TV Spatial Navigation & Remote Control Engine
 * Supports Android TV, Fire TV Stick, Smart TVs, and standard keyboard navigation.
 */

export type TVDirection = 'up' | 'down' | 'left' | 'right';

export type TVAction = 
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'SELECT'
  | 'BACK'
  | 'PLAY_PAUSE'
  | 'PLAY'
  | 'PAUSE'
  | 'STOP'
  | 'FAST_FORWARD'
  | 'REWIND'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'MENU'
  | 'INFO'
  | 'RED'
  | 'GREEN'
  | 'YELLOW'
  | 'BLUE'
  | 'OTHER';

// Map Android TV, Fire TV, Tizen, WebOS, and Browser key codes to standard TV actions
export function parseTVKeyEvent(e: KeyboardEvent): TVAction {
  const code = e.keyCode;
  const key = e.key;

  // D-Pad UP
  if (key === 'ArrowUp' || code === 19 || code === 38) {
    return 'UP';
  }

  // D-Pad DOWN
  if (key === 'ArrowDown' || code === 20 || code === 40) {
    return 'DOWN';
  }

  // D-Pad LEFT
  if (key === 'ArrowLeft' || code === 21 || code === 37) {
    return 'LEFT';
  }

  // D-Pad RIGHT
  if (key === 'ArrowRight' || code === 22 || code === 39) {
    return 'RIGHT';
  }

  // D-Pad CENTER / OK / SELECT
  if (key === 'Enter' || key === 'Select' || key === 'Ok' || code === 23 || code === 13 || (key === ' ' && !isTextInput(document.activeElement))) {
    return 'SELECT';
  }

  // BACK (Android KEYCODE_BACK = 4, ESC = 27, Browser Backspace = 8, Tizen = 10009, WebOS = 461)
  if (
    key === 'Escape' || 
    key === 'Back' || 
    key === 'GoBack' || 
    code === 4 || 
    code === 27 || 
    code === 10009 || 
    code === 461 ||
    (key === 'Backspace' && !isTextInput(document.activeElement))
  ) {
    return 'BACK';
  }

  // Media Keys
  if (key === 'MediaPlayPause' || code === 179) {
    return 'PLAY_PAUSE';
  }
  if (key === 'MediaPlay' || code === 126 || key === 'Play') {
    return 'PLAY';
  }
  if (key === 'MediaPause' || code === 127 || key === 'Pause') {
    return 'PAUSE';
  }
  if (key === 'MediaStop' || code === 86 || key === 'Stop') {
    return 'STOP';
  }
  if (key === 'MediaFastForward' || code === 228 || code === 90 || key === 'FastFwd') {
    return 'FAST_FORWARD';
  }
  if (key === 'MediaRewind' || code === 227 || code === 89 || key === 'Rewind') {
    return 'REWIND';
  }

  // Channel Up / Down
  if (key === 'ChannelUp' || code === 166 || code === 427 || code === 33 || key === 'PageUp') {
    return 'CHANNEL_UP';
  }
  if (key === 'ChannelDown' || code === 167 || code === 428 || code === 34 || key === 'PageDown') {
    return 'CHANNEL_DOWN';
  }

  // Menu / Context
  if (key === 'Menu' || code === 82 || key === 'ContextMenu' || code === 93) {
    return 'MENU';
  }

  // Color keys
  if (code === 403 || key === 'ColorF0Red' || key === 'r' || key === 'F1') return 'RED';
  if (code === 404 || key === 'ColorF1Green' || key === 'g' || key === 'F2') return 'GREEN';
  if (code === 405 || key === 'ColorF2Yellow' || key === 'y' || key === 'F3') return 'YELLOW';
  if (code === 406 || key === 'ColorF3Blue' || key === 'b' || key === 'F4') return 'BLUE';

  return 'OTHER';
}

export function isTextInput(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

export enum BackPriority {
  ROOT = 0,
  DASHBOARD = 10,
  VIEW = 20,
  SUBVIEW = 50,
  MODAL = 100,
}

/**
 * Universal Priority-based Back Stack Management
 * High priority handlers (modals/popups) always execute before lower priority handlers (views/dashboard).
 */
type BackHandler = () => boolean; // return true if handled, false to pass through

interface RegisteredHandler {
  id: number;
  priority: number;
  handler: BackHandler;
  registeredAt: number;
}

let nextHandlerId = 1;
let backHandlers: RegisteredHandler[] = [];
let lastBackExecutionTime = 0;

export function pushBackHandler(handler: BackHandler, priority: number = BackPriority.VIEW): () => void {
  const id = nextHandlerId++;
  const item: RegisteredHandler = {
    id,
    priority,
    handler,
    registeredAt: Date.now()
  };
  backHandlers.push(item);

  return () => {
    backHandlers = backHandlers.filter(h => h.id !== id);
  };
}

export function executeBackHandler(): boolean {
  const now = Date.now();
  if (now - lastBackExecutionTime < 250) {
    console.log('[BackHandler] Throttled duplicate back event within 250ms');
    return true;
  }

  if (backHandlers.length === 0) {
    console.log('[BackHandler] No handlers registered');
    return false;
  }

  // Sort handlers: highest priority first. If tied, most recently registered first.
  const sorted = [...backHandlers].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.registeredAt - a.registeredAt;
  });

  for (const item of sorted) {
    try {
      if (item.handler()) {
        lastBackExecutionTime = now;
        console.log(`[BackHandler] Handled by priority ${item.priority} (id ${item.id})`);
        return true;
      }
    } catch (e) {
      console.error('[BackHandler] Error executing back handler:', e);
    }
  }

  console.log('[BackHandler] No handler handled the event');
  return false;
}


/**
 * Determines whether an element is visible, enabled, and eligible for TV focus
 */
export function isFocusable(el: HTMLElement): boolean {
  if (!el || el.tabIndex < 0 || el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  
  // Fast visibility & geometry check without layout thrashing
  if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.offsetParent === null) {
    return false;
  }

  return true;
}

/**
 * Queries all focusable elements inside a root container, honoring modal trapping
 */
export function getFocusableElements(root: HTMLElement = document.body): HTMLElement[] {
  // If there is an active top-level modal or drawer, confine focus strictly to that container
  const activeModal = 
    document.querySelector<HTMLElement>('[role="dialog"]:not([aria-hidden="true"])') ||
    document.querySelector<HTMLElement>('.vod-popup-container, .vod-drawer-container') ||
    document.querySelector<HTMLElement>('[data-tv-modal="true"]');

  const container = activeModal && activeModal.contains(root) ? activeModal : (activeModal || root);

  const selector = `
    button, 
    [role="button"], 
    [data-tv-focusable="true"], 
    input:not([type="hidden"]), 
    select, 
    textarea, 
    a[href], 
    [tabindex="0"]
  `;

  const candidates = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return candidates.filter(isFocusable);
}

/**
 * 2D Geometric Spatial Navigation
 * Calculates the best target element in the requested direction based on Euclidean distance,
 * angular alignment, and perpendicular overlap.
 */
let lastNavTime = 0;

export function navigateSpatial(
  direction: TVDirection, 
  root: HTMLElement = document.body,
  customCurrent?: HTMLElement | null
): boolean {
  const now = Date.now();
  if (now - lastNavTime < 15) {
    return true;
  }
  lastNavTime = now;
  const current = customCurrent || (document.activeElement as HTMLElement);
  const focusables = getFocusableElements(root);

  if (focusables.length === 0) return false;

  const actualDirection = direction;

  // If nothing is currently focused, or activeElement is body / root, focus the first logical item
  if (!current || current === document.body || !focusables.includes(current)) {
    focusables[0]?.focus();
    focusables[0]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    return true;
  }

  const currentRect = current.getBoundingClientRect();
  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;

  let bestCandidate: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const candidate of focusables) {
    if (candidate === current) continue;

    const candRect = candidate.getBoundingClientRect();
    const candCenterX = candRect.left + candRect.width / 2;
    const candCenterY = candRect.top + candRect.height / 2;

    const dx = candCenterX - currentCenterX;
    const dy = candCenterY - currentCenterY;

    let isStrictlyInDirection = false;
    let mainDist = 0;
    let crossDist = 0;

    switch (actualDirection) {
      case 'up':
        // Candidate must be above current element
        isStrictlyInDirection = candRect.bottom <= currentRect.bottom + 4 && dy < 0;
        mainDist = -dy;
        crossDist = Math.abs(dx);
        break;
      case 'down':
        // Candidate must be below current element
        isStrictlyInDirection = candRect.top >= currentRect.top - 4 && dy > 0;
        mainDist = dy;
        crossDist = Math.abs(dx);
        break;
      case 'left':
        // Candidate must be to the left
        isStrictlyInDirection = candRect.right <= currentRect.right + 4 && dx < 0;
        mainDist = -dx;
        crossDist = Math.abs(dy);
        break;
      case 'right':
        // Candidate must be to the right
        isStrictlyInDirection = candRect.left >= currentRect.left - 4 && dx > 0;
        mainDist = dx;
        crossDist = Math.abs(dy);
        break;
    }

    if (!isStrictlyInDirection) continue;

    // Overlap bonus: if candidate shares coordinates along the orthogonal axis, it's heavily favored
    let overlap = 0;
    if (direction === 'up' || direction === 'down') {
      const overlapStart = Math.max(currentRect.left, candRect.left);
      const overlapEnd = Math.min(currentRect.right, candRect.right);
      overlap = Math.max(0, overlapEnd - overlapStart);
    } else {
      const overlapStart = Math.max(currentRect.top, candRect.top);
      const overlapEnd = Math.min(currentRect.bottom, candRect.bottom);
      overlap = Math.max(0, overlapEnd - overlapStart);
    }

    // Weighted score: favor closer elements along main travel axis, penalize high cross distance
    const overlapWeight = overlap > 0 ? 0.3 : 1.0;
    const score = (mainDist * 1.0 + crossDist * 2.2) * overlapWeight;

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate) {
    bestCandidate.focus();
    bestCandidate.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    return true;
  }

  return false;
}

/**
 * Ensures a container has an active focused element on mount
 */
export function ensureInitialFocus(container?: HTMLElement | null): HTMLElement | null {
  const root = container || document.body;
  const focusables = getFocusableElements(root);
  if (focusables.length > 0) {
    const target = focusables[0];
    target.focus();
    return target;
  }
  return null;
}
