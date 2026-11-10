import { describe, expect, it } from 'vitest'
import { hasLoggedWork, swapActiveExercise } from './active-exercise-swap.js'
import { makeSideSet, toggleSide } from './workout-model.js'
import { buildCompletedWorkout } from './finish-workout.js'

const entry = (id, { sg, done = false, target, sets } = {}) => ({
  id,
  ...(sg ? { sg } : {}),
  target: target || { mode: 'reps', sets: 1, reps: 5, weight: 40 },
  sets: sets || [{ w: 40, r: 5, done }]
})

const replacement = () => entry('incline', {
  target: { mode: 'reps', sets: 2, reps: 8, weight: 32.5, note: 'Keep elbows tucked.', intensifier: { type: 'dropset', count: 1, pct: 20 } },
  sets: [{ w: 32.5, r: 8, done: false }, { w: 32.5, r: 8, done: false }]
})

describe('safe active exercise swap', () => {
  it('replaces only the selected duplicate occurrence and preserves its group and replacement metadata', () => {
    const first = entry('bench', { sg: 'pair' })
    const selected = entry('bench', { sg: 'pair' })
    selected.occurrenceId = 'bench#2'
    selected.provenance = { routineIndex: 4 }
    const unrelated = entry('row')
    const active = { cur: 1, entries: [first, selected, unrelated] }
    const next = replacement()

    expect(swapActiveExercise(active, 1, next)).toEqual({ inserted: false, index: 1 })
    expect(active.entries.map(value => value.id)).toEqual(['bench', 'incline', 'row'])
    expect(active.entries[0]).toBe(first)
    expect(active.entries[2]).toBe(unrelated)
    expect(active.entries[1]).toEqual({
      ...next,
      occurrenceId: 'bench#2',
      provenance: { routineIndex: 4 },
      sg: 'pair'
    })
    expect(active.cur).toBe(1)
  })

  it('fails closed before a logged standalone occurrence is explicitly confirmed', () => {
    const logged = entry('bench', { sets: [{ w: 42.5, r: 7, done: true, rir: 1 }] })
    const active = { cur: 0, entries: [logged, entry('row')] }

    expect(swapActiveExercise(active, 0, replacement())).toEqual({ needsConfirmation: true, grouped: false, index: 0 })
    expect(active.entries).toEqual([logged, active.entries[1]])
    expect(active.cur).toBe(0)
  })

  it('preserves a confirmed logged occurrence and inserts the replacement after it', () => {
    const logged = entry('bench', { sets: [{ w: 42.5, r: 7, done: true, rir: 1 }] })
    const unrelated = entry('row')
    const active = { cur: 0, entries: [logged, unrelated] }

    expect(swapActiveExercise(active, 0, replacement(), { loggedConfirmed: true })).toEqual({ inserted: true, index: 1 })
    expect(active.entries[0]).toBe(logged)
    expect(active.entries[0].sets[0]).toEqual({ w: 42.5, r: 7, done: true, rir: 1 })
    expect(active.entries[1].id).toBe('incline')
    expect(active.entries[2]).toBe(unrelated)
    expect(active.cur).toBe(1)
  })

  it('requires an explicit grouped disposition before changing a logged group member', () => {
    const active = { cur: 0, entries: [entry('bench', { sg: 'pair', done: true }), entry('row', { sg: 'pair' }), entry('curl')] }
    const before = [...active.entries]

    expect(swapActiveExercise(active, 0, replacement(), { loggedConfirmed: true }))
      .toEqual({ needsConfirmation: true, grouped: true, index: 0 })
    expect(active.entries).toEqual(before)
  })

  it.each([
    ['keep', ['bench', 'incline', 'row', 'curl'], ['pair', 'pair', 'pair', undefined], 1],
    ['detach', ['bench', 'row', 'incline', 'curl'], ['pair', 'pair', undefined, undefined], 2]
  ])('%s confirmation preserves logged group data and unrelated entries', (groupDisposition, ids, groups, cursor) => {
    const logged = entry('bench', { sg: 'pair', sets: [{ w: 45, r: 6, done: true }] })
    const partner = entry('row', { sg: 'pair' })
    const unrelated = entry('curl')
    const active = { cur: 0, entries: [logged, partner, unrelated] }

    expect(swapActiveExercise(active, 0, replacement(), { loggedConfirmed: true, groupDisposition }))
      .toEqual({ inserted: true, index: cursor })
    expect(active.entries.map(value => value.id)).toEqual(ids)
    expect(active.entries.map(value => value.sg)).toEqual(groups)
    expect(active.entries[0]).toBe(logged)
    expect(active.entries.includes(partner)).toBe(true)
    expect(active.entries.at(-1)).toBe(unrelated)
    expect(active.cur).toBe(cursor)
  })

  it('treats one finished limb as logged work even when the aggregate row is incomplete', () => {
    const partiallyDone = toggleSide(makeSideSet({ w: 30, r: 16 }), 'L')
    expect(partiallyDone.done).toBe(false)
    expect(partiallyDone.sides.L).toMatchObject({ w: 30, r: 8, done: true })
    expect(partiallyDone.sides.R.done).toBe(false)

    const logged = entry('bench', { sets: [partiallyDone] })
    const active = { cur: 0, entries: [logged, entry('row')] }
    expect(hasLoggedWork(logged)).toBe(true)
    expect(swapActiveExercise(active, 0, replacement())).toEqual({
      needsConfirmation: true, grouped: false, index: 0
    })
    expect(active.entries[0]).toBe(logged)
    expect(active.entries).toHaveLength(2)

    expect(swapActiveExercise(active, 0, replacement(), { loggedConfirmed: true }))
      .toEqual({ inserted: true, index: 1 })
    expect(active.entries[0]).toBe(logged)
    expect(active.entries[0].sets[0].sides).toEqual(partiallyDone.sides)
    expect(active.entries[1].id).toBe('incline')

    // The original partly-completed exercise must remain in persisted history,
    // not be silently renamed or lost on completing the workout.
    const history = buildCompletedWorkout({
      ...active, id: 'session-with-one-limb', d: '2026-11-09', start: 1000
    }, { end: 2000 })
    expect(history.entries).toHaveLength(1)
    expect(history.entries[0].id).toBe('bench')
    expect(history.entries[0].sets[0].sides.L.done).toBe(true)
    expect(history.entries[0].sets[0].sides.R.done).toBe(false)
  })

  it.each(['keep', 'detach'])('keeps partial unilateral work when swapping a superset member (%s)', groupDisposition => {
    const row = toggleSide(makeSideSet({ w: 20, r: 12 }), 'R')
    const logged = entry('bench', { sg: 'pair', sets: [row] })
    const partner = entry('row', { sg: 'pair' })
    const active = { cur: 0, entries: [logged, partner, entry('curl')] }

    expect(swapActiveExercise(active, 0, replacement(), { loggedConfirmed: true }))
      .toEqual({ needsConfirmation: true, grouped: true, index: 0 })
    expect(active.entries).toHaveLength(3)
    const result = swapActiveExercise(active, 0, replacement(), {
      loggedConfirmed: true, groupDisposition
    })
    expect(result).toMatchObject({ inserted: true })
    expect(active.entries.includes(logged)).toBe(true)
    expect(active.entries.includes(partner)).toBe(true)
    expect(logged.sets[0].sides.R.done).toBe(true)
    expect(logged.sets[0].sides.L.done).toBe(false)
    expect(active.entries[result.index].id).toBe('incline')
    expect(active.entries[result.index].sg).toBe(groupDisposition === 'keep' ? 'pair' : undefined)
  })

  it('still replaces an entirely unlogged unilateral row in place', () => {
    const untouched = entry('bench', { sets: [makeSideSet({ w: 20, r: 12 })] })
    const active = { cur: 0, entries: [untouched, entry('row')] }
    expect(hasLoggedWork(untouched)).toBe(false)
    expect(swapActiveExercise(active, 0, replacement())).toEqual({ inserted: false, index: 0 })
    expect(active.entries.map(item => item.id)).toEqual(['incline', 'row'])
  })

  it('does not confuse a cancelled unilateral tick with completed work', () => {
    let row = makeSideSet({ w: 20, r: 12 })
    row = toggleSide(row, 'L')
    row = toggleSide(row, 'L')
    expect(row.done).toBe(false)
    expect(hasLoggedWork(entry('bench', { sets: [row] }))).toBe(false)
  })
})
