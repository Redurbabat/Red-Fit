// @vitest-environment happy-dom
// A reload or the app being killed mid-hold (a timed set, a plank) used to drop the bar and the
// seconds with it. The hold is kept with the set it belongs to, carries on after the reload, and
// one that ended while the app was away is written to its set as held to the end.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({ ok: true })) }))
vi.mock('../lib/sound.js', () => ({ beep: vi.fn(), chime: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn() }))

import { useUI, restoreWork, WORK_KEY } from './useUI.js'
import { useStore } from './useStore.js'

const saved = () => JSON.parse(localStorage.getItem(WORK_KEY) || 'null')
const plankSet = () => useStore.getState().S.active.entries[1].sets[0]
const owner = { idx: 1, i: 0, id: 'plank' }

let original
beforeEach(() => {
  vi.useFakeTimers()
  original = useStore.getState().S
  useStore.setState({ S: { ...original, sound: true, active: { id: 'a', entries: [
    { id: 'squat', sets: [{ w: 100, r: 5 }] },
    { id: 'plank', sets: [{ sec: 45 }, { sec: 45 }] },
  ] } } })
  useUI.setState({ timer: null, work: null })
  localStorage.clear()
})
afterEach(() => {
  useUI.getState().stopWork()
  useUI.getState().stopRest()
  useStore.setState({ S: original })
  vi.useRealTimers()
})

