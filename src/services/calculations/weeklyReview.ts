import type {
  MealLog,
  NutritionGoal,
  RecoveryLog,
  WorkoutLog,
  WorkoutPlan,
} from "../../models";
import { getIsoWeekKey, getLocalDateKey } from "../../utils/dates";
import { proteinAdherenceInsight, lastLocalDates } from "./insights";
import { calculateWorkoutVolume } from "./workout";

/**
 * Deterministic weekly review (§68): a handful of honest numbers plus at most
 * three concrete, rule-based suggestions. No AI, no invented advice.
 */

export type WeeklySuggestion =
  | { kind: "planSessions"; open: number }
  | { kind: "protein"; hitDays: number; trackedDays: number }
  | { kind: "volumeDrop"; percent: number }
  | { kind: "recovery"; avg: number }
  | { kind: "onTrack" };

export interface WeeklyReview {
  /** Completed sessions this ISO week vs. the plan's weekly target (0 = no plan). */
  training: { done: number; planned: number };
  /** Volume change vs. the previous ISO week in percent, undefined without a base. */
  volumeDeltaPercent?: number;
  /** Protein target hits over the tracked days of the last 7 days. */
  protein?: { hitDays: number; trackedDays: number };
  /** Weight change across the last 7 days (needs 2+ measurements). */
  weightDelta7dKg?: number;
  /** Average recovery rating (1–5) over the last 7 days of check-ins. */
  recoveryAvg?: number;
  suggestions: WeeklySuggestion[];
}

function weekVolume(logs: WorkoutLog[], weekKey: string): number {
  return logs
    .filter((w) => w.status === "completed" && getIsoWeekKey(w.date) === weekKey)
    .reduce((sum, w) => sum + calculateWorkoutVolume(w), 0);
}

export function buildWeeklyReview(input: {
  completedLogs: WorkoutLog[];
  activePlan: WorkoutPlan | undefined;
  mealLogs: MealLog[];
  goal: NutritionGoal | undefined;
  weightsNewestFirst: { date: string; weightKg: number }[];
  recoveryLogs: RecoveryLog[];
  today?: string;
}): WeeklyReview {
  const today = input.today ?? getLocalDateKey();
  const window = new Set(lastLocalDates(7, today));

  // Training pace
  const planned = input.activePlan
    ? input.activePlan.daysPerWeek || input.activePlan.sessions.length
    : 0;
  const thisWeek = getIsoWeekKey(today);
  const done = input.completedLogs.filter(
    (w) => w.status === "completed" && getIsoWeekKey(w.date) === thisWeek,
  ).length;

  // Volume vs. previous week
  const prevWeekAnchor = new Date(`${today}T12:00:00`);
  prevWeekAnchor.setDate(prevWeekAnchor.getDate() - 7);
  const prevWeek = getIsoWeekKey(getLocalDateKey(prevWeekAnchor));
  const currentVolume = weekVolume(input.completedLogs, thisWeek);
  const previousVolume = weekVolume(input.completedLogs, prevWeek);
  const volumeDeltaPercent =
    previousVolume > 0
      ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
      : undefined;

  // Protein adherence (tracked days only)
  const proteinInsight = proteinAdherenceInsight(input.mealLogs, input.goal, today);
  const protein =
    proteinInsight?.kind === "proteinAdherence"
      ? { hitDays: proteinInsight.hitDays, trackedDays: proteinInsight.trackedDays }
      : undefined;

  // Weight across the 7-day window
  const weights = input.weightsNewestFirst.filter((w) => window.has(w.date));
  const weightDelta7dKg =
    weights.length >= 2
      ? Math.round((weights[0].weightKg - weights[weights.length - 1].weightKg) * 10) / 10
      : undefined;

  // Recovery average (mean of the four dials per check-in)
  const weekRecovery = input.recoveryLogs.filter((r) => window.has(r.date));
  const recoveryAvg =
    weekRecovery.length > 0
      ? Math.round(
          (weekRecovery.reduce(
            (sum, r) => sum + (r.sleepQuality + r.energy + r.stress + r.soreness) / 4,
            0,
          ) /
            weekRecovery.length) *
            10,
        ) / 10
      : undefined;

  // Suggestions: priority-ordered, max three, "on track" only when nothing else fires.
  const suggestions: WeeklySuggestion[] = [];
  if (planned > 0 && done < planned) {
    suggestions.push({ kind: "planSessions", open: planned - done });
  }
  if (protein && protein.hitDays / protein.trackedDays < 0.7) {
    suggestions.push({ kind: "protein", ...protein });
  }
  if (volumeDeltaPercent != null && volumeDeltaPercent <= -15) {
    suggestions.push({ kind: "volumeDrop", percent: volumeDeltaPercent });
  }
  if (recoveryAvg != null && recoveryAvg < 3) {
    suggestions.push({ kind: "recovery", avg: recoveryAvg });
  }
  if (suggestions.length === 0) suggestions.push({ kind: "onTrack" });

  return {
    training: { done, planned },
    volumeDeltaPercent,
    protein,
    weightDelta7dKg,
    recoveryAvg,
    suggestions: suggestions.slice(0, 3),
  };
}
