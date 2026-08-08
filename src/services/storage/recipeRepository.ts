import type { Recipe } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<Recipe>(db.recipes);

export const recipeRepository = {
  ...base,

  async listSorted(): Promise<Recipe[]> {
    const all = await db.recipes.toArray();
    return all.sort((a, b) => a.name.localeCompare(b.name, "de"));
  },
};
