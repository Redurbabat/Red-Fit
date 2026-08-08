import { z } from "zod";
import { baseEntitySchema, localDateKeySchema, nonNegativeNumber } from "./common";
import { FOOD_CATEGORIES, MEAL_TYPES } from "./nutrition";

/** An entry references a food OR a recipe OR a free-text label. */
export const mealPlanEntrySchema = z.object({
  id: z.string().min(1),
  mealType: z.enum(MEAL_TYPES),
  foodId: z.string().optional(),
  recipeId: z.string().optional(),
  label: z.string().optional(),
  amountG: nonNegativeNumber.optional(),
  notes: z.string().optional(),
});
export type MealPlanEntry = z.infer<typeof mealPlanEntrySchema>;

export const mealPlanDaySchema = z.object({
  date: localDateKeySchema,
  entries: z.array(mealPlanEntrySchema),
});
export type MealPlanDay = z.infer<typeof mealPlanDaySchema>;

export const mealPlanSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1),
  weekStart: localDateKeySchema, // Monday
  days: z.array(mealPlanDaySchema),
});
export type MealPlan = z.infer<typeof mealPlanSchema>;

export const recipeIngredientSchema = z.object({
  id: z.string().min(1),
  foodId: z.string().min(1),
  amountG: nonNegativeNumber,
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const recipeSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1),
  servings: z.number().int().min(1),
  ingredients: z.array(recipeIngredientSchema),
  instructions: z.array(z.string()),
});
export type Recipe = z.infer<typeof recipeSchema>;

export const shoppingItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  amount: nonNegativeNumber.optional(),
  unit: z.string().optional(),
  category: z.enum(FOOD_CATEGORIES).optional(),
  checked: z.boolean(),
});
export type ShoppingItem = z.infer<typeof shoppingItemSchema>;

export const shoppingListSchema = baseEntitySchema.extend({
  title: z.string().trim().min(1),
  weekStart: localDateKeySchema.optional(),
  items: z.array(shoppingItemSchema),
});
export type ShoppingList = z.infer<typeof shoppingListSchema>;
