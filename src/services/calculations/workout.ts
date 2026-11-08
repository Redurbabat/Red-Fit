import type { ExerciseLog, SetLog, WorkoutLog } from "../../models";
import { getIsoWeekKey, getLocalDateKey } from "../../utils/dates";

/** volume = weightKg × reps — only completed sets count toward totals. */
export function calculateSetVolume(set: Pick<SetLog, "weightKg" | "reps">): number {
  return set.weightKg * set.reps;
}

export function calculateExerciseVolume(exerciseLog: ExerciseLog): number {
  return exerciseLog.setLogs
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + calculateSetVolume(s), 0);
}

export function calculateWorkoutVolume(workout: WorkoutLog): number {
  return workout.exerciseLogs.reduce((sum, e) => sum + calculateExerciseVolume(e), 0);
}

/** Duration from absolute timestamps — never from interval state. */
export function calculateWorkoutDuration(workout: WorkoutLog, now?: number): number {
  const start = new Date(workout.startedAt).getTime();
  const end = workout.endedAt ? new Date(workout.endedAt).getTime() : (now ?? Date.now());
  return Math.max(0, Math.round((end - start) / 1000));
}

export function countCompletedSets(workout: WorkoutLog): number {
  return workout.exerciseLogs.reduce(
    (sum, e) => sum + e.setLogs.filter((s) => s.completed).length,
    0,
  );
}

export function countTotalReps(workout: WorkoutLog): number {
  return workout.exerciseLogs.reduce(
    (sum, e) =>
      sum + e.setLogs.filter((s) => s.completed).reduce((r, s) => r + s.reps, 0),
    0,
  );
}

/**
 * Estimated one-rep max (Epley): weight × (1 + reps / 30). A single rep is
 * the weight itself; bodyweight sets (0 kg) and empty sets yield 0. Above
 * ~12 reps the estimate gets unreliable — it is a hint, never a target.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxRepsAtMaxWeight: number;
  bestSetVolume: number;
  bestExerciseVolume: number;
  bestE1rmKg: number;
  bestE1rmSet?: Pick<SetLog, "weightKg" | "reps">;
}

/** Fold one exercise block into the per-exercise record map (mutates `records`). */
function accumulateExerciseRecord(
  records: Map<string, ExerciseRecord>,
  exerciseLog: ExerciseLog,
): void {
  // A checked set with zero repetitions is not a performed personal record.
  const completedSets = exerciseLog.setLogs.filter((s) => s.completed && s.reps > 0);
  if (completedSets.length === 0) return;
  const existing = records.get(exerciseLog.exerciseId) ?? {
    exerciseId: exerciseLog.exerciseId,
    exerciseName: exerciseLog.name,
    maxWeightKg: 0,
    maxRepsAtMaxWeight: 0,
    bestSetVolume: 0,
    bestExerciseVolume: 0,
    bestE1rmKg: 0,
  };
  for (const set of completedSets) {
    const e1rm = estimateOneRepMax(set.weightKg, set.reps);
    if (e1rm > existing.bestE1rmKg) {
      existing.bestE1rmKg = e1rm;
      existing.bestE1rmSet = { weightKg: set.weightKg, reps: set.reps };
    }
    if (
      set.weightKg > existing.maxWeightKg ||
      (set.weightKg === existing.maxWeightKg && set.reps > existing.maxRepsAtMaxWeight)
    ) {
      if (set.weightKg > existing.maxWeightKg) {
        existing.maxWeightKg = set.weightKg;
        existing.maxRepsAtMaxWeight = set.reps;
      } else {
        existing.maxRepsAtMaxWeight = set.reps;
      }
    }
    existing.bestSetVolume = Math.max(existing.bestSetVolume, calculateSetVolume(set));
  }
  existing.bestExerciseVolume = Math.max(
    existing.bestExerciseVolume,
    calculateExerciseVolume(exerciseLog),
  );
  existing.exerciseName = exerciseLog.name;
  records.set(exerciseLog.exerciseId, existing);
}

/**
 * Personal records per exercise across completed workouts:
 * heaviest weight, most reps at that weight, best single-set and exercise volume.
 */
export function findExerciseRecords(workoutLogs: WorkoutLog[]): Map<string, ExerciseRecord> {
  const records = new Map<string, ExerciseRecord>();
  for (const workout of workoutLogs) {
    if (workout.status !== "completed") continue;
    for (const exerciseLog of workout.exerciseLogs) {
      accumulateExerciseRecord(records, exerciseLog);
    }
  }
  return records;
}

