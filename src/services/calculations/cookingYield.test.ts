import { describe, expect, it } from "vitest";
import type { MealFoodEntry } from "../../models";
import {
  combinedAmountUncertainty, displayedMealWeight, getCookingYield,
  rawEquivalentGrams,
} from "./cookingYield";
import { buildEntryNutrition } from "./nutrition";

describe("raw/cooked food weights (Dietry-inspired)", () => {
  it("converts cooked rice against raw food label without changing per-100g truth", () => {
    const info = getCookingYield({ name: "Basmati Reis (trocken)" });
    expect(info).toMatchObject({ factor: 2.6, kind: "absorption", uncertainty: "low" });
    const grams = rawEquivalentGrams(260, info!.factor);
    expect(grams).toBe(100);
    const label = { kcalPer100g: 365, proteinPer100g: 7.5, carbsPer100g: 78, fatPer100g: 0.8 };
    expect(buildEntryNutrition(label as Parameters<typeof buildEntryNutrition>[0], grams))
      .toMatchObject({ kcal: 365, protein: 7.5, carbs: 78 });
  });

  it("converts 220g cooked pasta to 100g dry and raises low uncertainty", () => {
    expect(getCookingYield({ name: "Spaghetti" })?.factor).toBe(2.2);
    expect(rawEquivalentGrams(220, 2.2)).toBeCloseTo(100);
    expect(combinedAmountUncertainty("none", "low")).toBe("low");
    expect(combinedAmountUncertainty("high", "low")).toBe("high");
  });

  it("treats poultry as less accurate because fat and water are lost", () => {
    const info = getCookingYield({ name: "Hähnchenbrust roh" });
    expect(info).toMatchObject({ factor: 0.73, kind: "fatLoss", uncertainty: "medium" });
    expect(rawEquivalentGrams(73, info!.factor)).toBeCloseTo(100);
    expect(combinedAmountUncertainty("low", info!.uncertainty)).toBe("medium");
  });

  it("does not apply a cooking yield to foods already labelled as cooked", () => {
    for (const name of [
      "Reis (gekocht)", "Nudeln gekocht", "Baked Potato", "Salmon grilled",
      "Rice boiled", "Lachs gebraten", "Kartoffel gegrillt",
    ]) {
      expect(getCookingYield({ name })).toBeNull();
    }
  });

  it("conservatively excludes composites and avoids rice substring false positives", () => {
    for (const name of [
      "Milchreis", "Pasta Sauce", "Reissalat", "Reiswaffeln",
      "Curry mit Reis", "Preiselbeeren", "Reis aus der Dose",
      "Instant Nudeln", "Fertiggericht mit Reis", "Hummus",
      "Chicken Nuggets", "Beef Burger", "Fischstäbchen",
    ]) {
      expect(getCookingYield({ name })).toBeNull();
    }
  });

  it("covers major ingredient groups and can fall back to no conversion", () => {
    expect(getCookingYield({ name: "Quinoa" })?.factor).toBe(2.6);
    expect(getCookingYield({ name: "Champignons roh" })?.factor).toBe(0.6);
    expect(getCookingYield({ name: "Spinat" })?.factor).toBe(0.4);
    expect(getCookingYield({ name: "Kartoffeln" })?.factor).toBe(0.82);
    expect(getCookingYield({ name: "Wasser" })).toBeNull();
  });

  it("refuses invalid weights and conversion factors", () => {
    for (const amount of [0, -1, NaN, Infinity]) {
      expect(() => rawEquivalentGrams(amount, 2.6)).toThrow(RangeError);
    }
    for (const factor of [0, -1, NaN, Infinity, 11]) {
      expect(() => rawEquivalentGrams(100, factor)).toThrow(RangeError);
    }
    expect(() => rawEquivalentGrams(1e308, 0.1)).toThrow(RangeError);
  });

  it("keeps old raw entries backward-compatible and displays cooked weight when present", () => {
    const legacy = { id: "x", foodId: "food", foodName: "Reis",
      amountG: 100, kcal: 365, protein: 8, carbs: 78, fat: 1 } satisfies MealFoodEntry;
    expect(displayedMealWeight(legacy)).toBe(100);
    const cooked = { ...legacy, weighedAs: "cooked" as const,
      weighedAmountG: 260, cookingYieldFactor: 2.6 } satisfies MealFoodEntry;
    expect(displayedMealWeight(cooked)).toBe(260);
    expect(cooked.amountG).toBe(100);
  });
});
