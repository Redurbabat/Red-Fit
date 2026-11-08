import type { Exercise } from "../../models";

/**
 * Warm-up ramp adapted for RED Fit from the openGym warmup-ramp concept.
 * Source context: openGym frontend/src/lib/warmup-ramp.js (AGPL-3.0-or-later).
 * This is an advisory preview only. It never edits or completes workout sets.
 */
export interface WarmupSet {
  weightKg: number;
  reps: number;
}

export interface WarmupOptions {
  /** The load used in the first planned work set. */
  workWeightKg: number;
  /** Whether several joints move under load, e.g. squat, row, bench. */
  compound: boolean;
  /** Barbell starting mass in kg, omitted for dumbbells/machines. */
  barWeightKg?: number;
  /** Smallest load step at the selected gym. */
  incrementKg?: number;
}

interface Rung {
  percent?: number;
  bar?: boolean;
  reps: number;
}

export function isCompoundMovement(
  exercise: Pick<Exercise, "animationType" | "muscleGroup">,
): boolean {
  if (exercise.muscleGroup === "cardio" || exercise.muscleGroup === "mobility") {
    return false;
  }
  return (
    exercise.animationType === "push" ||
    exercise.animationType === "pull" ||
    exercise.animationType === "squat" ||
    exercise.animationType === "hinge" ||
    exercise.animationType === "press" ||
    exercise.animationType === "lunges"
  );
}

/** Round load down to a selectable increment, not up toward working weight. */
function snapDown(weight: number, increment: number): number {
  return Math.round(Math.floor(weight / increment + 1e-9) * increment * 100) / 100;
}

export function calculateWarmupSets({
  workWeightKg,
  compound,
  barWeightKg = 0,
  incrementKg = 2.5,
}: WarmupOptions): WarmupSet[] {
  if (!Number.isFinite(workWeightKg) || workWeightKg <= 0) return [];
  if (!Number.isFinite(incrementKg) || incrementKg <= 0) return [];
  if (!Number.isFinite(barWeightKg) || barWeightKg < 0) return [];

  const hasBar = barWeightKg > 0 && barWeightKg < workWeightKg;
  let rungs: Rung[];

  if (compound && workWeightKg >= 60) {
    rungs = hasBar
      ? [{ bar: true, reps: 10 }, { percent: 40, reps: 5 }, { percent: 60, reps: 3 }, { percent: 80, reps: 1 }]
      : [{ percent: 40, reps: 8 }, { percent: 60, reps: 4 }, { percent: 80, reps: 1 }];
  } else if (compound && workWeightKg >= 30) {
    rungs = hasBar
      ? [{ bar: true, reps: 10 }, { percent: 70, reps: 3 }]
      : [{ percent: 50, reps: 8 }, { percent: 75, reps: 3 }];
  } else if (compound) {
    rungs = hasBar ? [{ bar: true, reps: 10 }] : [{ percent: 50, reps: 8 }];
  } else if (workWeightKg >= 40) {
    rungs = [{ percent: 50, reps: 10 }, { percent: 75, reps: 4 }];
  } else if (workWeightKg >= 10) {
    rungs = [{ percent: 50, reps: 10 }];
  } else {
    rungs = [];
  }

  const sets: WarmupSet[] = [];
  let lastWeight = -1;

  for (const rung of rungs) {
    const desired = rung.bar ? barWeightKg : workWeightKg * (rung.percent ?? 0) / 100;
    const snapped = rung.bar
      ? barWeightKg
      : Math.max(hasBar ? barWeightKg : 0, snapDown(desired, incrementKg));

    // Remove duplicate rungs, impossible loads and working-weight collisions.
    if (snapped <= lastWeight || snapped <= 0 || snapped >= workWeightKg) continue;
    sets.push({ weightKg: snapped, reps: rung.reps });
    lastWeight = snapped;
  }

  return sets;
}
