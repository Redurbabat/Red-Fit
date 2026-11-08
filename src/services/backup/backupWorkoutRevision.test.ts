import { beforeEach, describe, expect, it } from "vitest";
import type { WorkoutLog } from "../../models/workout";
import {
  BACKUP_FORMAT, BACKUP_SCHEMA_VERSION, type RedFitBackup,
} from "../../models/backup";
import { db } from "../storage/database";
import { saveWorkout } from "../workout/workoutService";
import { WorkoutRevisionConflictError } from "../workout/workoutRevision";
import { importBackup } from "./backupService";

function log(
  id: string, revision?: number,
  status: WorkoutLog["status"] = "completed",
): WorkoutLog {
  const now = "2026-11-08T10:00:00.000Z";
  return {
    id, name: id, date: "2026-11-08", status,
    startedAt: now,
    ...(status === "completed" ? { endedAt: now } : {}),
    ...(revision === undefined ? {} : { saveRevision: revision }),
    exerciseLogs: [], createdAt: now, updatedAt: now,
  };
}

function backup(workoutLogs: WorkoutLog[]): RedFitBackup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: "0.1.0",
    exportedAt: "2026-11-08T10:00:00.000Z",
    data: {
      exercises: [], workoutPlans: [], workoutLogs,
      foodItems: [], mealLogs: [], nutritionGoals: [], waterLogs: [],
      bodyMeasurements: [], shoppingLists: [], mealPlans: [], recipes: [],
      userProfiles: [], settings: [],
    },
  };
}

describe("restoring workouts invalidates stale local revision tokens", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("keeps existing workouts completely unchanged with the default strategy", async () => {
    const local = log("same", 9);
    await db.workoutLogs.put(local);
    const result = await importBackup(backup([{ ...log("same", 9), name: "backup version" }]));
    expect(result.skipped).toBe(1);
    expect(await db.workoutLogs.get("same")).toEqual(local);
  });

  it("replacing a same-ID workout increments past the locally newer revision", async () => {
    await db.workoutLogs.put(log("same", 12));
    const result = await importBackup(
      backup([{ ...log("same", 3), name: "restored" }]),
      "replaceWithBackup",
    );
    const saved = await db.workoutLogs.get("same");
    expect(result.replaced).toBe(1);
    expect(saved?.name).toBe("restored");
    expect(saved?.saveRevision).toBe(13);
  });

  it("replacing a same-ID workout also increments past a higher backup revision", async () => {
    await db.workoutLogs.put(log("same", 2));
    await importBackup(backup([log("same", 40)]), "replaceWithBackup");
    expect((await db.workoutLogs.get("same"))?.saveRevision).toBe(41);
  });

  it("legacy logs without a revision are upgraded on replacement", async () => {
    await db.workoutLogs.put(log("legacy"));
    await importBackup(backup([log("legacy")]), "replaceWithBackup");
    expect((await db.workoutLogs.get("legacy"))?.saveRevision).toBe(1);
  });

  it("new IDs preserve the imported revision without an unnecessary increment", async () => {
    await importBackup(backup([log("fresh", 22)]), "replaceWithBackup");
    expect((await db.workoutLogs.get("fresh"))?.saveRevision).toBe(22);
  });

  it("cancelling an imported duplicate active workout advances its revision", async () => {
    await db.workoutLogs.put(log("local", 7, "active"));
    const incoming = log("new-import", 4, "active");
    await importBackup(backup([incoming]));
    expect((await db.workoutLogs.get("local"))?.saveRevision).toBe(7);
    expect((await db.workoutLogs.get("local"))?.status).toBe("active");
    expect((await db.workoutLogs.get("new-import"))?.status).toBe("cancelled");
    expect((await db.workoutLogs.get("new-import"))?.saveRevision).toBe(5);
  });

  it("a stale opened workout cannot save after a same-ID backup replacement", async () => {
    const stale = log("same", 5);
    await db.workoutLogs.put(stale);
    await importBackup(backup([{ ...log("same", 5), name: "restored" }]), "replaceWithBackup");
    await expect(saveWorkout(stale)).rejects.toBeInstanceOf(WorkoutRevisionConflictError);
    expect((await db.workoutLogs.get("same"))?.name).toBe("restored");
  });

  it("rolls back every imported record if a revision is exhausted", async () => {
    const local = log("collision", Number.MAX_SAFE_INTEGER);
    await db.workoutLogs.put(local);
    await expect(importBackup(backup([
      log("new-before-error", 0), log("collision", 0),
    ]), "replaceWithBackup")).rejects.toThrow(/exhausted/);
    expect(await db.workoutLogs.get("collision")).toEqual(local);
    expect(await db.workoutLogs.get("new-before-error")).toBeUndefined();
  });
});
