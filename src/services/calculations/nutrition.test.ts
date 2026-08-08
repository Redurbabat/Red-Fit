import { describe, expect, it } from "vitest";
import type { MealLog } from "../../models";
import {
  calculateDailyNutrition,
  calculateFoodNutrition,
  calculateMacroProgress,
  calculateMealTotals,
} from "./nutrition";

// Reference case from the spec: oats, 370 kcal / 13 g P / 60 g C / 7 g F per 100 g.
const oats = {
  kcalPer100g: 370,
  proteinPer100g: 13,
  carbsPer100g: 60,
  fatPer100g: 7,
};

describe("calculateFoodNutrition", () => {
  it("computes the 80 g reference case exactly", () => {
    const n = calculateFoodNutrition(oats, 80);
    expect(n.kcal).toBeCloseTo(296, 5);
    expect(n.protein).toBeCloseTo(10.4, 5);
    expect(n.carbs).toBeCloseTo(48, 5);
    expect(n.fat).toBeCloseTo(5.6, 5);
  });

  it("returns zeros for 0 g", () => {
    const n = calculateFoodNutrition(oats, 0);
    expect(n).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("scales above 100 g", () => {
    const n = calculateFoodNutrition(oats, 150);
    expect(n.kcal).toBeCloseTo(555, 5);
  });
});

describe("calculateMealTotals", () => {
  it("sums entries", () => {
    const totals = calculateMealTotals([
      { id: "1", foodId: "f", foodName: "A", amountG: 80, kcal: 296, protein: 10.4, carbs: 48, fat: 5.6 },
      { id: "2", foodId: "g", foodName: "B", amountG: 100, kcal: 100, protein: 10, carbs: 2, fat: 4 },
    ]);
    expect(totals.kcal).toBeCloseTo(396, 5);
    expect(totals.protein).toBeCloseTo(20.4, 5);
  });

  it("returns zeros for no entries", () => {
    expect(calculateMealTotals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe("calculateDailyNutrition", () => {
  it("sums across meal logs", () => {
    const logs: MealLog[] = [
      {
        id: "m1",
        date: "2026-08-08",
        mealType: "breakfast",
        entries: [
          { id: "1", foodId: "f", foodName: "A", amountG: 80, kcal: 296, protein: 10.4, carbs: 48, fat: 5.6 },
        ],
        createdAt: "x",
        updatedAt: "x",
      },
      {
        id: "m2",
        date: "2026-08-08",
        mealType: "lunch",
        entries: [
          { id: "2", foodId: "g", foodName: "B", amountG: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.2 },
        ],
        createdAt: "x",
        updatedAt: "x",
      },
    ];
    const totals = calculateDailyNutrition(logs);
    expect(totals.kcal).toBeCloseTo(626, 5);
    expect(totals.protein).toBeCloseTo(72.4, 5);
  });
});

describe("calculateMacroProgress", () => {
  it("caps the visual bar at 100 % but keeps the real number", () => {
    const p = calculateMacroProgress(2840, 2600);
    expect(p.actualPercent).toBeGreaterThan(1);
    expect(p.visualPercent).toBe(1);
  });

  it("never divides by zero", () => {
    const p = calculateMacroProgress(100, 0);
    expect(p.actualPercent).toBe(0);
    expect(p.visualPercent).toBe(0);
  });
});
