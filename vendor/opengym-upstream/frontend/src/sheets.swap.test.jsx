// @vitest-environment happy-dom
import { LANGS, DERIVED_LOCALES } from './lib/i18n-core.js'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { swapActiveWorkoutExercise } from './sheets.jsx'
import { EXDB } from './lib/exercises.js'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'

const clone = value => JSON.parse(JSON.stringify(value))
const ids = EXDB.slice(0, 3).map(exercise => exercise.id)
const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

function entry(id, done = false) {
  return {
    id,
    target: { mode: 'reps', sets: 1, reps: 5, weight: 40 },
    sets: [{ w: 40, r: 5, done }]
  }
}

function installActive() {
  const S = clone(DEF)
  S.active = {
    id: 'swap-test', d: '2026-08-27', start: Date.now(), routineId: null,
    name: 'Swap test', bw: null, cur: 1,
    entries: [entry(ids[0]), entry(ids[0]), entry(ids[1])]
  }
  useStore.setState({ S, user: null })
}

function submitSwap(index, exercise, config) {
  swapActiveWorkoutExercise(index)
  const picker = useUI.getState().sheets.at(-1)
  const pickerView = picker.render(picker.close)
  act(() => pickerView.props.onPick(exercise))
  const configSheet = useUI.getState().sheets.at(-1)
  const configView = configSheet.render(configSheet.close)
  act(() => configView.props.onSave(config))
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  localStorage.clear()
  useUI.getState().stopRest()
  useUI.getState().stopWork()
  useUI.setState({ sheets: [], timer: null, work: null })
  installActive()
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
})

describe('active exercise swap sheet flow', () => {
  it('invalidates a timed callback and replaces only the selected duplicate', () => {
    const callback = vi.fn()
    useUI.getState().startWork(5, 'Hold', callback)

    submitSwap(1, EXDB[2], { mode: 'reps', sets: 2, reps: 8, weight: 30, note: 'New target' })
    vi.advanceTimersByTime(10_000)

    const active = useStore.getState().S.active
    expect(useUI.getState().work).toBeNull()
    expect(callback).not.toHaveBeenCalled()
    expect(active.entries.map(value => value.id)).toEqual([ids[0], ids[2], ids[1]])
    expect(active.entries[1].target).toMatchObject({ mode: 'reps', sets: 2, reps: 8, weight: 30, note: 'New target' })
    expect(active.entries[0].sets).toEqual([{ w: 40, r: 5, done: false }])
    expect(active.entries[2].sets).toEqual([{ w: 40, r: 5, done: false }])
    expect(active.cur).toBe(1)
  })
})

describe('duplicate exercise shift during a pending swap', () => {
  it('does not replace an identical duplicate shifted into the removed slot while picker is open', () => {
    useStore.getState().update(s => {
      s.active.entries = [entry(ids[1]), entry(ids[0]), entry(ids[0])]
    }, false)
    swapActiveWorkoutExercise(1)
    const picker = useUI.getState().sheets.at(-1)
    act(() => picker.render(picker.close).props.onPick(EXDB[2]))
    const config = useUI.getState().sheets.at(-1)

    // An identical copy now occupies the same index. Checking only the entry
    // content at that index used to accept the stale picker and overwrite it.
    useStore.getState().update(s => { s.active.entries.splice(1, 1) }, false)
    act(() => config.render(config.close).props.onSave({
      mode: 'reps', sets: 1, reps: 8, weight: 30
    }))

    expect(useStore.getState().S.active.entries.map(e => e.id)).toEqual([ids[1], ids[0]])
  })

  it('does not apply a pending confirmation to a duplicate shifted into the same index', () => {
    useStore.getState().update(s => {
      s.active.entries = [entry(ids[1]), entry(ids[0], true), entry(ids[0], true)]
    }, false)
    submitSwap(1, EXDB[2], { mode: 'reps', sets: 1, reps: 8, weight: 30 })
    const confirm = useUI.getState().sheets.at(-1)

    useStore.getState().update(s => { s.active.entries.splice(1, 1) }, false)
    act(() => confirm.render(confirm.close).props.onConfirm())

    const active = useStore.getState().S.active
    expect(active.entries.map(e => e.id)).toEqual([ids[1], ids[0]])
    expect(active.entries[1].sets).toEqual([{ w: 40, r: 5, done: true }])
  })
})

describe('swap picker after background changes', () => {
  it('does not overwrite a set edited while the exercise picker stayed open', () => {
    swapActiveWorkoutExercise(1)
    const picker = useUI.getState().sheets.at(-1)
    const pickerView = picker.render(picker.close)

    // A background sync, reload or another device can change the chosen occurrence
    // before the user picks a replacement. The existing index is no longer safe.
    useStore.getState().update(s => { s.active.entries[1].sets[0].r = 11 }, false)
    act(() => pickerView.props.onPick(EXDB[2]))
    const config = useUI.getState().sheets.at(-1)
    useUI.getState().startRest(90, 1)
    act(() => config.render(config.close).props.onSave({
      mode: 'reps', sets: 1, reps: 8, weight: 30
    }))

    const active = useStore.getState().S.active
    expect(active.entries.map(e => e.id)).toEqual([ids[0], ids[0], ids[1]])
    expect(active.entries[1].sets[0].r).toBe(11)
    expect(useUI.getState().timer).not.toBeNull()
  })

  it('does not swap a different session after the configuration sheet was opened', () => {
    swapActiveWorkoutExercise(1)
    const picker = useUI.getState().sheets.at(-1)
    act(() => picker.render(picker.close).props.onPick(EXDB[2]))
    const config = useUI.getState().sheets.at(-1)

    useStore.getState().update(s => {
      s.active = { ...s.active, id: 'restored-session', cur: 1,
        entries: [entry(ids[1]), entry(ids[1])] }
    }, false)
    act(() => config.render(config.close).props.onSave({
      mode: 'reps', sets: 1, reps: 8, weight: 30
    }))

    const active = useStore.getState().S.active
    expect(active.id).toBe('restored-session')
    expect(active.entries.map(e => e.id)).toEqual([ids[1], ids[1]])
    expect(active.cur).toBe(1)
  })
})

