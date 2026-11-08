import { describe, expect, it } from "vitest";
import type { SetLog, WorkoutLog } from "../../models";
import {
  calculateExerciseVolume,
  calculateSetVolume,
  calculateTrainingWeekStreak,
  calculateWorkoutDuration,
  calculateWorkoutVolume,
  estimateOneRepMax,
  findExerciseRecords,
  findLastPerformance,
  findNewRecords,
  suggestNextWeight,
} from "./workout";

function set(weightKg: number, reps: number, completed = true): SetLog {
  return {
    id: `${weightKg}-${reps}-${Math.random()}`,
    setIndex: 0,
    weightKg,
    reps,
    completed,
  };
}

function workout(overrides: Partial<WorkoutLog>): WorkoutLog {
  return {
    id: "w1",
    date: "2026-08-08",
    name: "Push",
    startedAt: "2026-08-08T10:00:00.000Z",
    status: "completed",
    exerciseLogs: [],
    createdAt: "x",
    updatedAt: "x",
    ...overrides,
  };
}

describe("volume", () => {
  it("computes the reference case: 80×10 + 80×8 = 1440 kg", () => {
    expect(calculateSetVolume(set(80, 10))).toBe(800);
    expect(calculateSetVolume(set(80, 8))).toBe(640);
    const exerciseLog = {
      id: "e1",
      exerciseId: "bench",
      name: "Bankdrücken",
      setLogs: [set(80, 10), set(80, 8)],
    };
    expect(calculateExerciseVolume(exerciseLog)).toBe(1440);
  });

  it("ignores incomplete sets", () => {
    const exerciseLog = {
      id: "e1",
      exerciseId: "bench",
      name: "Bankdrücken",
      setLogs: [set(80, 10), set(100, 10, false)],
    };
    expect(calculateExerciseVolume(exerciseLog)).toBe(800);
  });

  it("sums the workout volume", () => {
    const w = workout({
      exerciseLogs: [
        { id: "e1", exerciseId: "a", name: "A", setLogs: [set(80, 10)] },
        { id: "e2", exerciseId: "b", name: "B", setLogs: [set(50, 12)] },
      ],
    });
    expect(calculateWorkoutVolume(w)).toBe(800 + 600);
  });
});

describe("duration", () => {
  it("uses absolute timestamps", () => {
    const w = workout({
      startedAt: "2026-08-08T10:00:00.000Z",
      endedAt: "2026-08-08T11:02:03.000Z",
    });
    expect(calculateWorkoutDuration(w)).toBe(3723);
  });
});

describe("records", () => {
  it("detects a new max weight", () => {
    const old = workout({
      id: "old",
      date: "2026-08-01",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 8)] }],
    });
    const fresh = workout({
      id: "new",
      date: "2026-08-08",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(85, 5)] }],
    });
    const records = findNewRecords(fresh, [old]);
    expect(records).toHaveLength(1);
    expect(records[0].maxWeightKg).toBe(85);
  });

  it("reports exactly one record when the same exercise appears in two blocks", () => {
    const old = workout({
      id: "old",
      date: "2026-08-01",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 8)] }],
    });
    // Same exercise added twice in one workout — both blocks beat the old record.
    const fresh = workout({
      id: "new",
      date: "2026-08-08",
      exerciseLogs: [
        { id: "e1", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(85, 5)] },
        { id: "e2", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(90, 3)] },
      ],
    });
    const records = findNewRecords(fresh, [old]);
    expect(records).toHaveLength(1);
    expect(records[0].exerciseId).toBe("bench");
    expect(records[0].maxWeightKg).toBe(90);
    expect(records[0].maxRepsAtMaxWeight).toBe(3);
  });

  it("detects more reps at the same max weight without requiring a heavier set", () => {
    const old = workout({
      id: "old",
      date: "2026-08-01",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 8)] }],
    });
    const fresh = workout({
      id: "new",
      date: "2026-08-08",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 10)] }],
    });
    expect(findNewRecords(fresh, [old])).toMatchObject([
      { exerciseId: "bench", maxWeightKg: 80, maxRepsAtMaxWeight: 10 },
    ]);
  });

  it("does not flag a repeat of an unchanged weight and rep count", () => {
    const old = workout({
      id: "old", date: "2026-08-01",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 10)] }],
    });
    const fresh = workout({
      id: "new", date: "2026-08-08",
      exerciseLogs: [{ id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 10)] }],
    });
    expect(findNewRecords(fresh, [old])).toHaveLength(0);
  });

  it("recognizes bodyweight repetition PRs and does not show zero-rep sets as records", () => {
    const old = workout({
      id: "old", date: "2026-08-01",
      exerciseLogs: [{ id: "e", exerciseId: "pullup", name: "Klimmzüge", setLogs: [set(0, 8)] }],
    });
    const fresh = workout({
      id: "new", date: "2026-08-08",
      exerciseLogs: [
        { id: "e1", exerciseId: "pullup", name: "Klimmzüge", setLogs: [set(0, 10)] },
        { id: "e2", exerciseId: "pullup", name: "Klimmzüge", setLogs: [set(0, 9)] },
      ],
    });
    expect(findNewRecords(fresh, [old])).toMatchObject([
      { exerciseId: "pullup", maxWeightKg: 0, maxRepsAtMaxWeight: 10 },
    ]);
    const zeroReps = workout({
      id: "zero",
      exerciseLogs: [{ id: "e", exerciseId: "pullup", name: "Klimmzüge", setLogs: [set(20, 0)] }],
    });
    expect(findNewRecords(zeroReps, [])).toHaveLength(0);
  });
});

