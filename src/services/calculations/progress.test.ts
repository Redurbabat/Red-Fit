import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "../../models";
import { calculateTrainingStats, calculateWeightTrend } from "./progress";

function completedWorkout(id: string, date: string): WorkoutLog {
  return {
    id,
    date,
    name: "Push",
    startedAt: `${date}T10:00:00.000Z`,
    endedAt: `${date}T11:00:00.000Z`,
    status: "completed",
    exerciseLogs: [],
    createdAt: "x",
    updatedAt: "x",
  };
}

describe("calculateTrainingStats", () => {
  it("counts 'this week' as the calendar week (Monday-based), not a rolling 7-day window", () => {
    // Friday 2026-08-07: the calendar week runs Mon 2026-08-03 – Sun 2026-08-09.
    const logs = [
      completedWorkout("1", "2026-08-01"), // Saturday, previous week
      completedWorkout("2", "2026-08-02"), // Sunday, previous week
      completedWorkout("3", "2026-08-03"), // Monday, this week
    ];
    const stats = calculateTrainingStats(logs, "2026-08-07");
    // Rolling 7-day semantics would report 3 here — calendar week reports 1.
    expect(stats.workoutsThisWeek).toBe(1);
    expect(stats.workoutsLast30Days).toBe(3);
  });

  it("counts every workout of the current week including today", () => {
    const logs = [
      completedWorkout("1", "2026-08-03"), // Monday
      completedWorkout("2", "2026-08-07"), // Friday (= today)
    ];
    expect(calculateTrainingStats(logs, "2026-08-07").workoutsThisWeek).toBe(2);
  });

  it("returns zeros for no workouts", () => {
    const stats = calculateTrainingStats([], "2026-08-07");
    expect(stats.workoutsThisWeek).toBe(0);
    expect(stats.workoutsLast30Days).toBe(0);
    expect(stats.totalVolumeKg).toBe(0);
    expect(stats.avgDurationSeconds).toBe(0);
  });
});

describe("calculateWeightTrend", () => {
  it("compares the two newest logged weights", () => {
    const trend = calculateWeightTrend([
      { id: "a", date: "2026-08-08", weightKg: 81.2, createdAt: "x", updatedAt: "x" },
      { id: "b", date: "2026-08-01", weightKg: 82.0, createdAt: "x", updatedAt: "x" },
    ]);
    expect(trend.currentKg).toBe(81.2);
    expect(trend.previousKg).toBe(82.0);
    expect(trend.changeKg).toBe(-0.8);
  });
});
