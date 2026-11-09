// Run from original openGym frontend: node scripts/check-red-fit-dock-direction.mjs
import assert from 'node:assert/strict'
import { RedFitDockDirectionTracker } from '../src/components/red-fit-dock-direction.js'

const tracker = new RedFitDockDirectionTracker()
let checks = 0
const expect = (actual, expected) => { assert.equal(actual, expected); checks++ }
expect(tracker.sample(50), null)
tracker.begin(50)
expect(tracker.sample(56), null)
expect(tracker.sample(63), 'down')
expect(tracker.sample(100), null)
expect(tracker.sample(95), null)
expect(tracker.sample(87), 'up')
expect(tracker.sample(80), null)
expect(tracker.sample(83), null)
expect(tracker.sample(91), null)
expect(tracker.sample(96), 'down')
tracker.end()
expect(tracker.sample(120), null)
tracker.begin(200)
expect(tracker.sample(193), null)
expect(tracker.sample(186), 'up')
tracker.end()
tracker.begin(0)
expect(tracker.sample(0.4), null)
expect(tracker.sample(0.9), null)
expect(tracker.sample(13.2), null)
expect(tracker.sample(14.2), 'down')
console.log(`RED Fit dock: ${checks} touch-direction checks passed`)
