import type { MealLog, NutritionGoal, WorkoutLog, WorkoutPlan } from "../../models";
import { getIsoWeekKey, getLocalDateKey } from "../../utils/dates";
import { calculateDailyNutrition } from "./nutrition";

/**
 * Deterministic coach insights (§63 of the 2031 mandate): every statement is
 * derived from logged data — no AI, no guesses. Returns typed insights; the
 * UI maps them to German sentences. At most the two most relevant are shown.
 */

export type Insight =
  | { kind: "proteinAdherence"; hitDays: number; trackedDays: number }
  | { kind: "trainingPace"; done: number; planned: number }
  | { kind: "weightTrend"; deltaKg: number; days: number };

/** Local date keys of the last `count` days, today included, oldest first. */
export function lastLocalDates(count: number, today: string = getLocalDateKey()): string[] {
  const dates: string[] = [];
  const base = new Date(`${today}T12:00:00`);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateKey(d));
  }
  return dates;
}

/**
 * Protein adherence over the last 7 days: only days with logged meals count
 * as tracked — empty days are unknown, not failures. Needs ≥3 tracked days.
 */
export function proteinAdherenceInsight(
  mealLogs: MealLog[],
  goal: NutritionGoal | undefined,
  today: string = getLocalDateKey(),
): Insight | undefined {
  if (!goal || goal.dailyProtein <= 0) return undefined;
  const window = new Set(lastLocalDates(7, today));
  const byDate = new Map<string, MealLog[]>();
  for (const log of mealLogs) {
    if (!window.has(log.date) || log.entries.length === 0) continue;
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), log]);
  }
  if (byDate.size < 3) return undefined;
  let hitDays = 0;
  for (const logs of byDate.values()) {
    if (calculateDailyNutrition(logs).protein >= goal.dailyProtein) hitDays++;
  }
  return { kind: "proteinAdherence", hitDays, trackedDays: byDate.size };
}

/** Completed sessions this ISO week vs. the active plan's weekly target. */
export function trainingPaceInsight(
  completedLogs: WorkoutLog[],
  activePlan: WorkoutPlan | undefined,
  today: string = getLocalDateKey(),
): Insight | undefined {
  const planned = activePlan ? activePlan.daysPerWeek || activePlan.sessions.length : 0;
  if (planned === 0) return undefined;
  const week = getIsoWeekKey(today);
  const done = completedLogs.filter(
    (w) => w.status === "completed" && getIsoWeekKey(w.date) === week,
  ).length;
  return { kind: "trainingPace", done, planned };
}

/**
 * Weight trend over ~3 weeks using first/last of the window (single weigh-ins
 * are noise — needs ≥3 measurements ≥14 days apart).
 */
export function weightTrendInsight(
  weightsNewestFirst: { date: string; weightKg: number }[],
  today: string = getLocalDateKey(),
): Insight | undefined {
  const cutoff = lastLocalDates(21, today)[0];
  const window = weightsNewestFirst.filter((w) => w.date >= cutoff && w.date <= today);
  if (window.length < 3) return undefined;
  const newest = window[0];
  const oldest = window[window.length - 1];
  const spanMs =
    new Date(`${newest.date}T12:00:00`).getTime() -
    new Date(`${oldest.date}T12:00:00`).getTime();
  const days = Math.round(spanMs / 86_400_000);
  if (days < 14) return undefined;
  return {
    kind: "weightTrend",
    deltaKg: Math.round((newest.weightKg - oldest.weightKg) * 10) / 10,
    days,
  };
}

/** All available insights, most actionable first; UI shows at most two. */
export function buildTodayInsights(input: {
  mealLogs: MealLog[];
  goal: NutritionGoal | undefined;
  completedLogs: WorkoutLog[];
  activePlan: WorkoutPlan | undefined;
  weightsNewestFirst: { date: string; weightKg: number }[];
  today?: string;
}): Insight[] {
  const today = input.today ?? getLocalDateKey();
  const insights: Insight[] = [];
  const pace = trainingPaceInsight(input.completedLogs, input.activePlan, today);
  if (pace) insights.push(pace);
  const protein = proteinAdherenceInsight(input.mealLogs, input.goal, today);
  if (protein) insights.push(protein);
  const weight = weightTrendInsight(input.weightsNewestFirst, today);
  if (weight) insights.push(weight);
  return insights;
}