/**
 * Records set by THIS workout compared against earlier completed workouts:
 * a heavier set or more repetitions at the heaviest recorded weight (also
 * handles bodyweight exercises, where weightKg is 0). Later sessions must not
 * erase a genuine historical PR when viewing an older workout summary.
 * The workout is first aggregated per exerciseId — the same exercise may appear
 * in several blocks of one workout and must yield at most ONE record entry
 * (WorkoutSummaryPage renders the list keyed by exerciseId).
 */
export function findNewRecords(
  workout: WorkoutLog,
  previousWorkouts: WorkoutLog[],
): ExerciseRecord[] {
  // Discarded/in-progress sessions must never produce a new personal record.
  if (workout.status !== "completed") return [];
  const previous = findExerciseRecords(
    previousWorkouts.filter((w) =>
      w.id !== workout.id && (
        w.date < workout.date ||
        (w.date === workout.date && w.startedAt < workout.startedAt)
      ),
    ),
  );
  const current = new Map<string, ExerciseRecord>();
  for (const exerciseLog of workout.exerciseLogs) {
    accumulateExerciseRecord(current, exerciseLog);
  }
  const fresh: ExerciseRecord[] = [];
  for (const record of current.values()) {
    const old = previous.get(record.exerciseId);
    // A best weight is one kind of record; more reps at the same maximum
    // weight (including unweighted/bodyweight sets) is another.
    if (
      !old ||
      record.maxWeightKg > old.maxWeightKg ||
      (record.maxWeightKg === old.maxWeightKg &&
        record.maxRepsAtMaxWeight > old.maxRepsAtMaxWeight)
    ) {
      fresh.push(record);
    }
  }
  return fresh;
}

/**
 * Training-week streak: consecutive calendar weeks (ISO, Monday-based) with at
 * least one completed workout, counted backwards from the current week. The
 * current week also counts if it has no workout *yet* (streak not broken until
 * the week is over).
 */
export function calculateTrainingWeekStreak(
  workoutLogs: WorkoutLog[],
  today: string = getLocalDateKey(),
): number {
  const weeksWithWorkout = new Set(
    workoutLogs.filter((w) => w.status === "completed").map((w) => getIsoWeekKey(w.date)),
  );
  if (weeksWithWorkout.size === 0) return 0;

  let streak = 0;
  let cursor = today;
  const currentWeek = getIsoWeekKey(today);
  // Walk backwards week by week (7-day steps are safe with ISO week keys).
  for (let i = 0; i < 10 * 52; i++) {
    const week = getIsoWeekKey(cursor);
    if (weeksWithWorkout.has(week)) {
      streak++;
    } else if (week === currentWeek) {
      // Current week without a workout yet — neutral, keep looking backwards.
    } else {
      break;
    }
    const d = new Date(cursor + "T12:00:00");
    d.setDate(d.getDate() - 7);
    cursor = getLocalDateKey(d);
  }
  return streak;
}

export interface LastPerformance {
  date: string;
  /** Completed sets of that session, in logged order. */
  sets: Pick<SetLog, "weightKg" | "reps">[];
}

/**
 * Completed sets of the most recent completed workout containing this
 * exercise. Expects `workoutLogs` newest-first (listCompleted order).
 */
export function findLastPerformance(
  workoutLogs: WorkoutLog[],
  exerciseId: string,
): LastPerformance | undefined {
  for (const workout of workoutLogs) {
    if (workout.status !== "completed") continue;
    const sets = workout.exerciseLogs
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.setLogs.filter((s) => s.completed));
    if (sets.length > 0) return { date: workout.date, sets };
  }
  return undefined;
}

/**
 * Simple double progression: if EVERY completed set of the last session
 * reached the target reps, suggest the top weight plus one increment —
 * otherwise no suggestion (keep working at the current weight).
 */
export function suggestNextWeight(
  last: LastPerformance | undefined,
  targetReps: number | undefined,
  incrementKg = 2.5,
): number | undefined {
  if (!last || !targetReps || targetReps <= 0) return undefined;
  const topWeight = Math.max(...last.sets.map((s) => s.weightKg));
  if (topWeight <= 0) return undefined;
  if (!last.sets.every((s) => s.reps >= targetReps)) return undefined;
  return topWeight + incrementKg;
}

/** Estimated session length used on cards: ~3 min per planned set + rest. */
export function estimateSessionMinutes(totalSets: number, avgRestSeconds = 90): number {
  const perSetSeconds = 45 + avgRestSeconds;
  return Math.max(10, Math.round((totalSets * perSetSeconds) / 60));
}
