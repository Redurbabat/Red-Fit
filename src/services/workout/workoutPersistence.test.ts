import { beforeEach, describe, expect, it } from "vitest";
import type { WorkoutLog } from "../../models/workout";
import { db } from "../storage/database";
import { saveWorkout } from "./workoutService";

function activeWorkout(): WorkoutLog {
  const now = "2026-11-08T12:00:00.000Z";
  return {
    id: "workout-lifecycle-test",
    date: "2026-11-08",
    name: "Snapshot safety",
    startedAt: now,
    status: "active",
    exerciseLogs: [],
    currentExerciseIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe("persistent workout lifecycle integrity", () => {
  beforeEach(async () => {
    await db.workoutLogs.clear();
  });

  it("persists an active session and finalizes it", async () => {
    const active = activeWorkout();
    await saveWorkout(active);
    const completed = await saveWorkout({
      ...active,
      status: "completed",
      endedAt: "2026-11-08T13:00:00.000Z",
      durationSeconds: 3600,
    });
    expect(completed.status).toBe("completed");
    expect((await db.workoutLogs.get(active.id))?.status).toBe("completed");
  });

  it("rejects stale active snapshots after completion without altering finished sets", async () => {
    const active = activeWorkout();
    await saveWorkout(active);
    const completed = await saveWorkout({
      ...active,
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
    await saveWorkout(active);
    await saveWorkout({
      ...active, status: "cancelled", endedAt: "2026-11-08T12:03:00.000Z",
    });
    await expect(saveWorkout(active)).rejects.toThrow(/already finalized/);
    expect((await db.workoutLogs.get(active.id))?.status).toBe("cancelled");
  });

  it("does not flip one terminal status into another", async () => {
    const active = activeWorkout();
    await saveWorkout(active);
    const completed: WorkoutLog = {
      ...active, status: "completed", endedAt: "2026-11-08T12:30:00.000Z",
    };
    await saveWorkout(completed);
    await expect(saveWorkout({ ...completed, status: "cancelled" }))
      .rejects.toThrow(/already finalized/);
  });

  it("allows same-status post-completion updates such as notes", async () => {
    const completed: WorkoutLog = {
      ...activeWorkout(),
      status: "completed",
      endedAt: "2026-11-08T13:00:00.000Z",
    };
    await saveWorkout(completed);
    const edited = await saveWorkout({ ...completed, name: "Renamed session" });
    expect(edited.name).toBe("Renamed session");
    expect((await db.workoutLogs.get(completed.id))?.name).toBe("Renamed session");
  });
});
