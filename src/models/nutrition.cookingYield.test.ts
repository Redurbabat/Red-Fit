import { describe, expect, it } from "vitest";
import { mealFoodEntrySchema } from "./nutrition";

const legacy = {
  id: "entry-legacy", foodId: "food-rice", foodName: "Reis",
  amountG: 100, kcal: 365, protein: 7.5, carbs: 78, fat: 0.8,
};

describe("cooked food weight snapshot format", () => {
  it("loads old logs and backups without any weight-basis metadata", () => {
    expect(mealFoodEntrySchema.safeParse(legacy).success).toBe(true);
  });

  it("accepts the raw-equivalent snapshot with original cooked measured amount", () => {
    const cooked = {
      ...legacy, weighedAs: "cooked", weighedAmountG: 260,
      cookingYieldFactor: 2.6, estimateLevel: "low",
    };
    const result = mealFoodEntrySchema.safeParse(cooked);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountG).toBe(100);
      expect(result.data.weighedAmountG).toBe(260);
      expect(result.data.cookingYieldFactor).toBe(2.6);
    }
  });

  it("rejects invalid or absurd cooked conversion factors", () => {
    for (const factor of [0, -1, 11, NaN, Infinity]) {
      expect(mealFoodEntrySchema.safeParse({
        ...legacy, weighedAs: "cooked", weighedAmountG: 260,
        cookingYieldFactor: factor,
      }).success).toBe(false);
    }
  });

  it("rejects negative cooked weights", () => {
    expect(mealFoodEntrySchema.safeParse({
      ...legacy, weighedAs: "cooked", weighedAmountG: -5,
      cookingYieldFactor: 2.6,
    }).success).toBe(false);
  });
});
