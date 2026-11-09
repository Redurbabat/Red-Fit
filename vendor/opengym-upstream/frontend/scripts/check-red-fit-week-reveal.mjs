// Run inside the original openGym frontend: node scripts/check-red-fit-week-reveal.mjs
// Dependency-free function tests; real HTML/CSS geometry is checked separately.
import assert from 'node:assert/strict'
import { revealHomeToday } from '../src/views/scroll-home-week.js'
const rect = (left, right) => ({ left, right })
const cell = bounds => ({ getBoundingClientRect: () => bounds })
const test = (visible, today, start, expected, returns) => {
  const week = { scrollLeft: start, getBoundingClientRect: () => visible,
    querySelector: selector => selector === '.wday.today' ? (today ? cell(today) : null) : null }
  assert.equal(revealHomeToday(week), returns)
  assert.equal(week.scrollLeft, expected)
}
test(rect(20, 280), rect(20, 64), 0, 0, false)
test(rect(20, 280), rect(60, 104), 0, 0, false)
test(rect(20, 280), rect(300, 344), 0, 64, true)
test(rect(20, 280), rect(-24, 20), 0, -44, true)
test(rect(20, 280), rect(290, 334), -24, 30, true)
test(rect(20, 280), null, 0, 0, false)
assert.equal(revealHomeToday(null), false)
console.log('RED Fit Home: 7 weekday reveal / no-op scenarios passed')
