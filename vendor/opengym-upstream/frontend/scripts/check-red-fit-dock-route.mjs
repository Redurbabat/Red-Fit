// Run from the original openGym frontend: node scripts/check-red-fit-dock-route.mjs
// Dependency-free regression checks; full React/Vitest and iPhone QA are separate.
import assert from 'node:assert/strict'
import { resolveDockRoute } from '../src/components/red-fit-dock-route.js'

const cases = [
  ['/', undefined, 'home', undefined, 0],
  ['/home', undefined, 'home', undefined, 0],
  ['/plan', undefined, 'plan', undefined, 1],
  ['/plan/r/example', undefined, 'plan', undefined, 1],
  ['/stats', undefined, 'stats', undefined, 3],
  ['/history', undefined, 'history', 'stats', 3],
  ['/structural-balance', undefined, 'structural-balance', 'stats', 3],
  ['/progress-photos', undefined, 'progress-photos', 'stats', 3],
  ['/measurements', undefined, 'measurements', 'stats', 3],
  ['/settings', undefined, 'settings', 'home', 0],
  ['/settings/workout', undefined, 'settings', 'home', 0],
  ['/checkin', undefined, 'checkin', 'home', 0],
  ['/muscles', undefined, 'muscles', 'library', 4],
  ['/muscles', { from: '/stats' }, 'muscles', 'stats', 3],
  ['/muscles', { from: '/library' }, 'muscles', 'library', 4],
  ['/library', undefined, 'library', undefined, 4],
  ['/library/ex/sample', undefined, 'library', undefined, 4],
  ['/workout', undefined, 'workout', undefined, -1],
  ['/unknown', undefined, 'unknown', undefined, -1],
]
for (const [path, state, cur, parent, activeIndex] of cases) {
  assert.deepEqual(resolveDockRoute(path, state), { cur, parent, activeIndex }, `${path} ${JSON.stringify(state)}`)
}
console.log(`RED Fit dock selection: ${cases.length} real route/state cases passed`)
