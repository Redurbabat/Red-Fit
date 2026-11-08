/** Shared, dependency-free scroll policy for the responsive RED Fit bottom dock. */
export interface DockScrollState {
  lastY: number;
  travel: number;
  compact: boolean;
}

const TOP_EXPAND_Y = 64;
const COLLAPSE_START_Y = 132;
const COLLAPSE_TRAVEL_PX = 26;
const EXPAND_TRAVEL_PX = 20;

export function initialDockScrollState(scrollY: number): DockScrollState {
  return { lastY: Math.max(0, scrollY), travel: 0, compact: false };
}

/**
 * Aggregate small scroll deltas so touch/trackpad events can trigger the dock.
 * Changing direction resets the accumulated travel; small jitter does not.
 * Always restore the expanded dock near the top of a page.
 */
export function updateDockScrollState(
  previous: DockScrollState,
  scrollY: number,
): DockScrollState {
  const y = Math.max(0, scrollY);
  if (y <= TOP_EXPAND_Y) {
    return { lastY: y, travel: 0, compact: false };
  }

  const delta = y - previous.lastY;
  if (delta === 0) return previous;

  const travel = Math.sign(delta) === Math.sign(previous.travel)
    ? previous.travel + delta
    : delta;

  if (!previous.compact && y >= COLLAPSE_START_Y && travel >= COLLAPSE_TRAVEL_PX) {
    return { lastY: y, travel: 0, compact: true };
  }
  if (previous.compact && travel <= -EXPAND_TRAVEL_PX) {
    return { lastY: y, travel: 0, compact: false };
  }
  return { lastY: y, travel, compact: previous.compact };
}

/** The legacy /progress route belongs to the Body area in RED Fit 2031. */
export function isDockTabActive(pathname: string, route: string): boolean {
  if (route === "/body" && (pathname === "/progress" || pathname.startsWith("/progress/"))) {
    return true;
  }
  return pathname === route || pathname.startsWith(`${route}/`);
}
