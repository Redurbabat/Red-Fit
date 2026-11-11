// @vitest-environment happy-dom
// These tests exercise the original RED Fit TabBar, not the legacy root RED Fit shell.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TabBar from './TabBar.jsx'
import { t } from '../lib/i18n.js'
import { RedFitDockGestureAxis, canCompactRedFitDock } from './red-fit-dock-direction.js'
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
  vi.unstubAllGlobals()
  expect(document.documentElement.hasAttribute('data-redfit-native-dock')).toBe(false)
})

const renderRoute = (pathname, state) => {
  where.loc = { pathname, state }
  act(() => { root.render(<TabBar onStart={() => {}} />) })
  return host.querySelector('#tabbar')
}

describe('RED Fit selection material in the existing RED Fit navigation', () => {
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

  it('keeps horizontal carousel gestures separate from vertical dock scrolling', () => {
    const gesture = new RedFitDockGestureAxis()
    gesture.begin(30, 30)
    expect(gesture.sample(34, 34)).toBe(null)
    expect(gesture.sample(55, 33)).toBe('horizontal')
    expect(gesture.sample(55, 85)).toBe('horizontal')
    gesture.end()
    gesture.begin(30, 30)
    expect(gesture.sample(34, 52)).toBe('vertical')
    expect(gesture.sample(15, 20)).toBe('vertical')
    gesture.end()
    expect(gesture.sample(10, 10)).toBe(null)
  })

  // Real React/Happy DOM integration, rather than checking only the pure
  // gesture utilities or a separately evaluated copy of the effect.
  const withMobileEvents = run => {
    const originalMatchMedia = window.matchMedia
    const scrollDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollY')
    const makeMedia = matches => {
      const listeners = new Set()
      return {
        matches,
        addEventListener: (type, cb) => { if (type === 'change') listeners.add(cb) },
        removeEventListener: (type, cb) => { if (type === 'change') listeners.delete(cb) },
        change(value) {
          this.matches = value
          act(() => { for (const listener of [...listeners]) listener({ matches: value }) })
        },
        get listenerCount() { return listeners.size },
      }
    }
    const phone = makeMedia(true)
    const reduce = makeMedia(false)
    window.matchMedia = query => query.includes('prefers-reduced-motion') ? reduce : phone
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 80 })
    const touch = (type, x, y, count = 1) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', {
        value: Array.from({ length: count }, () => ({ clientX: x, clientY: y })),
      })
      act(() => { document.body.dispatchEvent(event) })
    }
    const scroll = y => {
      act(() => { window.scrollY = y; window.dispatchEvent(new Event('scroll')) })
    }
    try { run({ phone, reduce, touch, scroll }) } finally {
      window.matchMedia = originalMatchMedia
      if (scrollDescriptor) Object.defineProperty(window, 'scrollY', scrollDescriptor)
      else delete window.scrollY
    }
  }

  it('renders compact on a vertical finger gesture, restores on the same touch and ignores carousels', () => {
    withMobileEvents(({ touch, scroll }) => {
      const nav = renderRoute('/home')
      expect(nav.getAttribute('data-redfit-compact')).toBe('false')
      touch('touchstart', 30, 420)
      touch('touchmove', 32, 370)
      scroll(125)
      expect(nav.getAttribute('data-redfit-compact')).toBe('true')
      expect(nav.querySelectorAll('button')).toHaveLength(5)
      expect([...nav.querySelectorAll('button')].map(b => b.getAttribute('aria-label')))
        .toEqual(['Home', 'Plan', 'Start', 'Stats', 'Exercises'].map(label => t(label)))
      touch('touchmove', 32, 402)
      scroll(85)
      expect(nav.getAttribute('data-redfit-compact')).toBe('false')
      touch('touchend', 32, 402)

      // A long horizontal swipe may generate minor vertical scroll noise.
      touch('touchstart', 20, 400)
      touch('touchmove', 160, 405)
      scroll(155)
      expect(nav.getAttribute('data-redfit-compact')).toBe('false')
      touch('touchend', 160, 405)
    })
  })

  it('keeps the mounted mobile dock expanded under Reduce Motion and on wider touch screens', () => {
    withMobileEvents(({ phone, reduce, touch, scroll }) => {
      const nav = renderRoute('/home')
      touch('touchstart', 30, 420)
      touch('touchmove', 30, 360)
      scroll(130)
      expect(nav.getAttribute('data-redfit-compact')).toBe('true')
      reduce.change(true)
      expect(nav.getAttribute('data-redfit-compact')).toBe('false')
      touch('touchend', 30, 360)
      touch('touchstart', 30, 420)
      touch('touchmove', 30, 360)
      scroll(170)
      expect(nav.getAttribute('data-redfit-compact')).toBe('false')
      reduce.change(false)
      touch('touchend', 30, 360)
      touch('touchstart', 30, 420)
      touch('touchmove', 30, 360)
      scroll(220)
      expect(nav.getAttribute('data-redfit-compact')).toBe('true')
      phone.change(false)
      expect(nav.getAttribute('data-redfit-compact')).toBe('false')
      expect(nav.querySelectorAll('button')).toHaveLength(5)
      expect(phone.listenerCount).toBe(1)
      expect(reduce.listenerCount).toBe(1)
    })
  })

  it('native UIKit bridge keeps RED Morph buttons but hides their duplicate presentation', () => {
    const messages = []
    vi.stubGlobal('__REDFitNativeDockReady', true)
    vi.stubGlobal('webkit', { messageHandlers: {
      redFitDock: { postMessage: message => messages.push(message) },
    } })
    const nav = renderRoute('/home')
    expect(document.documentElement.dataset.redfitNativeDock).toBe('true')
    expect(nav.querySelectorAll('button')).toHaveLength(5)
    expect(nav.getAttribute('data-redfit-compact')).toBe('false')
    expect(messages.at(-1)).toMatchObject({
      visible: true, selected: 'home', startLabel: t('Start'),
      labels: { home: t('Home'), plan: t('Plan'), stats: t('Stats'), library: t('Exercises') },
      connectionTrouble: false,
    })
    renderRoute('/workout')
    expect(messages.at(-1).selected).toBe('start')
    renderRoute('/muscles', { from: '/stats' })
    expect(messages.at(-1).selected).toBe('stats')
    act(() => root.unmount())
    expect(document.documentElement.hasAttribute('data-redfit-native-dock')).toBe(false)
    expect(messages.at(-1)).toMatchObject({ visible: false })
    vi.unstubAllGlobals()
    root = createRoot(host)
  })

  it('native UIKit bar clears space for a web sheet and restores after close', async () => {
    const messages = []
    vi.stubGlobal('__REDFitNativeDockReady', true)
    vi.stubGlobal('webkit', { messageHandlers: {
      redFitDock: { postMessage: message => messages.push(message) },
    } })
    renderRoute('/home')
    const portal = document.createElement('div')
    portal.id = 'modal-root'
    const sheet = document.createElement('div')
    sheet.className = 'sheet'
    document.body.appendChild(portal)
    await act(async () => { portal.appendChild(sheet); await Promise.resolve() })
    expect(messages.at(-1).visible).toBe(false)
    await act(async () => { sheet.remove(); await Promise.resolve() })
    expect(messages.at(-1).visible).toBe(true)
    portal.remove()
    vi.unstubAllGlobals()
  })

})
