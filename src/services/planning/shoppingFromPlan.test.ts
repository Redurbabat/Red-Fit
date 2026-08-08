import { describe, expect, it } from "vitest";
import type { FoodItem, MealPlan, MealPlanEntry, Recipe } from "../../models";
import { buildShoppingItems } from "./shoppingFromPlan";

const base = {
  createdAt: "2026-08-03T08:00:00.000Z",
  updatedAt: "2026-08-03T08:00:00.000Z",
};

function makeFood(id: string, name: string, category: FoodItem["category"] = "grain"): FoodItem {
  return {
    ...base,
    id,
    name,
    category,
    kcalPer100g: 100,
    proteinPer100g: 10,
    carbsPer100g: 20,
    fatPer100g: 2,
    source: "manual",
  };
}

function makePlan(entriesByDay: MealPlanEntry[][]): MealPlan {
  return {
    ...base,
    id: "plan-1",
    name: "Woche 2026-08-03",
    weekStart: "2026-08-03",
    days: entriesByDay.map((entries, i) => ({
      date: `2026-08-${String(3 + i).padStart(2, "0")}`,
      entries,
    })),
  };
}

function makeRecipe(id: string, name: string, ingredients: { foodId: string; amountG: number }[]): Recipe {
  return {
    ...base,
    id,
    name,
    servings: 2,
    ingredients: ingredients.map((ing, i) => ({ id: `ing-${id}-${i}`, ...ing })),
    instructions: [],
  };
}

describe("buildShoppingItems", () => {
  it("returns [] for an empty plan", () => {
    expect(buildShoppingItems(makePlan([[], [], [], [], [], [], []]), [])).toEqual([]);
  });

  it("sums grams of the same food across the week", () => {
    const rice = makeFood("f-rice", "Reis");
    const plan = makePlan([
      [{ id: "e1", mealType: "lunch", foodId: "f-rice", amountG: 200 }],
      [{ id: "e2", mealType: "dinner", foodId: "f-rice", amountG: 300 }],
      [{ id: "e3", mealType: "lunch", foodId: "f-rice", amountG: 250 }],
    ]);

    const items = buildShoppingItems(plan, [rice]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Reis",
      amount: 750,
      unit: "g",
      category: "grain",
      checked: false,
    });
    expect(items[0].id).toBeTruthy();
  });

  it("keeps different foods as separate items", () => {
    const rice = makeFood("f-rice", "Reis");
    const chicken = makeFood("f-chicken", "Hähnchenbrust", "meat");
    const plan = makePlan([
      [
        { id: "e1", mealType: "lunch", foodId: "f-rice", amountG: 200 },
        { id: "e2", mealType: "lunch", foodId: "f-chicken", amountG: 150 },
      ],
    ]);

    const items = buildShoppingItems(plan, [rice, chicken]);

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.name)).toEqual(["Reis", "Hähnchenbrust"]);
    expect(items[1]).toMatchObject({ amount: 150, unit: "g", category: "meat" });
  });

  it("dedupes label entries case-insensitively and without amount", () => {
    const plan = makePlan([
      [{ id: "e1", mealType: "snack", label: "Kaffee" }],
      [{ id: "e2", mealType: "snack", label: "kaffee" }],
      [{ id: "e3", mealType: "snack", label: "  Kaffee  " }],
      [{ id: "e4", mealType: "breakfast", label: "Brötchen" }],
    ]);

    const items = buildShoppingItems(plan, []);

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.name)).toEqual(["Kaffee", "Brötchen"]);
    expect(items[0].amount).toBeUndefined();
    expect(items[0].unit).toBeUndefined();
    expect(items.every((i) => i.checked === false)).toBe(true);
  });

  it("skips food entries whose food no longer exists", () => {
    const plan = makePlan([
      [{ id: "e1", mealType: "lunch", foodId: "f-gone", amountG: 100 }],
    ]);
    expect(buildShoppingItems(plan, [])).toEqual([]);
  });

  it("adds a food entry without amountG as an item without amount", () => {
    const rice = makeFood("f-rice", "Reis");
    const plan = makePlan([[{ id: "e1", mealType: "lunch", foodId: "f-rice" }]]);

    const items = buildShoppingItems(plan, [rice]);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Reis");
    expect(items[0].amount).toBeUndefined();
    expect(items[0].unit).toBeUndefined();
  });

  it("adds recipe ingredients once per plan entry and merges them with direct food entries", () => {
    const rice = makeFood("f-rice", "Reis");
    const beans = makeFood("f-beans", "Bohnen", "vegetable");
    const recipe = makeRecipe("r-1", "Reispfanne", [
      { foodId: "f-rice", amountG: 100 },
      { foodId: "f-beans", amountG: 50 },
    ]);
    const plan = makePlan([
      [{ id: "e1", mealType: "dinner", recipeId: "r-1" }],
      [{ id: "e2", mealType: "lunch", foodId: "f-rice", amountG: 200 }],
    ]);

    const items = buildShoppingItems(plan, [rice, beans], [recipe]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "Reis", amount: 300, unit: "g" });
    expect(items[1]).toMatchObject({ name: "Bohnen", amount: 50, unit: "g" });
  });

  it("skips recipe entries whose recipe no longer exists", () => {
    const plan = makePlan([[{ id: "e1", mealType: "dinner", recipeId: "r-gone" }]]);
    expect(buildShoppingItems(plan, [makeFood("f-rice", "Reis")], [])).toEqual([]);
  });
});
