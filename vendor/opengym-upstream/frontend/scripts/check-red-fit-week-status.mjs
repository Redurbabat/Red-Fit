// Run from original openGym frontend: node scripts/check-red-fit-week-status.mjs
// Dependency-free accessibility regression; real VoiceOver still needs an iPhone.
import assert from 'node:assert/strict'
import { homeWeekStatus, homeWeekAccessibleLabel } from '../src/views/home-week-status.js'

const expected = ({ done, noted, overridden, planned }) => {
  if (done) return [' done', 'Completed']
  if (noted) return [' noted', 'Note']
  if (overridden && planned) return [' ovr', 'Rescheduled']
  if (planned) return [' plan', 'Planned']
  return ['', null]
}
let count = 0
for (let mask = 0; mask < 16; mask++) {
  const flags = { done: !!(mask & 1), noted: !!(mask & 2), overridden: !!(mask & 4), planned: !!(mask & 8) }
  const [dot, label] = expected(flags)
  assert.deepEqual(homeWeekStatus(flags), { dot, label }, `status priority mask=${mask}`)
  count++
}
const monday = new Date(2026, 10, 9, 12)
const translate = key => ({ Planned: 'Geplant', Completed: 'Abgeschlossen', Note: 'Notiz', Rescheduled: 'Verschoben' })[key]
for (const status of [
  { dot: ' plan', label: 'Planned' }, { dot: ' done', label: 'Completed' },
  { dot: ' noted', label: 'Note' }, { dot: ' ovr', label: 'Rescheduled' },
]) {
  const text = homeWeekAccessibleLabel(monday, 'de-CH', status, translate)
  assert.ok(text.startsWith('Montag, 9. November 2026, '), text)
  assert.ok(text.endsWith(translate(status.label)), text)
  count++
}
assert.equal(homeWeekAccessibleLabel(monday, 'de-CH', { dot: '', label: null }, translate), 'Montag, 9. November 2026')
count++
console.log(`RED Fit Home: ${count} week-status/VoiceOver-label cases passed`)
