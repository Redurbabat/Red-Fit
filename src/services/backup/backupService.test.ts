import { beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  type BackupData,
  type RedFitBackup,
} from "../../models/backup";
import type { MealLog, MealType, WorkoutLog, WorkoutPlan } from "../../models";
import { DEFAULT_SETTINGS } from "../../models/settings";
import { db } from "../storage/database";
import { settingsRepository } from "../storage/settingsRepository";
import {
  buildPreview,
  findDangerousKey,
  importBackup,
  parseBackupJson,
} from "./backupService";

function minimalBackup() {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: "0.1.0",
    exportedAt: "2026-08-08T10:00:00.000Z",
    data: {
      exercises: [],
      workoutPlans: [],
      workoutLogs: [],
      foodItems: [
        {
          id: "f1",
          name: "Haferflocken",
          category: "grain",
          kcalPer100g: 370,
          proteinPer100g: 13,
          carbsPer100g: 60,
          fatPer100g: 7,
          source: "manual",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      mealLogs: [],
      nutritionGoals: [],
      waterLogs: [],
      bodyMeasurements: [],
      shoppingLists: [],
      mealPlans: [],
      recipes: [],
      userProfiles: [],
      settings: [],
    },
  };
}

describe("parseBackupJson", () => {
  it("accepts a valid backup", () => {
    const result = parseBackupJson(JSON.stringify(minimalBackup()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.foodItems).toHaveLength(1);
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseBackupJson("{nicht json");
    expect(result.ok).toBe(false);
  });

  it("rejects a foreign format", () => {
    const backup = { ...minimalBackup(), format: "andere-app" };
    const result = parseBackupJson(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects a newer schema version", () => {
    const backup = { ...minimalBackup(), schemaVersion: 999 };
    const result = parseBackupJson(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects __proto__ keys anywhere in the tree", () => {
    // Built via string so JSON.parse creates an own "__proto__" property.
    const json = JSON.stringify(minimalBackup()).replace(
      '"exercises":[]',
      '"exercises":[],"x":{"__proto__":{"polluted":true}}',
    );
    const result = parseBackupJson(json);
    expect(result.ok).toBe(false);
  });

  it("rejects structurally broken data (negative kcal)", () => {
    const backup = minimalBackup();
    backup.data.foodItems[0].kcalPer100g = -5;
    const result = parseBackupJson(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });
});

describe("findDangerousKey", () => {
  it("finds nested dangerous keys", () => {
    const obj = JSON.parse('{"a":{"b":{"constructor":{}}}}');
    expect(findDangerousKey(obj)).toContain("constructor");
  });

  it("passes clean objects", () => {
    expect(findDangerousKey({ a: [1, 2, { b: "c" }] })).toBeNull();
  });
});

describe("buildPreview", () => {
  it("counts entities", () => {
    const result = parseBackupJson(JSON.stringify(minimalBackup()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const preview = buildPreview(result.backup);
      expect(preview.foodItems).toBe(1);
      expect(preview.exercises).toBe(0);
    }
  });
});

// --- importBackup (real Dexie on fake-indexeddb) ---------------------------

function backupWith(data: Partial<BackupData>): RedFitBackup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: "0.1.0",
    exportedAt: "2026-08-08T10:00:00.000Z",
    data: {
      exercises: [],
      workoutPlans: [],
      workoutLogs: [],
      foodItems: [],
      mealLogs: [],
      nutritionGoals: [],
      waterLogs: [],
      bodyMeasurements: [],
      shoppingLists: [],
      mealPlans: [],
      recipes: [],
      userProfiles: [],
      settings: [],
      ...data,
    },
  };
}

function plan(id: string, active: boolean, updatedAt = "2026-01-01T00:00:00.000Z"): WorkoutPlan {
  return {
    id,
    name: `Plan ${id}`,
    goal: "buildMuscle",
    daysPerWeek: 3,
    level: "beginner",
    location: "gym",
    sessions: [],
    active,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
  };
}

function workoutLog(
  id: string,
  status: WorkoutLog["status"],
  startedAt: string,
): WorkoutLog {
  return {
    id,
    date: startedAt.slice(0, 10),
    name: "Push",
    startedAt,
    status,
    exerciseLogs: [],
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function mealLog(
  id: string,
  date: string,
  mealType: MealType,
  entryIds: string[],
  createdAt = "2026-08-08T08:00:00.000Z",
): MealLog {
  return {
    id,
    date,
    mealType,
    entries: entryIds.map((entryId) => ({
      id: entryId,
      foodId: "f1",
      foodName: "Quark",
      amountG: 100,
      kcal: 120,
      protein: 12,
      carbs: 4,
      fat: 0.2,
    })),
    createdAt,
    updatedAt: createdAt,
  };
}

describe("importBackup", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("restores settings from the backup when none exist locally", async () => {
    const result = await importBackup(
      backupWith({ settings: [{ ...DEFAULT_SETTINGS, theme: "light" }] }),
    );
    expect(result.added).toBe(1);
    expect((await settingsRepository.getSettings()).theme).toBe("light");
  });

  it("keeps local settings with keepExisting, replaces them with replaceWithBackup", async () => {
    await settingsRepository.saveSettings({ ...DEFAULT_SETTINGS, theme: "dark" });
    const backup = backupWith({ settings: [{ ...DEFAULT_SETTINGS, theme: "light" }] });

    const kept = await importBackup(backup, "keepExisting");
    expect(kept.skipped).toBe(1);
    expect((await settingsRepository.getSettings()).theme).toBe("dark");

    const replaced = await importBackup(backup, "replaceWithBackup");
    expect(replaced.replaced).toBe(1);
    expect((await settingsRepository.getSettings()).theme).toBe("light");
  });

  it("keeps at most one active plan and prefers the local one", async () => {
    await db.workoutPlans.put(plan("local", true));
    const result = await importBackup(
      backupWith({ workoutPlans: [plan("imported", true, "2026-08-01T00:00:00.000Z")] }),
    );
    expect(result.added).toBe(1);
    const plans = await db.workoutPlans.toArray();
    expect(plans).toHaveLength(2);
    const active = plans.filter((p) => p.active);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("local");
  });

  it("keeps a single imported active plan active", async () => {
    await importBackup(backupWith({ workoutPlans: [plan("imported", true)] }));
    const plans = await db.workoutPlans.toArray();
    expect(plans.filter((p) => p.active).map((p) => p.id)).toEqual(["imported"]);
  });

  it("cancels surplus active workouts, keeping the local one", async () => {
    await db.workoutLogs.put(workoutLog("local", "active", "2026-08-08T09:00:00.000Z"));
    await importBackup(
      backupWith({
        workoutLogs: [workoutLog("imported", "active", "2026-08-08T10:00:00.000Z")],
      }),
    );
    const local = await db.workoutLogs.get("local");
    const imported = await db.workoutLogs.get("imported");
    expect(local?.status).toBe("active");
    expect(imported?.status).toBe("cancelled");
  });

  it("merges duplicate meal logs per (date, mealType) into the local log", async () => {
    await db.mealLogs.put(mealLog("local", "2026-08-08", "breakfast", ["e1"]));
    await importBackup(
      backupWith({
        mealLogs: [
          mealLog("imported", "2026-08-08", "breakfast", ["e2"]),
          mealLog("other", "2026-08-08", "lunch", ["e3"]),
        ],
      }),
    );
    const breakfastLogs = await db.mealLogs
      .where("[date+mealType]")
      .equals(["2026-08-08", "breakfast"])
      .toArray();
    expect(breakfastLogs).toHaveLength(1);
    expect(breakfastLogs[0].id).toBe("local");
    expect(breakfastLogs[0].entries.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
    // Untouched slot stays as imported.
    expect(await db.mealLogs.get("other")).toBeDefined();
  });

  it("does not duplicate identical entries when the same log id is merged twice", async () => {
    const backup = backupWith({
      mealLogs: [mealLog("m1", "2026-08-08", "breakfast", ["e1"])],
    });
    await importBackup(backup);
    await importBackup(backup);
    const logs = await db.mealLogs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].entries).toHaveLength(1);
  });
});
