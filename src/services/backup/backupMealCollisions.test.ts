import { beforeEach, describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION, type RedFitBackup } from "../../models/backup";
import type { MealFoodEntry, MealLog } from "../../models/nutrition";
import { db } from "../storage/database";
import { importBackup } from "./backupService";

const at = "2026-11-08T12:00:00.000Z";
const day = "2026-11-08";
const localId = "local-lunch";
const sourceId = "backup-lunch";

function entry(id: string, foodId: string, kcal: number): MealFoodEntry {
  return { id, foodId, foodName: foodId, amountG: 100, kcal,
    protein: 8, carbs: 12, fat: 2 };
}
function meal(id: string, entries: MealFoodEntry[], notes?: string, mealType: MealLog["mealType"] = "lunch"): MealLog {
  return { id, entries, date: day, mealType, notes, createdAt: at, updatedAt: at };
}
function backup(mealLogs: MealLog[]): RedFitBackup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: "0.1.0",
    exportedAt: at,
    data: {
      exercises: [], workoutPlans: [], workoutLogs: [],
      foodItems: [], mealLogs, nutritionGoals: [], waterLogs: [],
      bodyMeasurements: [], shoppingLists: [], mealPlans: [], recipes: [],
      userProfiles: [], settings: [],
    },
  };
}
async function slot(): Promise<MealLog[]> {
  return db.mealLogs.where("[date+mealType]").equals([day, "lunch"]).toArray();
}

describe("backup meal entry ID collisions", () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });

  it("retains two different nutrient snapshots with the same entry ID", async () => {
    await db.mealLogs.add(meal(localId, [entry("shared", "rice", 350)]));
    await importBackup(backup([meal(sourceId, [entry("shared", "pasta", 410)])]));
    const logs = await slot();
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe(localId);
    expect(logs[0].entries.map((e) => e.kcal)).toEqual([350, 410]);
    expect(new Set(logs[0].entries.map((e) => e.id)).size).toBe(2);
  });

  it("does not duplicate byte-equivalent entries with the same ID", async () => {
    const same = entry("shared", "rice", 350);
    await db.mealLogs.add(meal(localId, [same]));
    await importBackup(backup([meal(sourceId, [same])]));
    expect((await slot())[0].entries).toHaveLength(1);
  });

  it("remains idempotent after importing the same backup twice", async () => {
    await db.mealLogs.add(meal(localId, [entry("shared", "rice", 350)], "Local note"));
    const sameBackup = backup([meal(sourceId, [
      entry("shared", "pasta", 410),
    ], "Backup note")]);
    await importBackup(sameBackup);
    const first = (await slot())[0];
    await importBackup(sameBackup);
    const repeated = (await slot())[0];
    expect(repeated.entries).toEqual(first.entries);
    expect(repeated.notes).toBe("Local note\nBackup note");
    expect(repeated.notes).toBe(first.notes);
  });

  it("preserves cooked-weight metadata when a duplicate ID is recovered", async () => {
    const raw = entry("same", "rice", 350);
    const cooked: MealFoodEntry = {
      ...entry("same", "rice", 350),
      weighedAs: "cooked", weighedAmountG: 260,
      cookingYieldFactor: 2.6, estimateLevel: "low",
    };
    await db.mealLogs.add(meal(localId, [raw]));
    await importBackup(backup([meal(sourceId, [cooked])]));
    const recovered = (await slot())[0].entries;
    expect(recovered).toHaveLength(2);
    expect(recovered.find((e) => e.weighedAs === "cooked")).toMatchObject({
      weighedAmountG: 260, cookingYieldFactor: 2.6,
    });
  });

  it("keeps multiline notes stable across repeated imports", async () => {
    await db.mealLogs.add(meal(localId, [entry("x", "rice", 350)], "One\nTwo"));
    const b = backup([meal(sourceId, [entry("y", "pasta", 400)], "Three\nFour")]);
    await importBackup(b);
    await importBackup(b);
    expect((await slot())[0].notes).toBe("One\nTwo\nThree\nFour");
  });

  it("does not merge separate meal slots", async () => {
    await db.mealLogs.add(meal(localId, [entry("same", "rice", 350)]));
    await importBackup(backup([
      meal("dinner", [entry("same", "pasta", 400)], undefined, "dinner"),
    ]));
    expect(await slot()).toHaveLength(1);
    expect(await db.mealLogs.count()).toBe(2);
  });
});
