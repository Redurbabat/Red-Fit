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
  // This token only lives in the in-memory Undo toast. The reference distinguishes
  // a truly unchanged list from a new immutable Store snapshot containing identical duplicates.
  return { index, signatures, activeRef: active }
}

export function locateUndoSetOccurrence(active, token) {
  if (!active || active.id !== token?.activeId) return -1
  const before = token.occurrence?.signatures
  const after = signaturesOf(active)
  const index = token.occurrence?.index
  if (!Array.isArray(before) || !after || after.length > before.length
      || !Number.isInteger(index) || index < 0 || index >= before.length) return -1

  // Nothing about the exercise list changed after removing its set. Duplicate exercises
  // are fine here: the original occurrence is still at the original index.
  if (before.every((signature, i) => signature === after[i])) {
    const selected = before[index]
    // A store update clones active. If two entries have exactly the same serialized shape,
    // the cloned state may have swapped them invisibly. No unique target can be proven;
    // keep the original set safe rather than attaching it to another copy.
    if (token.occurrence.activeRef !== active
        && before.filter(signature => signature === selected).length > 1) return -1
    return index
  }

  // Pure reorders and removal of *other* entries are safe when every remaining entry
  // occurs in the original snapshot. The selected signature must be unique in both lists.
  // Addition, replacement or an intervening edit fails closed. This preserves Undo when
  // an unrelated exercise is removed, while keeping repeated identical entries ambiguous.
  const selected = before[index]
  if (before.filter(signature => signature === selected).length !== 1) return -1
  const available = new Map()
  for (const signature of before) available.set(signature, (available.get(signature) || 0) + 1)
  for (const signature of after) {
    const count = available.get(signature) || 0
    if (!count) return -1
    available.set(signature, count - 1)
  }
  return after.indexOf(selected)
}
