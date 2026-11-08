/**
 * Optimistic concurrency control for an active workout in multiple tabs.
 * A snapshot read before another tab's save must not silently replace it.
 *
 * Missing revisions on legacy workout backups mean revision 0. Every
 * successful save increments the persisted counter in the same IDB
 * transaction that checks it.
 */
export class WorkoutRevisionConflictError extends Error {
  constructor() {
    super("Workout modified in another window; reload it before saving");
    this.name = "WorkoutRevisionConflictError";
  }
}

export function nextWorkoutRevision(
  expectedRevision: number | undefined,
  persistedRevision: number | undefined,
): number {
  const expected = expectedRevision ?? 0;
  const persisted = persistedRevision ?? 0;
  if (!Number.isSafeInteger(expected) || expected < 0 ||
      !Number.isSafeInteger(persisted) || persisted < 0 ||
      persisted === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Invalid or exhausted workout revision");
  }
  if (expected !== persisted) throw new WorkoutRevisionConflictError();
  return persisted + 1;
}
