import type { LocalDateKey, NutritionGoal } from "../../models";
import { getLocalDateKey } from "../../utils/dates";
import { pickGoalForDate } from "../calculations/nutrition";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<NutritionGoal>(db.nutritionGoals);

export const goalRepository = {
  ...base,

  /** Goal timeline: the goal applying on a given local date. */
  async getForDate(date: LocalDateKey): Promise<NutritionGoal | undefined> {
    const all = await db.nutritionGoals.toArray();
    // Fallback to the newest goal when none applies yet (goal starts later).
    return pickGoalForDate(all, date) ?? all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  },

  /** The goal that applies today. */
  async getCurrent(): Promise<NutritionGoal | undefined> {
    return this.getForDate(getLocalDateKey());
  },
};
