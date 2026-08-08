import { describe, expect, it } from "vitest";
import type { SetLog, WorkoutLog } from "../../models";
import {
  calculateExerciseVolume,
  calculateSetVolume,
  calculateTrainingWeekStreak,
  calculateWorkoutDuration,
  calculateWorkoutVolume,
  findNewRecords,
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

  it("does not flag a repeat of an old weight", () => {
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
    expect(findNewRecords(fresh, [old])).toHaveLength(0);
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
