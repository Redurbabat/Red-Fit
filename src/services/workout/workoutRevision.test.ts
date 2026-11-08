import { describe, expect, it } from "vitest";
import { workoutLogSchema } from "../../models/workout";
import {
  nextWorkoutRevision,
  WorkoutRevisionConflictError,
} from "./workoutRevision";

describe("workout optimistic concurrency", () => {
  it("accepts the previous workout data format without a revision", () => {
    const legacy = {
      id: "legacy", date: "2026-11-08",
      name: "Old workout", startedAt: "2026-11-08T12:00:00Z",
      status: "active", exerciseLogs: [], createdAt: "2026-11-08T12:00:00Z",
      updatedAt: "2026-11-08T12:00:00Z",
    };
    expect(workoutLogSchema.safeParse(legacy).success).toBe(true);
    expect(workoutLogSchema.safeParse({ ...legacy, saveRevision: 0 }).success).toBe(true);
    expect(workoutLogSchema.safeParse({ ...legacy, saveRevision: 42 }).success).toBe(true);
  });

  it("rejects invalid revision values during backup/model validation", () => {
    const original = {
      id: "invalid", date: "2026-11-08",
      name: "Session", startedAt: "2026-11-08T12:00:00Z",
      status: "active", exerciseLogs: [], createdAt: "2026-11-08T12:00:00Z",
      updatedAt: "2026-11-08T12:00:00Z",
    };
    for (const saveRevision of [-1, 1.5, NaN, Infinity]) {
      expect(workoutLogSchema.safeParse({ ...original, saveRevision }).success).toBe(false);
    }
  });

  it("accepts only the expected revision and increments it", () => {
    expect(nextWorkoutRevision(undefined, undefined)).toBe(1);
    expect(nextWorkoutRevision(1, 1)).toBe(2);
    expect(() => nextWorkoutRevision(0, 1)).toThrow(WorkoutRevisionConflictError);
  });

  it("detects stale active snapshots even without a status transition", () => {
    const secondTabExpected = 5;
    const storedRevision = nextWorkoutRevision(5, 5);
    expect(() => nextWorkoutRevision(secondTabExpected, storedRevision))
      .toThrow(WorkoutRevisionConflictError);
  });

  it("does not silently overflow or accept fractional revisions", () => {
    expect(() => nextWorkoutRevision(Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
    expect(() => nextWorkoutRevision(2.5, 2)).toThrow(RangeError);
  });
});
