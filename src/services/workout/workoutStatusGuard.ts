/**
 * Guard immutable workout lifecycle transitions across independent views/tabs.
 * A terminal workout may have its notes edited later without changing status,
 * but a stale active snapshot must never revive a completed/cancelled workout.
 */
export type WorkoutLifecycleStatus = "planned" | "active" | "completed" | "cancelled";

export function canPersistWorkoutStatus(
  persisted: WorkoutLifecycleStatus | undefined,
  incoming: WorkoutLifecycleStatus,
): boolean {
  if (persisted === "completed" || persisted === "cancelled") {
    return persisted === incoming;
  }
  return true;
}
