import { z } from "zod";
import { baseEntitySchema } from "./common";
import { FITNESS_GOALS, TRAINING_LOCATIONS } from "./workout";

export const NUTRITION_TRACKING_MODES = [
  "calories",
  "protein",
  "mealPlan",
  "simple",
] as const;
export type NutritionTrackingMode = (typeof NUTRITION_TRACKING_MODES)[number];

export const userProfileSchema = baseEntitySchema.extend({
  fitnessGoal: z.enum(FITNESS_GOALS),
  trainingLocation: z.enum(TRAINING_LOCATIONS),
  trainingDaysPerWeek: z.number().int().min(1).max(7),
  nutritionTrackingMode: z.enum(NUTRITION_TRACKING_MODES),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
