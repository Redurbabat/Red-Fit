import type { LocalDateKey, MealLog, MealType } from "../../models";
import { mealFoodEntrySchema, type MealFoodEntry } from "../../models/nutrition";
import { nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { mergeMealSlotForAppend, removeEntryFromLog, replaceEntryInLog } from "./mealEntryOperations";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<MealLog>(db.mealLogs);

export const mealRepository = {
  ...base,

  async listByDate(date: LocalDateKey): Promise<MealLog[]> {
    return db.mealLogs.where("date").equals(date).toArray();
  },

  /** One MealLog per (date, mealType) can hold many entries — find it if it exists. */
  async findByDateAndType(
    date: LocalDateKey,
    mealType: MealType,
  ): Promise<MealLog | undefined> {
    return db.mealLogs.where("[date+mealType]").equals([date, mealType]).first();
  },

  /**
   * Add a single entry atomically. IndexedDB serializes read-write
   * transactions on this store, preventing two app tabs from replacing each
   * other's meal entries. Legacy duplicate containers are merged without
   * discarding their entries or notes.
   */
  async appendEntry(
    date: LocalDateKey,
    mealType: MealType,
    entry: MealFoodEntry,
  ): Promise<MealLog> {
    const checked = mealFoodEntrySchema.parse(entry);
    return db.transaction("rw", db.mealLogs, async () => {
      const matches = await db.mealLogs
        .where("[date+mealType]").equals([date, mealType]).toArray();
      const now = nowIso();
      if (matches.length === 0) {
        const log: MealLog = {
          id: newId(), date, mealType, entries: [checked],
          createdAt: now, updatedAt: now,
        };
        await db.mealLogs.add(log);
        return log;
      }
      const { keeper, duplicateIds } = mergeMealSlotForAppend(matches, checked);
      const updated = { ...keeper, updatedAt: now };
      await db.mealLogs.put(updated);
      for (const duplicateId of duplicateIds) {
        await db.mealLogs.delete(duplicateId as never);
      }
      return updated;
    });
  },

  /**
   * Update one entry against the latest stored log. Never replace a full
   * entries array captured by an outdated React component.
   */
  async updateEntryNutrition(
    logId: string,
    entryId: string,
    changes: Pick<MealFoodEntry, "amountG" | "kcal" | "protein" | "carbs" | "fat"> &
      Partial<Pick<MealFoodEntry, "weighedAmountG">>,
  ): Promise<MealLog> {
    return db.transaction("rw", db.mealLogs, async () => {
      const current = await db.mealLogs.get(logId as never);
      if (!current) throw new Error("Meal log no longer exists");
      const previous = current.entries.find((e) => e.id === entryId);
      if (!previous) throw new Error("Meal entry no longer exists");
      const entry = mealFoodEntrySchema.parse({ ...previous, ...changes });
      const updated = {
        ...replaceEntryInLog(current, entryId, entry),
        updatedAt: nowIso(),
      };
      await db.mealLogs.put(updated);
      return updated;
    });
  },

  /** Remove exactly one entry atomically; delete its container if empty. */
  async deleteEntry(logId: string, entryId: string): Promise<void> {
    return db.transaction("rw", db.mealLogs, async () => {
      const current = await db.mealLogs.get(logId as never);
      if (!current) throw new Error("Meal log no longer exists");
      const remaining = removeEntryFromLog(current, entryId);
      if (remaining === null) {
        await db.mealLogs.delete(logId as never);
      } else {
        await db.mealLogs.put({ ...remaining, updatedAt: nowIso() });
      }
    });
  },

  async listBetween(from: LocalDateKey, to: LocalDateKey): Promise<MealLog[]> {
    return db.mealLogs.where("date").between(from, to, true, true).toArray();
  },
};
