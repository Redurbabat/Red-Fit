import { beforeEach, describe, expect, it } from "vitest";
import type { WorkoutLog } from "../../models/workout";
import { db } from "../storage/database";
import { saveWorkout } from "./workoutService";
import { WorkoutRevisionConflictError } from "./workoutRevision";

function activeWorkout(): WorkoutLog {
  const now = "2026-11-08T12:00:00.000Z";
  return {
    id: "workout-lifecycle-test",
    date: "2026-11-08",
    name: "Snapshot safety",
    startedAt: now,
    status: "active",
    saveRevision: 0,
    exerciseLogs: [],
    currentExerciseIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe("persistent workout lifecycle integrity", () => {
  beforeEach(async () => {
    await db.workoutLogs.clear();
    await db.workoutLogs.put(activeWorkout());
  });

  it("persists an active session and finalizes it", async () => {
    const active = activeWorkout();
    const fresh = await saveWorkout(active);
    const completed = await saveWorkout({
      ...fresh,
      status: "completed",
      endedAt: "2026-11-08T13:00:00.000Z",
      durationSeconds: 3600,
    });
    expect(completed.status).toBe("completed");
    expect((await db.workoutLogs.get(active.id))?.status).toBe("completed");
  });

  it("rejects stale active snapshots after completion without altering finished sets", async () => {
    const active = activeWorkout();
    const fresh = await saveWorkout(active);
    const completed = await saveWorkout({
      ...fresh,
      status: "completed",
      exerciseLogs: [],
      endedAt: "2026-11-08T13:00:00.000Z",
      durationSeconds: 3600,
    });
    await expect(saveWorkout(active)).rejects.toThrow(/already finalized/);
    const stored = await db.workoutLogs.get(active.id);
    expect(stored?.status).toBe("completed");
    expect(stored?.endedAt).toBe(completed.endedAt);
  });

  it("rejects stale active snapshots after cancellation", async () => {
    const active = activeWorkout();
    const fresh = await saveWorkout(active);
    await saveWorkout({
      ...fresh, status: "cancelled", endedAt: "2026-11-08T12:03:00.000Z",
    });
    await expect(saveWorkout(active)).rejects.toThrow(/already finalized/);
    expect((await db.workoutLogs.get(active.id))?.status).toBe("cancelled");
  });

  it("does not flip one terminal status into another", async () => {
    const active = activeWorkout();
    const fresh = await saveWorkout(active);
    const completed: WorkoutLog = {
      ...fresh, status: "completed", endedAt: "2026-11-08T12:30:00.000Z",
    };
    await saveWorkout(completed);
    await expect(saveWorkout({ ...completed, status: "cancelled" }))
      .rejects.toThrow(/already finalized/);
  });

  it("rejects a stale ACTIVE tab even when both snapshots have the same status", async () => {
    const first = activeWorkout();
    const tabA = await saveWorkout({ ...first, name: "Updated in tab A" });
    await expect(saveWorkout({ ...first, name: "Stale tab B" }))
      .rejects.toBeInstanceOf(WorkoutRevisionConflictError);
    const stored = await db.workoutLogs.get(first.id);
    expect(stored?.name).toBe("Updated in tab A");
    expect(stored?.saveRevision).toBe(tabA.saveRevision);
  });

  it("only one of two simultaneous writes at the same revision succeeds", async () => {
    const same = activeWorkout();
    const results = await Promise.allSettled([
      saveWorkout({ ...same, name: "Tab A" }),
      saveWorkout({ ...same, name: "Tab B" }),
    ]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((item) => item.status === "rejected")).toHaveLength(1);
    const stored = await db.workoutLogs.get(same.id);
    expect(["Tab A", "Tab B"]).toContain(stored?.name);
    expect(stored?.saveRevision).toBe(1);
  });

  it("upgrades legacy workouts without a revision on their first safe write", async () => {
    const legacy = { ...activeWorkout(), saveRevision: undefined };
    await db.workoutLogs.put(legacy);
    const saved = await saveWorkout(legacy);
    expect(saved.saveRevision).toBe(1);
    await expect(saveWorkout(legacy)).rejects.toBeInstanceOf(WorkoutRevisionConflictError);
  });

  it("cannot silently recreate a workout deleted by another tab", async () => {
    const stale = activeWorkout();
    await db.workoutLogs.delete(stale.id);
    await expect(saveWorkout(stale)).rejects.toThrow(/no longer exists/);
    expect(await db.workoutLogs.get(stale.id)).toBeUndefined();
  });

  it("allows same-status post-completion updates such as notes", async () => {
    const completed: WorkoutLog = {
      ...activeWorkout(),
      status: "completed",
      endedAt: "2026-11-08T13:00:00.000Z",
    };
    const persisted = await saveWorkout(completed);
    const edited = await saveWorkout({ ...persisted, name: "Renamed session" });
    expect(edited.name).toBe("Renamed session");
    expect((await db.workoutLogs.get(completed.id))?.name).toBe("Renamed session");
  });
});
