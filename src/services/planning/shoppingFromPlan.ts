import type { FoodItem, MealPlan, Recipe, ShoppingItem } from "../../models";
import { newId } from "../../utils/ids";
import { roundTo } from "../../utils/numbers";

/**
 * Builds unchecked shopping items from a weekly meal plan (§67).
 *
 * Aggregation rules (MVP — deliberately simple):
 * - Food entries (foodId + amountG) are grouped per food and their grams are
 *   summed: rice 200 g + 300 g + 250 g → one item "Reis, 750 g".
 * - Recipe entries add the recipe's FULL ingredient amounts once per plan
 *   entry — no serving scaling in the MVP, because a planned recipe usually
 *   means "cook this recipe once". Ingredients merge into the same per-food
 *   groups as direct food entries.
 * - Label-only entries (free text, no foodId/recipeId) become one item per
 *   distinct label, deduplicated case-insensitively and without an amount.
 * - Entries whose food or recipe no longer exists are skipped silently.
 */
export function buildShoppingItems(
  plan: MealPlan,
  foods: FoodItem[],
  recipes: Recipe[] = [],
): ShoppingItem[] {
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  /** foodId → summed grams; Map keeps first-seen order for stable output. */
  const gramsByFood = new Map<string, number>();
  /** lowercased label → original spelling (first one wins). */
  const labelByKey = new Map<string, string>();

  const addFoodGrams = (foodId: string, amountG: number) => {
    if (!foodById.has(foodId)) return; // food was deleted — nothing to buy
    gramsByFood.set(foodId, (gramsByFood.get(foodId) ?? 0) + amountG);
  };

  for (const day of plan.days) {
    for (const entry of day.entries) {
      if (entry.foodId) {
        addFoodGrams(entry.foodId, entry.amountG ?? 0);
      } else if (entry.recipeId) {
        const recipe = recipeById.get(entry.recipeId);
        if (!recipe) continue;
        for (const ingredient of recipe.ingredients) {
          addFoodGrams(ingredient.foodId, ingredient.amountG);
        }
      } else if (entry.label && entry.label.trim() !== "") {
        const label = entry.label.trim();
        const key = label.toLowerCase();
        if (!labelByKey.has(key)) labelByKey.set(key, label);
      }
    }
  }

  const items: ShoppingItem[] = [];

  for (const [foodId, grams] of gramsByFood) {
    const food = foodById.get(foodId);
    if (!food) continue;
    const item: ShoppingItem = {
      id: newId(),
      name: food.name,
      category: food.category,
      checked: false,
    };
    if (grams > 0) {
      item.amount = roundTo(grams, 1);
      item.unit = "g";
    }
    items.push(item);
  }

  for (const label of labelByKey.values()) {
    items.push({ id: newId(), name: label, checked: false });
  }

  return items;
}
