import type { LocalDateKey, MealPlan } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<MealPlan>(db.mealPlans);

export const mealPlanRepository = {
  ...base,

  async findByWeekStart(weekStart: LocalDateKey): Promise<MealPlan | undefined> {
    return db.mealPlans.where("weekStart").equals(weekStart).first();
  },
};
