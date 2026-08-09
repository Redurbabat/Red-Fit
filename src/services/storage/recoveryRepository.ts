import type { LocalDateKey, RecoveryLog } from "../../models";
import { nowIso } from "../../utils/dates";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<RecoveryLog>(db.recoveryLogs);

export const recoveryRepository = {
  ...base,

  async getByDate(date: LocalDateKey): Promise<RecoveryLog | undefined> {
    return db.recoveryLogs.where("date").equals(date).first();
  },

  /** One check-in per day: re-submitting updates the existing entry. */
  async upsertForDate(
    date: LocalDateKey,
    values: Omit<RecoveryLog, "id" | "date" | "createdAt" | "updatedAt">,
  ): Promise<RecoveryLog> {
    return db.transaction("rw", db.recoveryLogs, async () => {
      const existing = await db.recoveryLogs.where("date").equals(date).first();
      if (existing) {
        const updated = { ...existing, ...values, updatedAt: nowIso() };
        await db.recoveryLogs.put(updated);
        return updated;
      }
      return base.create({ ...values, date });
    });
  },

  async listNewestFirst(limit?: number): Promise<RecoveryLog[]> {
    const all = await db.recoveryLogs.toArray();
    all.sort((a, b) => b.date.localeCompare(a.date));
    return limit ? all.slice(0, limit) : all;
  },
};
