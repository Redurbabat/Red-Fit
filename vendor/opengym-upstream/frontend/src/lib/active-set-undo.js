// Resolve a deleted set's Undo to the same active-workout occurrence, not merely an exercise id.
// Identical exercises may occur several times (including inside a superset). Reordering is safe
// when the removed row's parent occurrence has a distinct snapshot; removing/replacing entries,
// editing entries while Undo is pending, or swapping indistinguishable copies fails closed.
const signaturesOf = active => Array.isArray(active?.entries)
  ? active.entries.map(entry => JSON.stringify(entry))
  : null

export function captureUndoSetOccurrence(active, index) {
  const signatures = signaturesOf(active)
  if (!signatures || !Number.isInteger(index) || index < 0 || index >= signatures.length) return null
  return { index, signatures }
}

export function locateUndoSetOccurrence(active, token) {
  if (!active || active.id !== token?.activeId) return -1
  const before = token.occurrence?.signatures
  const after = signaturesOf(active)
  const index = token.occurrence?.index
  if (!Array.isArray(before) || !after || before.length !== after.length
      || !Number.isInteger(index) || index < 0 || index >= before.length) return -1

  // Nothing about the exercise list changed after removing its set. Duplicate exercises
  // are fine here: the original occurrence is still at the original index.
  if (before.every((signature, i) => signature === after[i])) return index

  // Only a pure reorder is provably safe. A replacement/remove/add or an intervening
  // edit cannot silently make Undo target an unrelated occurrence.
  const sortedBefore = [...before].sort()
  const sortedAfter = [...after].sort()
  if (!sortedBefore.every((signature, i) => signature === sortedAfter[i])) return -1

  const selected = before[index]
  if (before.filter(signature => signature === selected).length !== 1) return -1
  return after.indexOf(selected)
}
