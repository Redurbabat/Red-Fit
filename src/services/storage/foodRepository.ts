import type { FoodItem } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<FoodItem>(db.foodItems);

export const foodRepository = {
  ...base,

  async findByBarcode(barcode: string): Promise<FoodItem | undefined> {
    return db.foodItems.where("barcode").equals(barcode).first();
  },

  /**
   * Local search: case-insensitive substring over name, brand and barcode.
   * No backend — the whole food list lives in IndexedDB.
   */
  async search(query: string): Promise<FoodItem[]> {
    const q = query.trim().toLowerCase();
    const all = await db.foodItems.toArray();
    const filtered = q
      ? all.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            (f.brand ?? "").toLowerCase().includes(q) ||
            (f.barcode ?? "").includes(q),
        )
      : all;
    // Favorites first, then alphabetical.
    return filtered.sort((a, b) => {
      if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
      return a.name.localeCompare(b.name, "de");
    });
  },

  /** Most recently updated foods (used as "zuletzt verwendet" approximation). */
  async listRecent(limit = 8): Promise<FoodItem[]> {
    return db.foodItems.orderBy("updatedAt").reverse().limit(limit).toArray();
  },
};
