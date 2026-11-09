// @vitest-environment node
// Source contract for the original openGym home header and calendar semantics.
// Rendering/VoiceOver on real iPhone is a separate acceptance step.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/views/Home.jsx'), 'utf8')

describe('RED Fit branding and screen-reader semantics in the original Home view', () => {
  it('shows the RED Fit name when no profile name is available without changing personalized greetings', () => {
    expect(source).toContain("user ? t('Hi {0}', user.name) : 'RED Fit'")
    expect(source).not.toContain("user ? t('Hi {0}', user.name) : 'openGym'")
  })

  it('gives the seven tappable weekday cells full localized date names and identifies today', () => {
    const start = source.indexOf('strip.push(<div')
    expect(start).toBeGreaterThan(-1)
    const row = source.slice(start, start + 420)
    expect(row).toContain('...tappable(() => dayOverrideSheet(iso))')
    expect(row).toContain("aria-label={d.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}")
    expect(row).toContain("aria-current={iso === todayISO() ? 'date' : undefined}")
  })
  it('keeps both week navigation arrows at a 44px minimum touch area', () => {
    // openGym extends .iconbtn's painted dimensions by 6px on each side.
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const hitArea = css.match(/\.iconbtn::before[^}]*\{[^}]*inset:\s*(-\d+)px\s*\}/)?.[1]
    expect(hitArea).toBe('6')
    const arrows = [...source.matchAll(/<button className="iconbtn" style=\{\{ width: (\d+), height: (\d+), fontSize: 'var\(--fs-subhead\)' \}\}/g)]
    expect(arrows).toHaveLength(2)
    for (const [, width, height] of arrows) {
      expect(Number(width) + 2 * Number(hitArea)).toBeGreaterThanOrEqual(44)
      expect(Number(height) + 2 * Number(hitArea)).toBeGreaterThanOrEqual(44)
    }
    expect(source).toContain("aria-label={t('Previous week')}")
    expect(source).toContain("aria-label={t('Next week')}")
  })

})
