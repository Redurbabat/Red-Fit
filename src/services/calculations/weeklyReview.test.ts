import { describe, expect, it } from "vitest";
import type { RecoveryLog, WorkoutLog, WorkoutPlan } from "../../models";
import { buildWeeklyReview } from "./weeklyReview";

const TODAY = "2026-08-08"; // Saturday, ISO week of Mon 2026-08-03

function workout(date: string, volumeKg: number): WorkoutLog {
  return {
    id: `w-${date}-${volumeKg}`,
    date,
    name: "Push",
    startedAt: `${date}T18:00:00.000Z`,
    status: "completed",
    exerciseLogs: [
      {
        id: "e",
        exerciseId: "bench",
        name: "Bankdrücken",
        setLogs: [
          { id: "s", setIndex: 0, weightKg: volumeKg, reps: 1, completed: true },
        ],
      },
    ],
    createdAt: `${date}T18:00:00.000Z`,
    updatedAt: `${date}T18:00:00.000Z`,
  };
}

function plan(daysPerWeek: number): WorkoutPlan {
  return {
    id: "p1",
    name: "PPL",
    goal: "buildMuscle",
    daysPerWeek,
    level: "intermediate",
    location: "gym",
    active: true,
    sessions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function recovery(date: string, all: number): RecoveryLog {
  return {
    id: `r-${date}`,
    date,
    sleepQuality: all,
    energy: all,
    stress: all,
    soreness: all,
    createdAt: `${date}T07:00:00.000Z`,
    updatedAt: `${date}T07:00:00.000Z`,
  };
}

const EMPTY = {
  mealLogs: [],
  goal: undefined,
  weightsNewestFirst: [],
  recoveryLogs: [],
  today: TODAY,
};

describe("buildWeeklyReview", () => {
  it("computes pace, volume delta and suggests open sessions", () => {
    const review = buildWeeklyReview({
      ...EMPTY,
      // this week: 2 workouts à 500 kg; previous week: 2 à 625 kg → -20 %
      completedLogs: [
        workout("2026-08-04", 500),
        workout("2026-08-06", 500),
        workout("2026-07-28", 625),
        workout("2026-07-30", 625),
      ],
      activePlan: plan(4),
    });
    expect(review.training).toEqual({ done: 2, planned: 4 });
    expect(review.volumeDeltaPercent).toBe(-20);
    const kinds = review.suggestions.map((s) => s.kind);
    expect(kinds).toContain("planSessions");
    expect(kinds).toContain("volumeDrop");
  });

  it("suggests recovery when the weekly average is low", () => {
    const review = buildWeeklyReview({
      ...EMPTY,
      completedLogs: [],
      activePlan: undefined,
      recoveryLogs: [recovery("2026-08-07", 2), recovery("2026-08-08", 2)],
    });
    expect(review.recoveryAvg).toBe(2);
    expect(review.suggestions.map((s) => s.kind)).toContain("recovery");
  });

  it("reports on-track when nothing fires", () => {
    const review = buildWeeklyReview({
      ...EMPTY,
      completedLogs: [
        workout("2026-08-03", 500),
        workout("2026-08-05", 500),
        workout("2026-08-07", 520),
      ],
      activePlan: plan(3),
    });
    expect(review.training).toEqual({ done: 3, planned: 3 });
    expect(review.suggestions).toEqual([{ kind: "onTrack" }]);
  });

  it("computes the 7-day weight delta from the window edges", () => {
    const review = buildWeeklyReview({
      ...EMPTY,
      completedLogs: [],
      activePlan: undefined,
      weightsNewestFirst: [
        { date: "2026-08-08", weightKg: 78.1 },
        { date: "2026-08-04", weightKg: 78.3 },
        { date: "2026-08-01", weightKg: 79.0 }, // outside the 7-day window (02.–08.08.)
      ],
    });
    expect(review.weightDelta7dKg).toBeCloseTo(-0.2, 5);
  });
});
