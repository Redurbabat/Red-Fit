import { beforeEach, describe, expect, it } from "vitest";
import type { MealLog } from "../../models/nutrition";
import { db } from "../storage/database";
import { settingsRepository } from "../storage/settingsRepository";
import { collectBackupData, createBackup, parseBackupJson } from "./backupService";

const date = "2026-11-08";
const now = "2026-11-08T04:10:00.000Z";
function food(id: string) {
  return {
    id, name: "Reis", category: "grain" as const,
    kcalPer100g: 350, proteinPer100g: 7, carbsPer100g: 75,
    fatPer100g: 1, source: "manual" as const,
    createdAt: now, updatedAt: now,
  };
}
function meal(id: string, foodId: string): MealLog {
  return {
    id, date, mealType: "lunch", createdAt: now, updatedAt: now,
    entries: [{ id: id + "-entry", foodId, foodName: "Reis",
      amountG: 100, kcal: 350, protein: 7, carbs: 75, fat: 1 }],
  };
}

describe("consistent and restorable standard backup export", () => {
  beforeEach(async () => {
    await db.transaction("rw", [
      db.foodItems, db.mealLogs, db.workoutLogs, db.settings, db.metadata,
    ], async () => {
      await Promise.all([
        db.foodItems.clear(), db.mealLogs.clear(), db.workoutLogs.clear(),
        db.settings.clear(), db.metadata.clear(),
      ]);
    });
  });

  it("includes settings and all data in a restorable document", async () => {
    await db.foodItems.put(food("rice"));
    await db.mealLogs.put(meal("meal-1", "rice"));
    const backup = await createBackup();
    const parsed = parseBackupJson(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    expect(backup.data.foodItems.map((x) => x.id)).toContain("rice");
    expect(backup.data.mealLogs[0].entries[0].foodId).toBe("rice");
    expect(backup.data.settings).toHaveLength(1);
  });

  it("uses one read transaction covering the settings and meal tables", async () => {
    const spy = vi.spyOn(db, "transaction");
    try {
      await collectBackupData();
      const calls = spy.mock.calls.filter((args) => args[0] === "r");
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const scope = calls[0][1] as unknown[];
      expect(scope).toContain(db.foodItems);
      expect(scope).toContain(db.mealLogs);
      expect(scope).toContain(db.workoutLogs);
      expect(scope).toContain(db.settings);
      expect(scope).toContain(db.recoveryLogs);
    } finally {
      spy.mockRestore();
    }
  });

  it("never exports a mix of old meals and new foods from a committed write", async () => {
    for (let iteration = 0; iteration < 3; iteration++) {
      await Promise.all([db.foodItems.clear(), db.mealLogs.clear()]);
      const read = collectBackupData();
      const update = db.transaction("rw", [db.foodItems, db.mealLogs], async () => {
        await db.foodItems.put(food("food-" + iteration));
        await db.mealLogs.put(meal("meal-" + iteration, "food-" + iteration));
      });
      const [backupData] = await Promise.all([read, update]);
      expect(backupData.foodItems.length).toBe(backupData.mealLogs.length);
    }
  });

  it("refuses a malformed local record rather than creating an unimportable file", async () => {
    // Old or corrupted IndexedDB rows may bypass runtime Zod validation.
    await db.foodItems.put({ ...food("bad"), kcalPer100g: -50 });
    await expect(createBackup()).rejects.toThrow(/cannot be restored/);
  });

  it("does not falsely stamp a backup timestamp during snapshot creation", async () => {
    const before = await settingsRepository.getMetadata();
    await createBackup();
    const after = await settingsRepository.getMetadata();
    expect(after.lastBackupAt).toEqual(before.lastBackupAt);
  });
});
