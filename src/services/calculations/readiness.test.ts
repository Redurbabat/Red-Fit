import { describe, expect, it } from "vitest";
import type { RecoveryLog, WorkoutLog } from "../../models";
import { calculateReadiness, daysSinceLastWorkout, readinessVerdict } from "./readiness";

function recovery(overrides: Partial<RecoveryLog> = {}): RecoveryLog {
  return {
    id: "r1",
    date: "2026-08-08",
    sleepQuality: 3,
    energy: 3,
    stress: 3,
    soreness: 3,
    createdAt: "2026-08-08T07:00:00.000Z",
    updatedAt: "2026-08-08T07:00:00.000Z",
    ...overrides,
  };
}

function completedWorkout(date: string): WorkoutLog {
  return {
    id: `w-${date}`,
    date,
    name: "Push",
    startedAt: `${date}T18:00:00.000Z`,
    status: "completed",
    exerciseLogs: [],
    createdAt: `${date}T18:00:00.000Z`,
    updatedAt: `${date}T18:00:00.000Z`,
  };
}

describe("daysSinceLastWorkout", () => {
  it("returns undefined without completed workouts", () => {
    expect(daysSinceLastWorkout([], "2026-08-08")).toBeUndefined();
  });

  it("counts whole local days", () => {
    expect(daysSinceLastWorkout([completedWorkout("2026-08-06")], "2026-08-08")).toBe(2);
    expect(daysSinceLastWorkout([completedWorkout("2026-08-08")], "2026-08-08")).toBe(0);
  });

  it("ignores future-dated logs", () => {
    expect(
      daysSinceLastWorkout(
        [completedWorkout("2026-08-09"), completedWorkout("2026-08-05")],
        "2026-08-08",
      ),
    ).toBe(3);
  });
});

describe("calculateReadiness", () => {
  it("returns undefined without a check-in — no invented score", () => {
    expect(calculateReadiness(undefined, [], "2026-08-08")).toBeUndefined();
  });

  it("all-neutral check-in without training history stays at base 50", () => {
    const r = calculateReadiness(recovery(), [], "2026-08-08");
    expect(r?.score).toBe(50);
  });

  it("computes the documented example shape: good sleep, rest days, low energy, sore legs", () => {
    const r = calculateReadiness(
      recovery({ sleepQuality: 5, energy: 2, soreness: 2 }),
      [completedWorkout("2026-08-06")],
      "2026-08-08",
    );
    // 50 +16 (sleep) -8 (energy) +0 (stress) -6 (soreness) +6 (2 rest days) = 58
    expect(r?.score).toBe(58);
    const byKey = Object.fromEntries((r?.factors ?? []).map((f) => [f.key, f.delta]));
    expect(byKey.sleep).toBe(16);
    expect(byKey.energy).toBe(-8);
    expect(byKey.soreness).toBe(-6);
    expect(byKey.restDays).toBe(6);
  });

  it("training earlier the same day lowers the score", () => {
    const r = calculateReadiness(recovery(), [completedWorkout("2026-08-08")], "2026-08-08");
    expect(r?.score).toBe(46);
    expect(r?.factors.some((f) => f.key === "trainedToday")).toBe(true);
  });

  it("clamps to 0–100", () => {
    const top = calculateReadiness(
      recovery({ sleepQuality: 5, energy: 5, stress: 5, soreness: 5 }),
      [completedWorkout("2026-08-06")],
      "2026-08-08",
    );
    expect(top?.score).toBeLessThanOrEqual(100);
    const bottom = calculateReadiness(
      recovery({ sleepQuality: 1, energy: 1, stress: 1, soreness: 1 }),
      [],
      "2026-08-08",
    );
    expect(bottom?.score).toBeGreaterThanOrEqual(0);
  });
});

describe("readinessVerdict", () => {
  it("maps scores to German verdicts", () => {
    expect(readinessVerdict(85)).toBe("Sehr gut");
    expect(readinessVerdict(70)).toBe("Gut");
    expect(readinessVerdict(50)).toBe("Mittel");
    expect(readinessVerdict(35)).toBe("Niedrig");
    expect(readinessVerdict(10)).toBe("Erholung nötig");
  });
});
