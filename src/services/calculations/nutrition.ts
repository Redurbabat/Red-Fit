import type { FoodItem, MealFoodEntry, MealLog, NutritionGoal } from "../../models";
import { roundTo } from "../../utils/numbers";

export interface NutrientTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const EMPTY_TOTALS: NutrientTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/**
 * Values per 100 g are the only source of truth: factor = amountG / 100.
 * Internally precise; display rounding happens in the formatters.
 */
export function calculateFoodNutrition(
  food: Pick<FoodItem, "kcalPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g">,
  amountG: number,
): NutrientTotals {
  const factor = amountG / 100;
  return {
    kcal: food.kcalPer100g * factor,
    protein: food.proteinPer100g * factor,
    carbs: food.carbsPer100g * factor,
    fat: food.fatPer100g * factor,
  };
}

export function calculateMealTotals(entries: MealFoodEntry[]): NutrientTotals {
  return entries.reduce<NutrientTotals>(
    (sum, e) => ({
      kcal: sum.kcal + e.kcal,
      protein: sum.protein + e.protein,
      carbs: sum.carbs + e.carbs,
      fat: sum.fat + e.fat,
    }),
    { ...EMPTY_TOTALS },
  );
}

/** Daily totals are ALWAYS derived from meal logs — never stored redundantly. */
export function calculateDailyNutrition(mealLogs: MealLog[]): NutrientTotals {
  return mealLogs.reduce<NutrientTotals>(
    (sum, log) => {
      const meal = calculateMealTotals(log.entries);
      return {
        kcal: sum.kcal + meal.kcal,
        protein: sum.protein + meal.protein,
        carbs: sum.carbs + meal.carbs,
        fat: sum.fat + meal.fat,
      };
    },
    { ...EMPTY_TOTALS },
  );
}

export interface MacroProgress {
  /** May exceed 1 — the number is never cut off. */
  actualPercent: number;
  /** Clamped to [0, 1] for the bar width. */
  visualPercent: number;
}

export function calculateMacroProgress(current: number, target: number): MacroProgress {
  if (target <= 0) return { actualPercent: 0, visualPercent: 0 };
  const actual = current / target;
  return { actualPercent: actual, visualPercent: Math.min(Math.max(actual, 0), 1) };
}

/** Snapshot values for a MealFoodEntry (display-precision rounding, stored as such). */
export function buildEntryNutrition(food: FoodItem, amountG: number): NutrientTotals {
  const n = calculateFoodNutrition(food, amountG);
  return {
    kcal: roundTo(n.kcal, 1),
    protein: roundTo(n.protein, 2),
    carbs: roundTo(n.carbs, 2),
    fat: roundTo(n.fat, 2),
  };
}

/** Averages over the last `days` days — only days that actually have logs count. */
export function calculateAverages(
  mealLogs: MealLog[],
): { avgKcal: number; avgProtein: number; daysWithLogs: number } {
  const byDate = new Map<string, MealLog[]>();
  for (const log of mealLogs) {
    if (log.entries.length === 0) continue;
    const list = byDate.get(log.date) ?? [];
    list.push(log);
    byDate.set(log.date, list);
  }
  const days = byDate.size;
  if (days === 0) return { avgKcal: 0, avgProtein: 0, daysWithLogs: 0 };
  let kcal = 0;
  let protein = 0;
  for (const logs of byDate.values()) {
    const totals = calculateDailyNutrition(logs);
    kcal += totals.kcal;
    protein += totals.protein;
  }
  return { avgKcal: kcal / days, avgProtein: protein / days, daysWithLogs: days };
}

/** Fraction of goal per macro, for the four progress bars. */
export function goalProgress(totals: NutrientTotals, goal: NutritionGoal) {
  return {
    kcal: calculateMacroProgress(totals.kcal, goal.dailyKcal),
    protein: calculateMacroProgress(totals.protein, goal.dailyProtein),
    carbs: calculateMacroProgress(totals.carbs, goal.dailyCarbs),
    fat: calculateMacroProgress(totals.fat, goal.dailyFat),
  };
}
