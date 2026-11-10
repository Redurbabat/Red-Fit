// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { requireLocalOnly } from '../lib/local-only.js'
import { nutritionScope } from '../nutrition/scope.js'

const device = vi.hoisted(() => ({ saved: null, remote: null, save: vi.fn(), reminder: vi.fn() }))
vi.mock('../lib/mobile.js', async original => ({
  ...await original(), MOBILE: true, nativeLoad: async () => device.saved,
  nativeSave: device.save, syncReminder: device.reminder,
}))
vi.mock('../lib/remote.js', async original => ({ ...await original(), loadRemote: async () => device.remote }))

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear() })

it('restores the native file and former nutrition scope without authenticating or syncing', async () => {
  vi.useFakeTimers()
  const fetch = vi.fn(() => { throw new Error('unexpected network') })
  vi.stubGlobal('fetch', fetch)
  localStorage.clear()
  device.remote = { mode: 'remote', base: 'https://previous.example/gym', token: 'synthetic-token', user: { id: 'person-1' } }
  requireLocalOnly()
  const { useStore, DEF } = await import('./useStore.js')
  device.saved = { ...structuredClone(DEF), _ts: 200, workouts: [{ id: 'file-workout', d: '2026-11-10', entries: [] }], active: { id: 'resume-file', entries: [] } }
  useStore.setState({ S: { ...structuredClone(DEF), _ts: 100 }, ready: false })
  await useStore.getState().boot()
  const state = useStore.getState()
  expect(state.ready).toBe(true)
  expect(state.user).toBeNull()
  expect(state.needsMobileOnboarding).toBe(false)
  expect(state.S.workouts[0].id).toBe('file-workout')
  expect(state.S.active.id).toBe('resume-file')
  expect(nutritionScope(state.localProfile)).toBe(nutritionScope({ userId: device.remote.user.id, server: device.remote.base }))
  expect(device.remote.token).toBe('synthetic-token')
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetch).not.toHaveBeenCalled()
})
