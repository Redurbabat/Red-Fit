// @vitest-environment happy-dom
// These tests exercise the original openGym TabBar, not the legacy root RED Fit shell.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TabBar from './TabBar.jsx'
import { t } from '../lib/i18n.js'
import { canCompactRedFitDock } from './red-fit-dock-direction.js'
import { DEF, useStore } from '../store/useStore.js'

const where = vi.hoisted(() => ({ loc: { pathname: '/home' } }))
vi.mock('react-router-dom', () => ({
  useNavigate: () => () => {},
  useLocation: () => where.loc,
}))
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host, root, previousState, previousUser
beforeEach(() => {
  previousState = useStore.getState().S
  previousUser = useStore.getState().user
  useStore.setState({ S: JSON.parse(JSON.stringify(DEF)), user: { id: 1, name: 'test' } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useStore.setState({ S: previousState, user: previousUser })
  where.loc = { pathname: '/home' }
})

const renderRoute = (pathname, state) => {
  where.loc = { pathname, state }
  act(() => { root.render(<TabBar onStart={() => {}} />) })
  return host.querySelector('#tabbar')
}

describe('RED Fit selection material in the existing openGym navigation', () => {
  it.each([
    ['/home', '0', 'Home'],
    ['/plan', '1', 'Plan'],
    ['/history', '3', 'Stats'],
    ['/settings', '0', 'Home'],
    ['/library', '4', 'Exercises'],
  ])('%s selects the actual parent button without changing route semantics', (route, index, selected) => {
    const nav = renderRoute(route)
    expect(nav.classList.contains('redfit-morph-dock')).toBe(true)
    expect(nav.getAttribute('data-redfit-selection')).toBe('visible')
    expect(nav.style.getPropertyValue('--rf-dock-index')).toBe(index)
    expect(nav.querySelectorAll('button')).toHaveLength(5)
    const active = [...nav.querySelectorAll('button[aria-current="page"]')]
    expect(active).toHaveLength(1)
    expect(active[0].textContent).toContain(t(selected))
  })

  it('keeps the raised Start disc but hides decorative material on the workout page', () => {
    const nav = renderRoute('/workout')
    expect(nav.getAttribute('data-redfit-selection')).toBe('hidden')
    expect(nav.querySelectorAll('button[aria-current="page"]')).toHaveLength(1)
    expect(nav.querySelector('button.start').getAttribute('aria-current')).toBe('page')
  })

  it('moves the decorative index on navigation without remounting the original buttons', () => {
    const home = renderRoute('/home')
    const before = [...home.querySelectorAll('button')]
    const stats = renderRoute('/stats')
    expect(stats).toBe(home)
    expect(stats.style.getPropertyValue('--rf-dock-index')).toBe('3')
    expect([...stats.querySelectorAll('button')]).toEqual(before)
  })
  it('keeps Muscles under the referring parent in real RED Fit selection state', () => {
    const library = renderRoute('/muscles', { from: '/library' })
    expect(library.style.getPropertyValue('--rf-dock-index')).toBe('4')
    expect(library.querySelector('button[aria-current="page"]')?.textContent).toContain(t('Exercises'))

    const stats = renderRoute('/muscles', { from: '/stats' })
    expect(stats).toBe(library)
    expect(stats.style.getPropertyValue('--rf-dock-index')).toBe('3')
    expect(stats.querySelector('button[aria-current="page"]')?.textContent).toContain(t('Stats'))
  })
  it.each([
    ['/admin', '0', 'Home'],
    ['/coach/setup', '0', 'Home'],
    ['/coach/intake', '1', 'Plan'],
  ])('keeps the original parent tab lit on %s', (path, index, label) => {
    const nav = renderRoute(path)
    expect(nav.getAttribute('data-redfit-selection')).toBe('visible')
    expect(nav.style.getPropertyValue('--rf-dock-index')).toBe(index)
    const selected = [...nav.querySelectorAll('button[aria-current="page"]')]
    expect(selected).toHaveLength(1)
    expect(selected[0].textContent).toContain(t(label))
  })
  it('preserves elapsed time and Resume accessibility during a running workout', () => {
    useStore.setState(({ S }) => ({
      S: { ...S, active: { start: Date.now() - 65000, editingWorkoutId: null, backfill: false } },
    }))
    const nav = renderRoute('/home')
    const resume = nav.querySelector('button.start')
    expect(resume.getAttribute('aria-label')).toBe(t('Resume'))
    expect(resume.querySelector('.tab-time')?.textContent).toMatch(/^\d+:\d{2}$/)
    // When CSS sets compact mode, the timer selector still remains visible.
    expect(nav.querySelectorAll('button')).toHaveLength(5)
  })

  it('names all five real tabs even if compact mode visually hides labels', () => {
    const nav = renderRoute('/home')
    expect(nav.getAttribute('data-redfit-compact')).toBe('false')
    const labels = [...nav.querySelectorAll('button')].map(button => button.getAttribute('aria-label'))
    expect(labels).toEqual(['Home', 'Plan', 'Start', 'Stats', 'Exercises'].map(label => t(label)))
  })

  it('preserves the expanded dock when Reduced Motion is enabled or the device rotates', () => {
    expect(canCompactRedFitDock({ matches: true }, { matches: false })).toBe(true)
    expect(canCompactRedFitDock({ matches: true }, { matches: true })).toBe(false)
    expect(canCompactRedFitDock({ matches: false }, { matches: false })).toBe(false)
  })

})
