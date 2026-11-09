// @vitest-environment node
// Static layout contract; actual WebKit/desktop geometry still requires device/browser QA.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/components/red-fit-dock.css'), 'utf8')

describe('RED Morph dock geometry and accessibility fallbacks', () => {
  it('tracks original openGym 6px mobile and 10px desktop nav padding', () => {
    expect(css).toMatch(/--rf-dock-gutter:\s*6px;/)
    expect(css).toMatch(/@media \(min-width:\s*1000px\)\s*\{[\s\S]*?--rf-dock-gutter:\s*10px;/)
    expect(css).toMatch(/inset-inline-start:\s*var\(--rf-dock-gutter\)/)
    expect(css).toContain('width: calc((100% - var(--rf-dock-gutter) - var(--rf-dock-gutter)) / 5)')
    // A 520px desktop dock has five 100px tabs after its 10px inline padding.
    expect((520 - 10 * 2) / 5).toBe(100)
  })

  it('keeps the moving material passive and supplies accessible fallback states', () => {
    expect(css).toMatch(/pointer-events:\s*none;/)
    expect(css).toMatch(/:focus-visible/)
    for (const preference of [
      'prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce',
      'prefers-contrast: more', 'forced-colors: active',
    ]) expect(css).toContain(preference)
    expect(css).toContain(':dir(rtl)::before')
  })
})
