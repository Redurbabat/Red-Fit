import type { BodyMeasurement } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<BodyMeasurement>(db.bodyMeasurements);

export const bodyRepository = {
  ...base,

  /** Newest first — measurements are append-only, never overwritten. */
  async listNewestFirst(limit?: number): Promise<BodyMeasurement[]> {
    const all = await db.bodyMeasurements.toArray();
    all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return limit ? all.slice(0, limit) : all;
  },

  /** Latest measurement that has a weight value. */
  async latestWeight(): Promise<BodyMeasurement | undefined> {
    const all = await this.listNewestFirst();
    return all.find((m) => m.weightKg != null);
  },
};
