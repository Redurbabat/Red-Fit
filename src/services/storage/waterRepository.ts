import type { LocalDateKey, WaterLog } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<WaterLog>(db.waterLogs);

export const waterRepository = {
  ...base,

  async listByDate(date: LocalDateKey): Promise<WaterLog[]> {
    return db.waterLogs.where("date").equals(date).toArray();
  },

  /** Daily total = sum of that day's entries (never stored redundantly). */
  async totalForDate(date: LocalDateKey): Promise<number> {
    const logs = await this.listByDate(date);
    return logs.reduce((sum, l) => sum + l.amountMl, 0);
  },
};
