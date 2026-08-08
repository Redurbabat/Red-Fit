import type { NutritionGoal } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<NutritionGoal>(db.nutritionGoals);

export const goalRepository = {
  ...base,

  /** The current goal is the most recently updated one. */
  async getCurrent(): Promise<NutritionGoal | undefined> {
    return db.nutritionGoals.orderBy("updatedAt").reverse().first();
  },
};
