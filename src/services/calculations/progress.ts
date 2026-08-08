import type { BodyMeasurement, WorkoutLog } from "../../models";
import { addDays, getLocalDateKey } from "../../utils/dates";
import {
  calculateWorkoutDuration,
  calculateWorkoutVolume,
} from "./workout";

export interface WeightTrend {
  currentKg?: number;
  previousKg?: number;
  changeKg?: number;
}

/** Current vs. previous logged weight (measurements are newest-first). */
export function calculateWeightTrend(newestFirst: BodyMeasurement[]): WeightTrend {
  const withWeight = newestFirst.filter((m) => m.weightKg != null);
  const current = withWeight[0]?.weightKg;
  const previous = withWeight[1]?.weightKg;
  return {
    currentKg: current,
    previousKg: previous,
    changeKg:
      current != null && previous != null
        ? Math.round((current - previous) * 10) / 10
        : undefined,
  };
}

export interface TrainingStats {
  workoutsThisWeek: number;
  workoutsLast30Days: number;
  totalVolumeKg: number;
  avgDurationSeconds: number;
}

export function calculateTrainingStats(
  completedLogs: WorkoutLog[],
  today: string = getLocalDateKey(),
): TrainingStats {
  const weekAgo = addDays(today, -6);
  const monthAgo = addDays(today, -29);
  const thisWeek = completedLogs.filter((w) => w.date >= weekAgo && w.date <= today);
  const last30 = completedLogs.filter((w) => w.date >= monthAgo && w.date <= today);
  const totalVolume = completedLogs.reduce((sum, w) => sum + calculateWorkoutVolume(w), 0);
  const durations = completedLogs
    .map((w) => calculateWorkoutDuration(w))
    .filter((d) => d > 0);
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
  return {
    workoutsThisWeek: thisWeek.length,
    workoutsLast30Days: last30.length,
    totalVolumeKg: Math.round(totalVolume),
    avgDurationSeconds: avgDuration,
  };
}

export interface TopExercise {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  totalVolumeKg: number;
}

/** Strongest exercises by max weight (top N) for the progress screen. */
export function findTopExercises(completedLogs: WorkoutLog[], limit = 5): TopExercise[] {
  const byExercise = new Map<string, TopExercise>();
  for (const workout of completedLogs) {
    for (const exerciseLog of workout.exerciseLogs) {
      const completedSets = exerciseLog.setLogs.filter((s) => s.completed);
      if (completedSets.length === 0) continue;
      const entry = byExercise.get(exerciseLog.exerciseId) ?? {
        exerciseId: exerciseLog.exerciseId,
        exerciseName: exerciseLog.name,
        maxWeightKg: 0,
        totalVolumeKg: 0,
      };
      entry.maxWeightKg = Math.max(
        entry.maxWeightKg,
        ...completedSets.map((s) => s.weightKg),
      );
      entry.totalVolumeKg += completedSets.reduce((v, s) => v + s.weightKg * s.reps, 0);
      entry.exerciseName = exerciseLog.name;
      byExercise.set(exerciseLog.exerciseId, entry);
    }
  }
  return [...byExercise.values()]
    .sort((a, b) => b.maxWeightKg - a.maxWeightKg)
    .slice(0, limit);
}
