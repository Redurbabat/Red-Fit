/**
 * A React route can reuse one WorkoutPage instance for several workout IDs.
 * An autosave scheduled for the old route must never be routed through the
 * new workout's persistence writer or revision counter.
 */
export class WorkoutRouteMismatchError extends Error {
  constructor() {
    super("Autosave belongs to a different workout route");
    this.name = "WorkoutRouteMismatchError";
  }
}

export function isCurrentWorkoutRoute(
  routeId: string | undefined,
  loadedId: string | undefined,
): boolean {
  return typeof routeId === "string" && routeId.length > 0 &&
    routeId === loadedId;
}

export function assertWorkoutWriteScope(
  boundWorkoutId: string | undefined,
  snapshotWorkoutId: string | undefined,
): void {
  if (!isCurrentWorkoutRoute(boundWorkoutId, snapshotWorkoutId)) {
    throw new WorkoutRouteMismatchError();
  }
}
