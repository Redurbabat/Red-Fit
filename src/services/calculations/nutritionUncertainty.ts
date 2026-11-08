import type { EstimateLevel, MealLog } from "../../models";

/**
 * Dietry-inspired approximate uncertainty bands for estimated food amounts.
 *
 * These are heuristic coefficients, not calibrated statistical probabilities.
 * A meal entry marked "none" contributes no estimated amount uncertainty, but
 * ingredient labels themselves can still be inaccurate.
 */
export const AMOUNT_UNCERTAINTY_CV: Record<EstimateLevel, number> = {
  none: 0,
  low: 0.10,
  medium: 0.25,
  high: 0.45,
};

export interface NutritionUncertainty {
  uncertainEntries: number;
  caloriesSigma: number;
  proteinSigma: number;
  carbsSigma: number;
  fatSigma: number;
}

export function calculateNutritionUncertainty(logs: MealLog[]): NutritionUncertainty {
  let calorieVariance = 0;
  let proteinVariance = 0;
  let carbsVariance = 0;
  let fatVariance = 0;
  let count = 0;

  for (const entry of logs.flatMap((log) => log.entries)) {
    const cv = AMOUNT_UNCERTAINTY_CV[entry.estimateLevel ?? "none"];
    if (cv === 0) continue;
    count++;
    calorieVariance += (entry.kcal * cv) ** 2;
    proteinVariance += (entry.protein * cv) ** 2;
    carbsVariance += (entry.carbs * cv) ** 2;
    fatVariance += (entry.fat * cv) ** 2;
  }
  return {
    uncertainEntries: count,
    caloriesSigma: Math.sqrt(calorieVariance),
    proteinSigma: Math.sqrt(proteinVariance),
    carbsSigma: Math.sqrt(carbsVariance),
    fatSigma: Math.sqrt(fatVariance),
  };
}
