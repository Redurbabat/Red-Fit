import type { LocalDateKey, MealLog, MealType } from "../../models";
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

  async listBetween(from: LocalDateKey, to: LocalDateKey): Promise<MealLog[]> {
    return db.mealLogs.where("date").between(from, to, true, true).toArray();
  },
};
