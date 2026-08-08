import type { NutritionGoal } from "../../models";

/** Default nutrition goal (§20) — small module so pages don't pull the seed catalogs. */
export const DEFAULT_GOAL: Omit<NutritionGoal, "id" | "createdAt" | "updatedAt"> = {
  dailyKcal: 2600,
  dailyProtein: 160,
  dailyCarbs: 300,
  dailyFat: 80,
  dailyWaterMl: 3000,
  goalType: "buildMuscle",
};
