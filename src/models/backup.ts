import { z } from "zod";
import { exerciseSchema } from "./exercise";
import {
  foodItemSchema,
  mealLogSchema,
  nutritionGoalSchema,
  waterLogSchema,
} from "./nutrition";
import {
  mealPlanSchema,
  recipeSchema,
  shoppingListSchema,
} from "./planning";
import { userProfileSchema } from "./profile";
import { bodyMeasurementSchema } from "./progress";
import { userSettingsSchema } from "./settings";
import { workoutLogSchema, workoutPlanSchema } from "./workout";

export const BACKUP_FORMAT = "red-fit-backup" as const;
export const BACKUP_SCHEMA_VERSION = 1;

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().min(1),
  appVersion: z.string(),
  exportedAt: z.string(),
  data: z.object({
    exercises: z.array(exerciseSchema),
    workoutPlans: z.array(workoutPlanSchema),
    workoutLogs: z.array(workoutLogSchema),
    foodItems: z.array(foodItemSchema),
    mealLogs: z.array(mealLogSchema),
    nutritionGoals: z.array(nutritionGoalSchema),
    waterLogs: z.array(waterLogSchema),
    bodyMeasurements: z.array(bodyMeasurementSchema),
    shoppingLists: z.array(shoppingListSchema),
    mealPlans: z.array(mealPlanSchema),
    recipes: z.array(recipeSchema),
    userProfiles: z.array(userProfileSchema),
    settings: z.array(userSettingsSchema),
  }),
});

export type RedFitBackup = z.infer<typeof backupSchema>;
export type BackupData = RedFitBackup["data"];
