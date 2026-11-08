import { beforeEach, describe, expect, it } from "vitest";
import type { MealFoodEntry, MealLog } from "../../models/nutrition";
import { db } from "./database";
import { mealRepository } from "./mealRepository";

const date = "2026-11-08";
const type = "lunch" as const;

function entry(id: string, kcal = 100): MealFoodEntry {
  return {
    id, foodId: "food-" + id, foodName: "Test " + id,
    amountG: 100, kcal, protein: 10, carbs: 10, fat: 2,
  };
}

function log(id: string, entries: MealFoodEntry[], notes?: string): MealLog {
  return {
    id, date, mealType: type, entries,
    notes, createdAt: "2026-11-08T12:00:00Z",
    updatedAt: "2026-11-08T12:00:00Z",
  };
}

describe("atomic meal-entry repository operations", () => {
  beforeEach(async () => {
    await db.mealLogs.clear();
  });

  it("serializes concurrent additions into a single meal container without lost entries", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) =>
      mealRepository.appendEntry(date, type, entry("item-" + i)),
    ));
    const logs = await mealRepository.listByDate(date);
    expect(logs).toHaveLength(1);
    expect(logs[0].entries).toHaveLength(12);
    expect(new Set(logs[0].entries.map((e) => e.id)).size).toBe(12);
  });

  it("preserves simultaneous recipe and manually logged food entries", async () => {
    const recipeEntry: MealFoodEntry = {
      ...entry("recipe"), foodId: "recipe-42", foodName: "Pasta (Rezept)",
      amountG: 275, kcal: 420,
    };
    await Promise.all([
      mealRepository.appendEntry(date, type, recipeEntry),
      mealRepository.appendEntry(date, type, entry("manual-rice", 365)),
    ]);
    const logs = await mealRepository.listByDate(date);
    expect(logs).toHaveLength(1);
    expect(logs[0].entries.map((e) => e.id).sort()).toEqual(["manual-rice", "recipe"]);
    expect(logs[0].entries.find((e) => e.id === "recipe")?.kcal).toBe(420);
  });

  it("merges legacy duplicate meal containers without dropping notes, entries or IDs", async () => {
    await db.mealLogs.bulkAdd([
      log("a", [entry("old-a")], "First note"),
      log("b", [entry("old-b")], "Second note"),
    ]);
    const merged = await mealRepository.appendEntry(date, type, entry("new"));
    expect(merged.id).toBe("a");
    expect(merged.entries.map((e) => e.id)).toEqual(["old-a", "old-b", "new"]);
    expect(merged.notes).toBe("First note\nSecond note");
    expect(await db.mealLogs.count()).toBe(1);
    expect(await db.mealLogs.get("b")).toBeUndefined();
  });

  it("re-appending the same entry ID is idempotent", async () => {
    const same = entry("same");
    await mealRepository.appendEntry(date, type, same);
    await mealRepository.appendEntry(date, type, same);
    const logs = await mealRepository.listByDate(date);
    expect(logs).toHaveLength(1);
    expect(logs[0].entries).toHaveLength(1);
  });

  it("keeps both edits if two different entries are updated concurrently", async () => {
    const initial = await mealRepository.appendEntry(date, type, entry("a"));
    await mealRepository.appendEntry(date, type, entry("b"));
    await Promise.all([
      mealRepository.updateEntryNutrition(initial.id, "a", {
        amountG: 150, kcal: 150, protein: 15, carbs: 15, fat: 3,
      }),
      mealRepository.updateEntryNutrition(initial.id, "b", {
        amountG: 200, kcal: 200, protein: 20, carbs: 20, fat: 4,
      }),
    ]);
    const actual = await db.mealLogs.get(initial.id);
    expect(actual?.entries).toHaveLength(2);
    expect(actual?.entries.find((e) => e.id === "a")).toMatchObject({
      amountG: 150, kcal: 150,
    });
    expect(actual?.entries.find((e) => e.id === "b")).toMatchObject({
      amountG: 200, kcal: 200,
    });
  });

  it("preserves cooked-weight snapshots during later edits", async () => {
    const cooked: MealFoodEntry = {
      ...entry("rice", 365),
      weighedAs: "cooked", weighedAmountG: 260,
      cookingYieldFactor: 2.6, estimateLevel: "low",
    };
    const log = await mealRepository.appendEntry(date, type, cooked);
    await mealRepository.updateEntryNutrition(log.id, cooked.id, {
      amountG: 150, weighedAmountG: 390,
      kcal: 547.5, protein: 15, carbs: 15, fat: 3,
    });
    const saved = (await db.mealLogs.get(log.id))!.entries[0];
    expect(saved).toMatchObject({
      amountG: 150, weighedAs: "cooked", weighedAmountG: 390,
      cookingYieldFactor: 2.6, estimateLevel: "low",
    });
  });

  it("rejects incomplete cooked metadata without modifying stored meals", async () => {
    const malformed: MealFoodEntry = {
      ...entry("broken"), weighedAs: "cooked", weighedAmountG: 260,
      // Missing cookingYieldFactor: runtime validation must catch it.
    };
    await expect(mealRepository.appendEntry(date, type, malformed)).rejects.toThrow();
    expect(await db.mealLogs.count()).toBe(0);
  });

  it("rejects stale updates without silently confirming them", async () => {
    const log = await mealRepository.appendEntry(date, type, entry("a"));
    await expect(mealRepository.updateEntryNutrition(log.id, "missing", {
      amountG: 200, kcal: 200, protein: 20, carbs: 20, fat: 4,
    })).rejects.toThrow(/no longer exists/);
    expect((await db.mealLogs.get(log.id))?.entries).toHaveLength(1);
  });

  it("deletes exactly one entry and removes the empty container", async () => {
    const log = await mealRepository.appendEntry(date, type, entry("a"));
    await mealRepository.appendEntry(date, type, entry("b"));
    await mealRepository.deleteEntry(log.id, "a");
    expect((await db.mealLogs.get(log.id))?.entries.map((e) => e.id)).toEqual(["b"]);
    await mealRepository.deleteEntry(log.id, "b");
    expect(await db.mealLogs.count()).toBe(0);
    await expect(mealRepository.deleteEntry(log.id, "b")).rejects.toThrow();
  });

  it("preserves the added entry when add and delete happen concurrently", async () => {
    const log = await mealRepository.appendEntry(date, type, entry("old"));
    await Promise.all([
      mealRepository.appendEntry(date, type, entry("new")),
      mealRepository.deleteEntry(log.id, "old"),
    ]);
    const logs = await mealRepository.listByDate(date);
    expect(logs).toHaveLength(1);
    expect(logs[0].entries.map((e) => e.id)).toEqual(["new"]);
  });
});
