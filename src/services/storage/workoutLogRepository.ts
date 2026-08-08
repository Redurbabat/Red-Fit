import type { LocalDateKey, WorkoutLog } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<WorkoutLog>(db.workoutLogs);

export const workoutLogRepository = {
  ...base,

  async listByDate(date: LocalDateKey): Promise<WorkoutLog[]> {
    return db.workoutLogs.where("date").equals(date).toArray();
  },

  /** The one active workout, if any — checked on app start for the resume banner. */
  async getActive(): Promise<WorkoutLog | undefined> {
    return db.workoutLogs.where("status").equals("active").first();
  },

  /** Completed workouts, newest first. */
  async listCompleted(limit?: number): Promise<WorkoutLog[]> {
    const completed = await db.workoutLogs
      .where("status")
      .equals("completed")
      .toArray();
    completed.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return limit ? completed.slice(0, limit) : completed;
  },
};
