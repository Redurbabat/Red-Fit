// UI-only route selection for the original RED Fit five-button dock.
// No React/store/iOS dependencies, so navigation can be regression-tested with Node.
const PARENT_TAB = {
  history: 'stats',
  'structural-balance': 'stats',
  'progress-photos': 'stats',
  measurements: 'stats',
  settings: 'home',
  nutrition: 'home',
  checkin: 'home',
  admin: 'home',
  muscles: 'library',
}
const COACH_PARENT = { intake: 'plan', setup: 'home' }

export function resolveDockRoute(pathname, state) {
  const cur = (pathname || '/home').split('/')[1] || 'home'
  // The body map can be opened from Stats or Exercises; preserve its entry context.
  // Coach intake returns to Plan; local AI setup returns to Settings (Home).
  const parent = cur === 'muscles' && state?.from === '/stats' ? 'stats'
    : cur === 'coach' ? COACH_PARENT[(pathname || '').split('/')[2]] : PARENT_TAB[cur]
  const on = tab => cur === tab || parent === tab
  // Start is intentionally excluded: its raised workout button retains its own styling.
  const activeIndex = on('home') ? 0 : on('plan') ? 1 : on('stats') ? 3 : on('library') ? 4 : -1
  return { cur, parent, activeIndex }
}
