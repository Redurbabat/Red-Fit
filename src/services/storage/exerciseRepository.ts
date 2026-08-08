import type { Exercise } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<Exercise>(db.exercises);

export const exerciseRepository = {
  ...base,

  /** Alphabetical list — the library's default ordering. */
  async listSorted(): Promise<Exercise[]> {
    const all = await db.exercises.toArray();
    return all.sort((a, b) => a.name.localeCompare(b.name, "de"));
  },
};
