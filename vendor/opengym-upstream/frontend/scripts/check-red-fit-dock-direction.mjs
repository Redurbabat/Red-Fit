// Run from original openGym frontend: node scripts/check-red-fit-dock-direction.mjs
import assert from 'node:assert/strict'
import { RedFitDockDirectionTracker, RedFitDockGestureAxis, canCompactRedFitDock } from '../src/components/red-fit-dock-direction.js'

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
for (const [phone, reduced, expected] of [
  [true, false, true],
  [true, true, false],
  [false, false, false],
  [false, true, false],
]) {
  expect(canCompactRedFitDock({ matches: phone }, { matches: reduced }), expected)
}
expect(canCompactRedFitDock(null, { matches: false }), false)
expect(canCompactRedFitDock({ matches: true }, null), true)
const gesture = new RedFitDockGestureAxis()
expect(gesture.sample(12, 13), null) // no active touch
expect(gesture.direction, null)
gesture.begin(0, 0)
expect(gesture.sample(3, 4), null) // small jitter: no axis yet
expect(gesture.sample(23, 3), 'horizontal') // horizontal carousel
expect(gesture.sample(23, 80), 'horizontal') // axis locked for this gesture
gesture.end()
expect(gesture.direction, null)
gesture.begin(50, 60)
expect(gesture.sample(54, 78), 'vertical')
expect(gesture.sample(100, 78), 'vertical') // reversal does not change axis
// Diagonal motion stays undecided until there is a dominant axis.
gesture.end()
gesture.begin(0, 0)
expect(gesture.sample(20, 20), null)
expect(gesture.sample(25, 35), 'vertical')
gesture.end()
gesture.begin(0, 0)
expect(gesture.sample(35, 25), 'horizontal')
gesture.end()
expect(gesture.sample(70, 10), null)
console.log(`RED Fit dock: ${checks} direction/policy/gesture-axis checks passed`)
