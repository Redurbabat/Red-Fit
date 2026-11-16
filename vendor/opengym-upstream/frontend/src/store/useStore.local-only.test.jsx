// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { requireLocalOnly } from '../lib/local-only.js'

afterEach(() => { vi.useRealTimers(); localStorage.clear() })

it('opens an existing profile locally without contacting its former server or deleting its workout', async () => {
  vi.useFakeTimers()
  localStorage.clear()
  const fetch = vi.fn(() => { throw new Error('network must not run') })
  vi.stubGlobal('fetch', fetch)
  localStorage.setItem('gym_user', JSON.stringify({ id: 'old-account' }))
  localStorage.setItem('gym_owner', 'old-account')
  requireLocalOnly()
  const { useStore, DEF } = await import('./useStore.js')
  const workout = { id: 'local-session', d: '2026-11-10', start: 1, entries: [] }
  const active = { id: 'still-training', name: 'Keep me', entries: [] }
  useStore.setState({ S: { ...structuredClone(DEF), workouts: [workout], active }, ready: false })
  await useStore.getState().boot()
  expect(useStore.getState().ready).toBe(true)
  expect(useStore.getState().user).toBeNull()
  expect(useStore.getState().isGuest()).toBe(true)
  expect(useStore.getState().S.workouts).toEqual([workout])
  expect(useStore.getState().S.active).toEqual(active)
  expect(useStore.getState().coachLocal.mode).toBe('off')
  expect(localStorage.getItem('gym_user')).toContain('old-account')
  expect(localStorage.getItem('gym_owner')).toBe('old-account')
  expect(useStore.getState().localProfile.userId).toBe('old-account')
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetch).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
