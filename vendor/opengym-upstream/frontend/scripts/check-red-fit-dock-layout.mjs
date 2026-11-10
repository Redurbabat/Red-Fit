// Standalone original-openGym CSS contract: node scripts/check-red-fit-dock-layout.mjs
// This checks source and coordinate maths, not rendered WebKit/browser geometry.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const css = readFileSync(new URL('../src/components/red-fit-dock.css', import.meta.url), 'utf8')
const rules = [
  /#tabbar\.redfit-morph-dock\s*\{[^}]*--rf-dock-gutter:\s*6px;/,
  /@media\s*\(min-width:\s*1000px\)\s*\{\s*#tabbar\.redfit-morph-dock\s*\{\s*--rf-dock-gutter:\s*10px;/,
  /--rf-dock-bottom-space:\s*calc\(6px \+ var\(--sab\)\);/,
  /inset-block-end:\s*var\(--rf-dock-bottom-space\)/,
  /--rf-dock-bottom-space:\s*9px;/,
  /inset-inline-start:\s*var\(--rf-dock-gutter\)/,
  /width:\s*calc\(\(100% - var\(--rf-dock-gutter\) - var\(--rf-dock-gutter\)\) \/ 5\)/,
  /transform:\s*translateX\(calc\(var\(--rf-dock-index, 0\) \* 100%\)\)/,
  /:dir\(rtl\)::before\s*\{\s*transform:\s*translateX\(calc\(var\(--rf-dock-index, 0\) \* -100%\)\)/,
  /pointer-events:\s*none;/,
  /\[data-redfit-selection='hidden'\]::before\s*\{\s*opacity:\s*0;/,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
  /:focus-visible/,
  /button\.start > span:not\(\.cir\):not\(\.tab-time\)/,
  /button\.start > \.tab-time\s*\{[^}]*display:\s*block;/,
  /button\.start > \.tab-time\s*\{[^}]*position:\s*absolute;/,
  /button\.start > \.tab-time\s*\{[^}]*white-space:\s*nowrap;/,
]
for (const [index, rule] of rules.entries()) assert.match(css, rule, 'CSS contract ' + (index + 1))
let count = 0
for (const viewport of [320, 360, 390, 430, 768, 999, 1000, 1280]) {
  const desktop = viewport >= 1000, width = desktop ? 520 : viewport, gutter = desktop ? 10 : 6
  const tabWidth = (width - 2 * gutter) / 5
  assert.ok(tabWidth > 44, 'Touch target space at ' + viewport + 'px')
  for (const direction of ['ltr', 'rtl']) for (const index of [0, 1, 3, 4]) {
    const selection = direction === 'ltr' ? gutter + index * tabWidth : width - gutter - tabWidth - index * tabWidth
    const button = direction === 'ltr' ? gutter + index * tabWidth : gutter + (4 - index) * tabWidth
    assert.ok(Math.abs(selection - button) < 1e-8, 'Dock selection ' + viewport + 'px ' + direction + ' index ' + index)
    count++
  }
}
console.log('RED Fit dock: ' + count + ' layout cases and ' + rules.length + ' CSS invariants passed')
