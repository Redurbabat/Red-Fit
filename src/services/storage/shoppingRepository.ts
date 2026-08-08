import type { ShoppingList } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<ShoppingList>(db.shoppingLists);

export const shoppingRepository = {
  ...base,

  /** Newest first; the first list is treated as the current one. */
  async listNewestFirst(): Promise<ShoppingList[]> {
    return db.shoppingLists.orderBy("updatedAt").reverse().toArray();
  },
};
