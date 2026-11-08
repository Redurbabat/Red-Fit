import type { ExerciseLog, WorkoutPlanExercise } from "../../models";

/**
 * RED Fit superset navigation, developed from the unit/round model reviewed in
 * openGym. Everything here is pure: the caller persists the WorkoutLog itself.
 *
 * Only consecutive exercises with the same non-empty group ID form one group.
 * This keeps older logs and manually added exercises fully backward compatible.
 */
export function contiguousSuperset(
  logs: ExerciseLog[],
  currentIndex: number,
): number[] {
  const group = logs[currentIndex]?.supersetGroup?.trim();
  if (!group) return [];
  let start = currentIndex;
  let end = currentIndex;
  while (start > 0 && logs[start - 1].supersetGroup?.trim() === group) start--;
  while (end + 1 < logs.length && logs[end + 1].supersetGroup?.trim() === group) end++;
  if (end === start) return [];
  return Array.from({ length: end - start + 1 }, (_, n) => start + n);
}

function unfinished(log: ExerciseLog): boolean {
  return log.setLogs.some((set) => !set.completed);
}

/**
 * After completing a set, cycle to the next exercise in this superset that
 * still has outstanding work. It handles uneven set counts and never leaves
 * the currently active superset automatically.
 */
export function nextSupersetExerciseIndex(
  logs: ExerciseLog[],
  currentIndex: number,
): number | undefined {
  const group = contiguousSuperset(logs, currentIndex);
  if (group.length === 0) return undefined;
  const position = group.indexOf(currentIndex);
  for (let step = 1; step <= group.length; step++) {
    const candidate = group[(position + step) % group.length];
    if (unfinished(logs[candidate])) return candidate;
  }
  return undefined;
}

/**
 * The rest interval belongs after a superset round, not after each member.
 * A wrap to an earlier member (or an exhausted group) completes a round.
 * The caller decides which group rest seconds should be used.
 */
export function shouldRestAfterSupersetSet(
  logs: ExerciseLog[],
  currentIndex: number,
  nextIndex: number | undefined,
): boolean {
  const group = contiguousSuperset(logs, currentIndex);
  if (group.length === 0) return true;
  return nextIndex === undefined || nextIndex <= currentIndex;
}

/**
 * Find the rest interval for a group. Use a group-specific override if one
 * is stored; otherwise prefer the longest member's normal rest duration.
 */
export function supersetRestSeconds(
  logs: ExerciseLog[],
  currentIndex: number,
  restForExercise: (exerciseId: string) => number,
): number {
  const group = contiguousSuperset(logs, currentIndex);
  if (group.length === 0) {
    return restForExercise(logs[currentIndex]?.exerciseId ?? "");
  }
  const custom = group
    .map((index) => logs[index].supersetRestSeconds ?? 0)
    .find((seconds) => seconds > 0);
  if (custom != null) return custom;
  return Math.max(0, ...group.map((index) => restForExercise(logs[index].exerciseId)));
}

/**
 * Plan-editor validation: nonempty group IDs must occur at least twice and
 * only as one contiguous run. Returns the first invalid name, if any.
 */
export function invalidSupersetGroup(
  exercises: Pick<WorkoutPlanExercise, "supersetGroup">[],
): string | undefined {
  const groups = new Map<string, number[]>();
  exercises.forEach((exercise, index) => {
    const group = exercise.supersetGroup?.trim();
    if (!group) return;
    groups.set(group, [...(groups.get(group) ?? []), index]);
  });
  for (const [group, indices] of groups) {
    if (indices.length < 2 || indices.some((index, pos) =>
      index !== indices[0] + pos
    )) {
      return group;
    }
  }
  return undefined;
}