describe('swap confirmation after the active workout changes', () => {
  it('keeps a newly edited set and its rest timer rather than applying a stale confirmation', () => {
    useStore.getState().update(s => { s.active.entries[1].sets[0].done = true }, false)
    submitSwap(1, EXDB[2], { mode: 'reps', sets: 1, reps: 8, weight: 30 })
    const confirm = useUI.getState().sheets.at(-1)

    useUI.getState().startRest(90, 1)
    useStore.getState().update(s => { s.active.entries[1].sets[0].r = 9 }, false)
    act(() => confirm.render(confirm.close).props.onConfirm())

    const active = useStore.getState().S.active
    expect(active.entries.map(e => e.id)).toEqual([ids[0], ids[0], ids[1]])
    expect(active.entries[1].sets[0]).toMatchObject({ r: 9, done: true })
    expect(useUI.getState().timer).not.toBeNull()
  })

  it('does not apply an old confirmation to a different workout', () => {
    useStore.getState().update(s => { s.active.entries[1].sets[0].done = true }, false)
    submitSwap(1, EXDB[2], { mode: 'reps', sets: 1, reps: 8, weight: 30 })
    const confirm = useUI.getState().sheets.at(-1)

    useStore.getState().update(s => {
      s.active = { ...s.active, id: 'new-workout', cur: 0, entries: [entry(ids[1])] }
    }, false)
    act(() => confirm.render(confirm.close).props.onConfirm())

    const active = useStore.getState().S.active
    expect(active.id).toBe('new-workout')
    expect(active.entries.map(e => e.id)).toEqual([ids[1]])
  })
})

// A slot of a routine kept out of progression (rehab, deload) stays out when it is swapped,
// whether the replacement takes its place or, beside logged sets, goes in after it.
describe('swapping an exercise kept out of progression', () => {
  const install = done => {
    const S = clone(DEF)
    S.routines = [{ id: 'rehab', name: 'Rehab', excludeFromProgression: true, ex: [] }]
    S.active = {
      id: 'swap-noprog', d: '2026-08-27', start: Date.now(), routineIds: ['rehab'], name: 'Rehab', bw: null, cur: 0,
      entries: [{ ...entry(ids[0], done), rid: 'rehab', noProg: true }],
    }
    useStore.setState({ S, user: null })
  }

  it('keeps it out when the replacement takes the slot', () => {
    install(false)
    submitSwap(0, EXDB[2], { mode: 'reps', sets: 1, reps: 12, weight: 10 })
    const [swapped] = useStore.getState().S.active.entries
    expect(swapped).toMatchObject({ id: ids[2], rid: 'rehab', noProg: true })
    expect(swapped.plan.kind).toBe('off')
  })

  it('keeps it out when the replacement goes in after logged sets', () => {
    install(true)
    submitSwap(0, EXDB[2], { mode: 'reps', sets: 1, reps: 12, weight: 10 })
    const confirm = useUI.getState().sheets.at(-1)
    act(() => confirm.render(confirm.close).props.onConfirm())
    const entries = useStore.getState().S.active.entries
    expect(entries.map(e => e.id)).toEqual([ids[0], ids[2]])
    expect(entries[1]).toMatchObject({ rid: 'rehab', noProg: true })
    expect(entries[1].plan.kind).toBe('off')
  })
})

describe('active exercise swap locale coverage', () => {
  const required = [
    'Swap exercise',
    'Swap exercise?',
    'Logged sets stay with the original exercise. Choose where the replacement belongs.',
    'Keep replacement in this group',
    'Insert after this group',
    'Logged sets stay with the original exercise. The replacement will be inserted afterward.'
  ]
  const packs = import.meta.glob('./locales/*.js', { eager: true, import: 'default' })

  it('defines every new prompt in all twelve locale packs', () => {
    // Minus English (the source language) and minus any derived locale, which transforms its
    // base language's pack at load time instead of shipping one.
    const packed = Object.keys(LANGS).filter(code => code !== 'en' && !DERIVED_LOCALES[code])
    expect(Object.keys(packs)).toHaveLength(packed.length)
    Object.entries(packs).forEach(([path, pack]) => {
      required.forEach(key => expect(pack, `${path} is missing ${key}`).toHaveProperty(key))
    })
  })
})

// QA 1.3.9: the swap borrowed the routine editor's words — "Add exercise" over the picker and
// "Add to routine" on the confirm — while it changes only today's session.
describe('swap wording', () => {
  it('titles the picker as a swap and confirms into this workout', () => {
    swapActiveWorkoutExercise(1)
    const picker = useUI.getState().sheets.at(-1)
    const pickerView = picker.render(picker.close)
    expect(pickerView.props.title).toBe('Swap exercise')
    act(() => pickerView.props.onPick(EXDB[2]))
    const configSheet = useUI.getState().sheets.at(-1)
    const configView = configSheet.render(configSheet.close)
    expect(configView.props.saveLabel).toBe('Use in this workout')
  })

  it('renders the swap icon on exercise card action buttons (#561)', () => {
    swapActiveWorkoutExercise(1)
    const host = renderTop()
    const icon = host.querySelector('.list .item .iconbtn.chev svg')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('data-icon')).toBe('swap')
  })
})
