import { beforeEach, describe, expect, it } from "vitest";
import type { WorkoutLog } from "../../models/workout";
import { db } from "../storage/database";
import {
  createOrResumeWorkout, startManualWorkout,
} from "./workoutService";

function proposedWorkout(id: string, status: WorkoutLog["status"] = "active"): WorkoutLog {
  const now = "2026-11-08T04:00:00.000Z";
  return {
    id,
    date: "2026-11-08",
    name: "Workout " + id,
    startedAt: now,
    status,
    saveRevision: 0,
    exerciseLogs: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe("atomic single-active workout creation", () => {
  beforeEach(async () => {
    await db.workoutLogs.clear();
  });

  it("creates one active workout from a first manual start", async () => {
    const workout = await startManualWorkout();
    expect(workout.status).toBe("active");
    expect(workout.saveRevision).toBe(0);
    expect(await db.workoutLogs.count()).toBe(1);
  });

  it("returns an existing active workout without modifying its revision or sets", async () => {
    const existing = proposedWorkout("already-active");
    existing.saveRevision = 4;
    existing.exerciseLogs = [{
      id: "exercise-1", exerciseId: "bench", name: "Bankdrücken",
      setLogs: [{ id: "set-1", setIndex: 0, weightKg: 80, reps: 10, completed: true }],
    }];
    await db.workoutLogs.add(existing);
    const resumed = await createOrResumeWorkout(proposedWorkout("candidate"));
    expect(resumed).toEqual(existing);
    expect(await db.workoutLogs.get(existing.id)).toEqual(existing);
    expect(await db.workoutLogs.get("candidate")).toBeUndefined();
    expect(await db.workoutLogs.count()).toBe(1);
  });

  it("concurrently starting 16 workouts creates exactly one active record", async () => {
    const attempts = Array.from({ length: 16 }, (_, i) =>
      createOrResumeWorkout(proposedWorkout("attempt-" + i)));
    const returned = await Promise.all(attempts);
    expect(new Set(returned.map((w) => w.id)).size).toBe(1);
    const saved = await db.workoutLogs.where("status").equals("active").toArray();
    expect(saved).toHaveLength(1);
    expect(await db.workoutLogs.count()).toBe(1);
    expect(returned.every((w) => w.id === saved[0].id)).toBe(true);
  });

  it("concurrent manual starts always resume a single session", async () => {
    const result = await Promise.all([
      startManualWorkout(), startManualWorkout(), startManualWorkout(),
    ]);
    expect(new Set(result.map((w) => w.id)).size).toBe(1);
    expect(await db.workoutLogs.count()).toBe(1);
  });

  it("completed or cancelled sessions do not prevent a new active session", async () => {
    await db.workoutLogs.bulkAdd([
      proposedWorkout("completed", "completed"),
      proposedWorkout("cancelled", "cancelled"),
    ]);
    const newActive = await createOrResumeWorkout(proposedWorkout("new-active"));
    expect(newActive.id).toBe("new-active");
    expect(await db.workoutLogs.count()).toBe(3);
    expect(await db.workoutLogs.where("status").equals("active").count()).toBe(1);
  });

  it("rejects invalid proposed status or a nonzero initial revision", async () => {
    await expect(createOrResumeWorkout(proposedWorkout("done", "completed")))
      .rejects.toThrow(/revision zero/);
    await expect(createOrResumeWorkout({
      ...proposedWorkout("stale"), saveRevision: 8,
    })).rejects.toThrow(/revision zero/);
    expect(await db.workoutLogs.count()).toBe(0);
  });

  it("does not overwrite a completed workout if a proposed ID collides", async () => {
    const completed = proposedWorkout("collision", "completed");
    await db.workoutLogs.add(completed);
    await expect(createOrResumeWorkout(proposedWorkout("collision"))).rejects.toThrow();
    expect(await db.workoutLogs.get(completed.id)).toEqual(completed);
    expect(await db.workoutLogs.count()).toBe(1);
  });
});
