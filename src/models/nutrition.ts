import { z } from "zod";
import {
  baseEntitySchema,
  isoDateTimeSchema,
  localDateKeySchema,
  nonNegativeNumber,
} from "./common";
import { FITNESS_GOALS } from "./workout";

export const FOOD_CATEGORIES = [
  "breakfast",
  "meal",
  "snack",
  "drink",
  "dairy",
  "meat",
  "fish",
  "grain",
  "fruit",
  "vegetable",
  "supplement",
  "sweet",
  "other",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_SOURCES = [
  "manual",
  "scanned",
  "imported",
  "openFoodFacts",
] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

/**
 * Nutrient values are ALWAYS stored per 100 g — the only source of truth.
 * Serving sizes are display convenience, never stored as truth.
 * Barcode is a string so leading zeros survive.
 */
export const foodItemSchema = baseEntitySchema.extend({
  barcode: z.string().optional(),
  name: z.string().trim().min(1),
  brand: z.string().optional(),
  category: z.enum(FOOD_CATEGORIES),
  kcalPer100g: nonNegativeNumber,
  proteinPer100g: nonNegativeNumber,
  carbsPer100g: nonNegativeNumber,
  fatPer100g: nonNegativeNumber,
  sugarPer100g: nonNegativeNumber.optional(),
  fiberPer100g: nonNegativeNumber.optional(),
  saltPer100g: nonNegativeNumber.optional(),
  servingSizeG: nonNegativeNumber.optional(),
  imageUrl: z.string().optional(),
  source: z.enum(FOOD_SOURCES),
  favorite: z.boolean().optional(),
});
export type FoodItem = z.infer<typeof foodItemSchema>;

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "shake",
  "preWorkout",
  "postWorkout",
] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/**
 * Optional uncertainty flag for amounts entered without a scale.
 * Derived from the Dietry estimate-level model; legacy entries default to exact.
 */
export const ESTIMATE_LEVELS = ["none", "low", "medium", "high"] as const;
export type EstimateLevel = (typeof ESTIMATE_LEVELS)[number];

/** Snapshot principle: name + computed values are frozen so history stays stable. */
export const mealFoodEntrySchema = z.object({
  id: z.string().min(1),
  foodId: z.string().min(1),
  foodName: z.string().min(1),
  /** Nutrition basis (raw/dry equivalent grams) used for the frozen macros. */
  amountG: nonNegativeNumber,
  /** Optional cooked-weight input; legacy entries have neither field. */
  weighedAs: z.literal("cooked").optional(),
  weighedAmountG: nonNegativeNumber.optional(),
  /** Original cooked/raw factor snapshotted so later edits stay reproducible. */
  cookingYieldFactor: z.number().finite().min(0.1).max(10).optional(),
  estimateLevel: z.enum(ESTIMATE_LEVELS).optional(),
  kcal: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
});
export type MealFoodEntry = z.infer<typeof mealFoodEntrySchema>;

export const mealLogSchema = baseEntitySchema.extend({
  date: localDateKeySchema,
  mealType: z.enum(MEAL_TYPES),
  entries: z.array(mealFoodEntrySchema),
  notes: z.string().optional(),
});
export type MealLog = z.infer<typeof mealLogSchema>;

export const nutritionGoalSchema = baseEntitySchema.extend({
  dailyKcal: nonNegativeNumber,
  dailyProtein: nonNegativeNumber,
  dailyCarbs: nonNegativeNumber,
  dailyFat: nonNegativeNumber,
  dailyWaterMl: nonNegativeNumber,
  goalType: z.enum(FITNESS_GOALS),
  /**
   * Goal timeline: the goal applies from this local date onward. Goals
   * without validFrom count as "since forever" (backward compatible).
   */
  validFrom: localDateKeySchema.optional(),
});
export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;

export const waterLogSchema = baseEntitySchema.extend({
  date: localDateKeySchema,
  amountMl: nonNegativeNumber,
  loggedAt: isoDateTimeSchema,
});
export type WaterLog = z.infer<typeof waterLogSchema>;
