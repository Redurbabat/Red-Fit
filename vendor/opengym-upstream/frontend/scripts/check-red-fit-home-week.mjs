// Run from the original openGym frontend: node scripts/check-red-fit-home-week.mjs
// Zero npm dependencies. This checks source/layout contracts, not browser hit testing.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const home = readFileSync(new URL('../src/views/Home.jsx', import.meta.url), 'utf8')
const scoped = readFileSync(new URL('../src/views/red-fit-home.css', import.meta.url), 'utf8')
const original = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
assert.match(home, /import '\.\/red-fit-home\.css'/)
assert.match(home, /className="week redfit-home-week" role="group" aria-label=\{wkLabel\}/)
assert.match(home, /\.\.\.tappable\(\(\) => dayOverrideSheet\(iso\)\)/)
assert.match(scoped, /\.week\.redfit-home-week\s*\{[^}]*overflow-x:\s*auto;/)
assert.match(scoped, /\.week\.redfit-home-week\s*\{[^}]*scroll-snap-type:\s*x proximity;/)
assert.match(scoped, /\.week\.redfit-home-week\s*>\s*\.wday\s*\{[^}]*flex:\s*1 0 44px;/)
assert.match(scoped, /\.week\.redfit-home-week\s*>\s*\.wday\s*\{[^}]*min-inline-size:\s*44px;/)
assert.match(scoped, /\.week\.redfit-home-week\s*>\s*\.wday:focus-visible\s*\{[^}]*outline-offset:\s*-3px;/)
assert.match(original, /--pad:\s*16px;/)
assert.match(original, /\.card\s*\{[^}]*padding:\s*16px;/)
assert.match(original, /\.week\{display:flex;justify-content:space-between;gap:4px\}/)

const widths = [320, 360, 375, 390, 396, 428, 560]
const minimum = 7 * 44 + 6 * 4
assert.equal(minimum, 332)
for (const width of widths) {
  const contentWidth = Math.min(width, 560) - 2 * (16 + 16)
  const overflowNeeded = contentWidth < minimum
  assert.equal(overflowNeeded, width < 396, 'Responsive seven-day layout at ' + width + 'px')
  assert.ok(overflowNeeded || contentWidth >= minimum)
}
console.log('RED Fit Home: 11 source/CSS contracts and ' + widths.length + ' viewport calculations passed')
