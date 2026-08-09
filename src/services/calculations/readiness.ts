import type { RecoveryLog, WorkoutLog } from "../../models";
import { getLocalDateKey } from "../../utils/dates";

/**
 * Explainable readiness (§12 of the 2031 mandate): never a black-box number.
 * Every factor that moves the score is returned with its delta so the UI can
 * show WHY the score is what it is. This is recovery support, not medicine.
 */

export type ReadinessFactorKey =
  | "sleep"
  | "energy"
  | "stress"
  | "soreness"
  | "restDays"
  | "trainedToday";

export interface ReadinessFactor {
  key: ReadinessFactorKey;
  /** Signed contribution to the score, e.g. +16 or -6. */
  delta: number;
  /** The raw value behind the factor (rating 1–5 or day count). */
  value: number;
}

export interface Readiness {
  /** 0–100, higher = readier to train hard. */
  score: number;
  factors: ReadinessFactor[];
}

const BASE_SCORE = 50;

/** Rating factors: 3 is neutral, each step away moves the score by `perStep`. */
function ratingFactor(
  key: ReadinessFactorKey,
  value: number,
  perStep: number,
): ReadinessFactor {
  return { key, value, delta: (value - 3) * perStep };
}

/** Whole days since the most recent completed workout, undefined if none. */
export function daysSinceLastWorkout(
  workoutLogs: WorkoutLog[],
  today: string = getLocalDateKey(),
): number | undefined {
  let latest: string | undefined;
  for (const log of workoutLogs) {
    if (log.status !== "completed") continue;
    if (log.date > today) continue;
    if (!latest || log.date > latest) latest = log.date;
  }
  if (!latest) return undefined;
  const ms =
    new Date(`${today}T12:00:00`).getTime() - new Date(`${latest}T12:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Score = 50 base
 *   + sleep/energy (±8 per step from neutral 3)
 *   + stress/soreness (±6 per step; 5 = relaxed / no soreness)
 *   + training recency (1–3 rest days +6 · 1 day +2 · same day -4 · long gaps neutral)
 * clamped to 0–100. Without a check-in there is no score — never invent one.
 */
export function calculateReadiness(
  recovery: RecoveryLog | undefined,
  workoutLogs: WorkoutLog[],
  today: string = getLocalDateKey(),
): Readiness | undefined {
  if (!recovery) return undefined;

  const factors: ReadinessFactor[] = [
    ratingFactor("sleep", recovery.sleepQuality, 8),
    ratingFactor("energy", recovery.energy, 8),
    ratingFactor("stress", recovery.stress, 6),
    ratingFactor("soreness", recovery.soreness, 6),
  ];

  const restDays = daysSinceLastWorkout(workoutLogs, today);
  if (restDays === 0) {
    factors.push({ key: "trainedToday", value: 0, delta: -4 });
  } else if (restDays === 1) {
    factors.push({ key: "restDays", value: 1, delta: 2 });
  } else if (restDays != null && restDays <= 3) {
    factors.push({ key: "restDays", value: restDays, delta: 6 });
  }

  const raw = BASE_SCORE + factors.reduce((sum, f) => sum + f.delta, 0);
  return { score: Math.max(0, Math.min(100, Math.round(raw))), factors };
}

/** German one-word verdict shown next to the number. */
export function readinessVerdict(score: number): string {
  if (score >= 80) return "Sehr gut";
  if (score >= 65) return "Gut";
  if (score >= 45) return "Mittel";
  if (score >= 30) return "Niedrig";
  return "Erholung nötig";
}
