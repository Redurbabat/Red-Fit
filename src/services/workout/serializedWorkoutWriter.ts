/**
 * Serialize persisted workout snapshots within one running WorkoutPage.
 * IndexedDB puts made independently may complete out of order, so an older
 * active snapshot could otherwise overwrite a newly completed workout.
 *
 * Every returned Promise corresponds to its own write. A failed save rejects
 * its caller but does not poison the queue: a later snapshot can still save.
 * This is in-page ordering, not cross-tab conflict resolution.
 */
export function createSerializedWorkoutWriter<T>(
  write: (snapshot: T) => Promise<unknown>,
): (snapshot: T) => Promise<void> {
  let tail: Promise<void> = Promise.resolve();
  return (snapshot: T): Promise<void> => {
    // Even if an earlier write failed, allow the next freshest state to save.
    const current = tail.then(async () => { await write(snapshot); });
    tail = current.catch(() => undefined);
    return current;
  };
}
