import { describe, expect, it } from "vitest";
import type { MealLog } from "../../models";
import { calculateNutritionUncertainty } from "./nutritionUncertainty";

function log(entries: MealLog["entries"]): MealLog {
  return {
    id: "log",
    date: "2026-11-08",
    mealType: "lunch",
    entries,
    createdAt: "x",
    updatedAt: "x",
  };
}

function foodEntry(id: string, kcal: number, estimateLevel?: "none" | "low" | "medium" | "high") {
  return {
    id,
    foodId: id,
    foodName: "Test",
    amountG: 100,
    kcal,
    protein: 10,
    carbs: 10,
    fat: 5,
    estimateLevel,
  };
}

describe("estimated meal uncertainty", () => {
  it("keeps old exact entries backward compatible", () => {
    expect(calculateNutritionUncertainty([log([foodEntry("a", 500)])]))
      .toMatchObject({ uncertainEntries: 0, caloriesSigma: 0 });
  });
  it("uses Dietry-inspired coefficients for uncertain amounts", () => {
    const estimate = calculateNutritionUncertainty([log([
      foodEntry("a", 500, "low"), foodEntry("b", 500, "medium"),
    ])]);
    expect(estimate.uncertainEntries).toBe(2);
    expect(estimate.caloriesSigma).toBeCloseTo(Math.sqrt(50 ** 2 + 125 ** 2), 5);
  });
  it("combines entry variances rather than naively adding deviations", () => {
    const estimate = calculateNutritionUncertainty([log([
      foodEntry("a", 100, "high"), foodEntry("b", 100, "high"),
    ])]);
    expect(estimate.caloriesSigma).toBeCloseTo(Math.sqrt(2) * 45, 5);
  });
});
