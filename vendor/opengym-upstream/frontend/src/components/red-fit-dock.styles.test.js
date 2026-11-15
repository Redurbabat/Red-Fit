// @vitest-environment node
// Static layout contract; actual WebKit/desktop geometry still requires device/browser QA.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/components/red-fit-dock.css'), 'utf8')

describe('RED Morph dock geometry and accessibility fallbacks', () => {
  it('tracks original RED Fit 6px mobile and 10px desktop nav padding', () => {
    expect(css).toMatch(/--rf-dock-gutter:\s*6px;/)
    expect(css).toMatch(/@media \(min-width:\s*1000px\)\s*\{[\s\S]*?--rf-dock-gutter:\s*10px;/)
    expect(css).toMatch(/inset-inline-start:\s*var\(--rf-dock-gutter\)/)
    expect(css).toContain('width: calc((100% - var(--rf-dock-gutter) - var(--rf-dock-gutter)) / 5)')
    // A 520px desktop dock has five 100px tabs after its 10px inline padding.
    expect((520 - 10 * 2) / 5).toBe(100)
  })

  it('aligns the selection to the real tab baseline and iPhone bottom safe area', () => {
    expect(css).toMatch(/--rf-dock-bottom-space:\s*calc\(6px \+ var\(--sab\)\);/)
    expect(css).toMatch(/inset-block-end:\s*var\(--rf-dock-bottom-space\)/)
    expect(css).toMatch(/@media \(min-width:\s*1000px\)[\s\S]*?--rf-dock-bottom-space:\s*9px;/)
    expect(css).not.toMatch(/inset-block-start:\s*2px;/)
  })

  it('preserves the running workout elapsed timer in the compact iPhone dock', () => {
    expect(css).toMatch(/data-redfit-compact='true'[^}]*> button\.start > span:not\(\.cir\):not\(\.tab-time\)/)
    expect(css).toMatch(/data-redfit-compact='true'[^}]*> button\.start > \.tab-time\s*\{[^}]*display:\s*block;/)
    expect(css).toMatch(/button\.start > \.tab-time\s*\{[^}]*position:\s*absolute;/)
    expect(css).toMatch(/button\.start > \.tab-time\s*\{[^}]*white-space:\s*nowrap;/)
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
  it('never draws a duplicate web dock when Agent 04 native iOS UIKit bridge is present', () => {
    expect(css).toMatch(/:root\[data-redfit-native-dock\]\s+#tabbar\.redfit-morph-dock\s*\{[^}]*visibility:\s*hidden;/)
    expect(css).toMatch(/:root\[data-redfit-native-dock\]\s+#tabbar\.redfit-morph-dock\s*\{[^}]*pointer-events:\s*none;/)
    expect(css).toMatch(/:root\[data-redfit-native-dock\]\s+#app\s*\{[^}]*padding-bottom:[^}]*var\(--rf-native-dock-inset/)
    expect(css).not.toMatch(/padding-bottom:\s*calc\(120px \+ var\(--sab\)\)/)
  })

  it('hides the web dock inside the SwiftUI shell so navigation is not duplicated', () => {
    expect(css).toMatch(/:root\[data-redfit-swiftui\]\s+#tabbar\.redfit-morph-dock\s*\{[^}]*display:\s*none;/)
    expect(css).toMatch(/:root\[data-redfit-swiftui\]\s+#app[^{]*\{[^}]*padding-bottom:\s*calc\(var\(--sab\)/)
  })
})
