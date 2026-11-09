import { describe, expect, it } from 'vitest'
import { captureUndoSetOccurrence, locateUndoSetOccurrence } from './active-set-undo.js'

const entry = (id, marker, sets = [{ w: 40, r: 5, done: false }]) =>
  ({ id, target: { marker }, sets })
const session = entries => ({ id: 'session-one', entries })
const tokenAfterDelete = (active, idx) => ({
  activeId: active.id, idx, entryId: active.entries[idx].id,
  occurrence: captureUndoSetOccurrence(active, idx)
})

describe('Undo a deleted set in the exact active-workout occurrence', () => {
  it('allows immediate Undo even if the same exercise id appears three times', () => {
    const active = session([entry('bench', 'one'), entry('bench', 'two'), entry('bench', 'three')])
    const token = tokenAfterDelete(active, 1)
    expect(locateUndoSetOccurrence(active, token)).toBe(1)
  })

  it('finds the original occurrence after a pure reorder of distinct duplicates', () => {
    const active = session([entry('bench', 'one'), entry('bench', 'two'), entry('bench', 'three')])
    const token = tokenAfterDelete(active, 1)
    active.entries.unshift(active.entries.pop())
    expect(locateUndoSetOccurrence(active, token)).toBe(2)
  })

  it('refuses a wrong duplicate shifted into the selected index after deletion', () => {
    const active = session([entry('bench', 'one'), entry('bench', 'two'), entry('bench', 'three')])
    const token = tokenAfterDelete(active, 1)
    active.entries.splice(1, 1)
    expect(active.entries[1].target.marker).toBe('three')
    expect(locateUndoSetOccurrence(active, token)).toBe(-1)
  })

  it('refuses an indistinguishable reordering of completely identical copies', () => {
    const active = session([entry('bench', 'a'), entry('bench', 'a'), entry('row', 'b')])
    const token = tokenAfterDelete(active, 1)
    // Different non-duplicate moved while the two identical bench entries remain ambiguous.
    active.entries.unshift(active.entries.pop())
    expect(locateUndoSetOccurrence(active, token)).toBe(-1)
  })

  it('rejects a copied active session when two indistinguishable entries could have swapped', () => {
    // Both entries have the exact same post-delete content. A sync/restore replaces
    // active with an immutable copy; comparing only JSON would accept a stale index.
    const active = session([entry('bench', 'same'), entry('bench', 'same')])
    const token = tokenAfterDelete(active, 0)
    const copied = JSON.parse(JSON.stringify(active))
    copied.entries.reverse()
    expect(locateUndoSetOccurrence(copied, token)).toBe(-1)
    // The original unmodified in-memory list is still safe to undo.
    expect(locateUndoSetOccurrence(active, token)).toBe(0)
  })

  it('accepts a copied active session when the selected entry is uniquely identifiable', () => {
    const active = session([entry('bench', 'first'), entry('bench', 'second')])
    const token = tokenAfterDelete(active, 0)
    const copied = JSON.parse(JSON.stringify(active))
    expect(locateUndoSetOccurrence(copied, token)).toBe(0)
  })

  it('refuses an intervening edit, even when the original exercise id still matches', () => {
    const active = session([entry('bench', 'one'), entry('bench', 'two')])
    const token = tokenAfterDelete(active, 0)
    active.entries[1].sets[0].w = 45
    expect(locateUndoSetOccurrence(active, token)).toBe(-1)
  })

  it('refuses the replacement of one occurrence with a different exercise', () => {
    const active = session([entry('bench', 'one'), entry('bench', 'two')])
    const token = tokenAfterDelete(active, 0)
    active.entries[0] = entry('incline', 'new')
    expect(locateUndoSetOccurrence(active, token)).toBe(-1)
  })

  it('refuses Undo into a different workout or invalid context', () => {
    const active = session([entry('bench', 'one')])
    const token = tokenAfterDelete(active, 0)
    expect(locateUndoSetOccurrence({ ...active, id: 'another-workout' }, token)).toBe(-1)
    expect(locateUndoSetOccurrence(null, token)).toBe(-1)
    expect(locateUndoSetOccurrence(active, { activeId: active.id })).toBe(-1)
  })

  it('does not mutate active entries when resolving an occurrence', () => {
    const active = session([entry('bench', 'one'), entry('bench', 'two')])
    const token = tokenAfterDelete(active, 1)
    const before = JSON.stringify(active)
    expect(locateUndoSetOccurrence(active, token)).toBe(1)
    expect(JSON.stringify(active)).toBe(before)
  })
})
