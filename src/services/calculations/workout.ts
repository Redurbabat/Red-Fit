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

export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxRepsAtMaxWeight: number;
  bestSetVolume: number;
  bestExerciseVolume: number;
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
      const completedSets = exerciseLog.setLogs.filter((s) => s.completed);
      if (completedSets.length === 0) continue;
      const existing = records.get(exerciseLog.exerciseId) ?? {
        exerciseId: exerciseLog.exerciseId,
        exerciseName: exerciseLog.name,
        maxWeightKg: 0,
        maxRepsAtMaxWeight: 0,
        bestSetVolume: 0,
        bestExerciseVolume: 0,
      };
      for (const set of completedSets) {
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
  }
  return records;
}

/** Records set by THIS workout compared against all previous completed workouts. */
export function findNewRecords(
  workout: WorkoutLog,
  previousWorkouts: WorkoutLog[],
): ExerciseRecord[] {
  const previous = findExerciseRecords(
    previousWorkouts.filter((w) => w.id !== workout.id),
  );
  const fresh: ExerciseRecord[] = [];
  for (const exerciseLog of workout.exerciseLogs) {
    const completedSets = exerciseLog.setLogs.filter((s) => s.completed);
    if (completedSets.length === 0) continue;
    const maxWeight = Math.max(...completedSets.map((s) => s.weightKg));
    const old = previous.get(exerciseLog.exerciseId);
    if (!old || maxWeight > old.maxWeightKg) {
      const bestSet = completedSets.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
      fresh.push({
        exerciseId: exerciseLog.exerciseId,
        exerciseName: exerciseLog.name,
        maxWeightKg: maxWeight,
        maxRepsAtMaxWeight: bestSet.reps,
        bestSetVolume: calculateSetVolume(bestSet),
        bestExerciseVolume: calculateExerciseVolume(exerciseLog),
      });
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

/** Estimated session length used on cards: ~3 min per planned set + rest. */
export function estimateSessionMinutes(totalSets: number, avgRestSeconds = 90): number {
  const perSetSeconds = 45 + avgRestSeconds;
  return Math.max(10, Math.round((totalSets * perSetSeconds) / 60));
}