describe("estimated 1RM (Epley)", () => {
  it("returns the weight itself for a single rep", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("computes 80 kg × 10 ≈ 106,7 kg", () => {
    expect(estimateOneRepMax(80, 10)).toBeCloseTo(106.67, 1);
  });

  it("yields 0 for bodyweight or empty sets", () => {
    expect(estimateOneRepMax(0, 12)).toBe(0);
    expect(estimateOneRepMax(80, 0)).toBe(0);
  });

  it("tracks the best e1RM set in records — high-rep set can beat max weight", () => {
    const w = workout({
      exerciseLogs: [
        {
          id: "e",
          exerciseId: "bench",
          name: "Bankdrücken",
          // 85×1 → 85 e1RM; 80×10 → 106,7 e1RM (better despite lower weight)
          setLogs: [set(85, 1), set(80, 10)],
        },
      ],
    });
    const record = findExerciseRecords([w]).get("bench");
    expect(record?.maxWeightKg).toBe(85);
    expect(record?.bestE1rmKg).toBeCloseTo(106.67, 1);
    expect(record?.bestE1rmSet).toEqual({ weightKg: 80, reps: 10 });
  });
});

describe("last performance", () => {
  const older = workout({
    id: "old",
    date: "2026-08-01",
    exerciseLogs: [
      { id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(75, 10)] },
    ],
  });
  const newer = workout({
    id: "new",
    date: "2026-08-05",
    exerciseLogs: [
      {
        id: "e",
        exerciseId: "bench",
        name: "Bankdrücken",
        setLogs: [set(80, 10), set(80, 9), set(80, 8, false)],
      },
    ],
  });

  it("returns completed sets of the most recent session (newest-first input)", () => {
    const last = findLastPerformance([newer, older], "bench");
    expect(last?.date).toBe("2026-08-05");
    expect(last?.sets.map((s) => s.reps)).toEqual([10, 9]);
  });

  it("skips workouts without completed sets of the exercise", () => {
    const empty = workout({
      id: "empty",
      date: "2026-08-07",
      exerciseLogs: [
        { id: "e", exerciseId: "bench", name: "Bankdrücken", setLogs: [set(80, 10, false)] },
      ],
    });
    expect(findLastPerformance([empty, older], "bench")?.date).toBe("2026-08-01");
  });

  it("returns undefined for an unknown exercise", () => {
    expect(findLastPerformance([newer], "squat")).toBeUndefined();
  });
});

describe("progression suggestion", () => {
  it("suggests +2,5 kg when all sets reached the target reps", () => {
    const last = { date: "2026-08-05", sets: [set(80, 10), set(80, 10), set(80, 10)] };
    expect(suggestNextWeight(last, 10)).toBe(82.5);
  });

  it("stays silent when a set missed the target", () => {
    const last = { date: "2026-08-05", sets: [set(80, 10), set(80, 9)] };
    expect(suggestNextWeight(last, 10)).toBeUndefined();
  });

  it("stays silent for bodyweight sets and missing targets", () => {
    expect(suggestNextWeight({ date: "d", sets: [set(0, 15)] }, 12)).toBeUndefined();
    expect(suggestNextWeight({ date: "d", sets: [set(80, 10)] }, undefined)).toBeUndefined();
    expect(suggestNextWeight(undefined, 10)).toBeUndefined();
  });

  it("uses a custom increment", () => {
    const last = { date: "2026-08-05", sets: [set(40, 12)] };
    expect(suggestNextWeight(last, 12, 5)).toBe(45);
  });
});

describe("training week streak", () => {
  it("returns 0 with no workouts", () => {
    expect(calculateTrainingWeekStreak([], "2026-08-08")).toBe(0);
  });

  it("counts consecutive weeks", () => {
    const logs = [
      workout({ id: "1", date: "2026-08-05" }), // this week (Sat 2026-08-08)
      workout({ id: "2", date: "2026-07-29" }), // previous week
      workout({ id: "3", date: "2026-07-22" }), // two weeks ago
    ];
    expect(calculateTrainingWeekStreak(logs, "2026-08-08")).toBe(3);
  });

  it("breaks on a missed week but tolerates the current week", () => {
    const logs = [
      workout({ id: "2", date: "2026-07-29" }), // previous week only
    ];
    // Current week (of 2026-08-08) has no workout yet — streak = 1, not 0.
    expect(calculateTrainingWeekStreak(logs, "2026-08-08")).toBe(1);
  });

  it("breaks fully after a gap week", () => {
    const logs = [
      workout({ id: "1", date: "2026-08-05" }),
      // gap: week of 2026-07-27 has nothing
      workout({ id: "3", date: "2026-07-15" }),
    ];
    expect(calculateTrainingWeekStreak(logs, "2026-08-08")).toBe(1);
  });
});