describe('a hold across a reload', () => {
  it('is kept with its set while it runs, and forgotten once it ends', () => {
    const done = vi.fn()
    useUI.getState().startWork(45, 'Plank', done, owner)
    expect(saved()).toMatchObject({ total: 45, label: 'Plank', owner })
    useUI.getState().finishWorkEarly()
    expect(done).toHaveBeenCalled()
    expect(saved()).toBeNull()
  })

  it('a hold without an owner is not kept', () => {
    useUI.getState().startWork(45, 'Plank', vi.fn())
    expect(saved()).toBeNull()
  })

  it('carries on after the reload, and the time lands on its set even before the screen is back', () => {
    const endsAt = Date.now() + 42_000
    localStorage.setItem(WORK_KEY, JSON.stringify({ endsAt, total: 45, label: 'Plank', overtime: false, owner }))
    expect(restoreWork()).toBe(true)
    expect(useUI.getState().work).toMatchObject({ left: 42, total: 45, label: 'Plank', owner })
    vi.advanceTimersByTime(43_000)
    expect(useUI.getState().work).toBeNull()
    expect(plankSet()).toMatchObject({ sec: 45, done: true })
    expect(saved()).toBeNull()
  })

  it('the workout screen binds its own handler again, and Done goes to it', () => {
    localStorage.setItem(WORK_KEY, JSON.stringify({ endsAt: Date.now() + 40_000, total: 45, label: 'Plank', overtime: false, owner }))
    restoreWork()
    const handler = vi.fn()
    useUI.getState().bindWork(wk => { expect(wk.owner).toEqual(owner); return handler })
    vi.advanceTimersByTime(10_000)
    useUI.getState().finishWorkEarly()
    expect(handler).toHaveBeenCalledWith(15)
    expect(plankSet().done).toBeUndefined()   // the screen's handler ticks it, not the fallback
  })

  it('one that ended while the app was away is written as held to the end', () => {
    localStorage.setItem(WORK_KEY, JSON.stringify({ endsAt: Date.now() - 5_000, total: 45, label: 'Plank', overtime: false, owner }))
    expect(restoreWork()).toBe(true)
    expect(useUI.getState().work).toBeNull()
    expect(plankSet()).toMatchObject({ sec: 45, done: true })
    expect(saved()).toBeNull()
  })

  it('stores a session id on new holds and restores it for the same workout', () => {
    useUI.getState().startWork(45, 'Plank', vi.fn(), owner)
    const previous = saved()
    expect(previous.owner).toMatchObject({ ...owner, sessionId: 'a' })
    useUI.getState().stopWork()
    localStorage.setItem(WORK_KEY, JSON.stringify(previous))
    expect(restoreWork()).toBe(true)
    expect(useUI.getState().work.owner.sessionId).toBe('a')
  })

  it.each([false, true])('rejects a hold belonging to another workout after reload (paused=%s)', paused => {
    useUI.getState().startWork(45, 'Plank', vi.fn(), owner)
    if (paused) useUI.getState().pauseWork()
    const previous = saved()
    expect(previous.owner.sessionId).toBe('a')
    useUI.getState().stopWork()

    // The new workout uses exactly the same exercise and row indexes.
    useStore.setState({ S: { ...useStore.getState().S,
      active: { id: 'b', entries: [
        { id: 'squat', sets: [{ w: 100, r: 5 }] },
        { id: 'plank', sets: [{ sec: 45 }, { sec: 45 }] }
      ] }
    } })
    localStorage.setItem(WORK_KEY, JSON.stringify(previous))
    expect(restoreWork()).toBe(false)
    expect(useUI.getState().work).toBeNull()
    expect(useStore.getState().S.active.entries[1].sets[0].done).toBeUndefined()
    expect(saved()).toBeNull()
  })

  it('refuses to resume a paused hold left in memory by a different workout', () => {
    const done = vi.fn()
    useUI.getState().startWork(45, 'Plank', done, owner)
    useUI.getState().pauseWork()
    expect(useUI.getState().work).toMatchObject({ paused: true, owner: { sessionId: 'a' } })

    useStore.setState({ S: { ...useStore.getState().S, active: { id: 'b', entries: [
      { id: 'squat', sets: [{ w: 100, r: 5 }] },
      { id: 'plank', sets: [{ sec: 45 }, { sec: 45 }] },
    ] } } })
    useUI.getState().resumeWork()
    expect(useUI.getState().work).toBeNull()
    expect(saved()).toBeNull()
    vi.advanceTimersByTime(50_000)
    expect(done).not.toHaveBeenCalled()
    expect(useStore.getState().S.active.entries[1].sets[0]).toEqual({ sec: 45 })
  })

  it('allows a paused hold to resume after cloning the same workout', () => {
    const done = vi.fn()
    useUI.getState().startWork(45, 'Plank', done, owner)
    useUI.getState().pauseWork()
    const active = useStore.getState().S.active
    useStore.setState({ S: { ...useStore.getState().S, active: {
      ...active, entries: active.entries.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) }))
    } } })
    useUI.getState().resumeWork()
    expect(useUI.getState().work).toMatchObject({ owner: { sessionId: 'a' }, total: 45 })
    expect(useUI.getState().work.paused).toBeFalsy()
    expect(saved()).toMatchObject({ owner: { sessionId: 'a' } })
    useUI.getState().finishWorkEarly()
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('drops an in-memory paused hold if its set was completed meanwhile', () => {
    const done = vi.fn()
    useUI.getState().startWork(45, 'Plank', done, owner)
    useUI.getState().pauseWork()
    useStore.getState().update(s => { s.active.entries[1].sets[0].done = true }, false)
    useUI.getState().resumeWork()
    expect(useUI.getState().work).toBeNull()
    expect(saved()).toBeNull()
    expect(done).not.toHaveBeenCalled()
  })

  it.each(['early', 'abandoned', 'expired'])('does not run an old onDone callback after another workout starts (%s)', mode => {
    const done = vi.fn()
    useUI.getState().startWork(mode === 'expired' ? 5 : 45, 'Plank', done, owner)
    expect(saved().owner.sessionId).toBe('a')

    // A separate session now occupies the same exercise and set index. The old
    // React callback must not mark its set complete or start its rest timer.
    useStore.setState({ S: { ...useStore.getState().S, active: { id: 'other-session', entries: [
      { id: 'squat', sets: [{ w: 100, r: 5 }] },
      { id: 'plank', sets: [{ sec: 45 }, { sec: 45 }] },
    ] } } })
    if (mode === 'early') useUI.getState().finishWorkEarly()
    else if (mode === 'abandoned') {
      vi.advanceTimersByTime(3000)
      useUI.getState().abandonWork()
    } else vi.advanceTimersByTime(6000)

    expect(done).not.toHaveBeenCalled()
    expect(useStore.getState().S.active.id).toBe('other-session')
    expect(useStore.getState().S.active.entries[1].sets[0]).toEqual({ sec: 45 })
    expect(useUI.getState().work).toBeNull()
  })

  it('is dropped when its set is gone or already ticked', () => {
    localStorage.setItem(WORK_KEY, JSON.stringify({ endsAt: Date.now() + 30_000, total: 45, label: 'Plank', overtime: false, owner: { idx: 0, i: 0, id: 'plank' } }))
    expect(restoreWork()).toBe(false)
    expect(useUI.getState().work).toBeNull()
    expect(saved()).toBeNull()
    useStore.getState().update(s => { s.active.entries[1].sets[0].done = true }, false)
    localStorage.setItem(WORK_KEY, JSON.stringify({ endsAt: Date.now() + 30_000, total: 45, label: 'Plank', overtime: false, owner }))
    expect(restoreWork()).toBe(false)
  })
})
