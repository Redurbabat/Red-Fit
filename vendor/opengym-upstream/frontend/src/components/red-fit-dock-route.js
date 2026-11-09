// UI-only route selection for the original openGym five-button dock.
// No React/store/iOS dependencies, so navigation can be regression-tested with Node.
const PARENT_TAB = {
  history: 'stats',
  'structural-balance': 'stats',
  'progress-photos': 'stats',
  measurements: 'stats',
  settings: 'home',
  checkin: 'home',
  muscles: 'library',
}

export function resolveDockRoute(pathname, state) {
  const cur = (pathname || '/home').split('/')[1] || 'home'
  // The body map can be opened from Stats or Exercises; preserve its entry context.
  const parent = cur === 'muscles' && state?.from === '/stats' ? 'stats' : PARENT_TAB[cur]
  const on = tab => cur === tab || parent === tab
  // Start is intentionally excluded: its raised workout button retains its own styling.
  const activeIndex = on('home') ? 0 : on('plan') ? 1 : on('stats') ? 3 : on('library') ? 4 : -1
  return { cur, parent, activeIndex }
}
