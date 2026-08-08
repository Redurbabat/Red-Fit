import type { WorkoutPlan } from "../../models";
import { nowIso } from "../../utils/dates";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<WorkoutPlan>(db.workoutPlans);

export const workoutPlanRepository = {
  ...base,

  async getActive(): Promise<WorkoutPlan | undefined> {
    const all = await db.workoutPlans.toArray();
    return all.find((p) => p.active);
  },

  /** Exactly one plan is active: activating one deactivates the others. */
  async activate(id: string): Promise<void> {
    await db.transaction("rw", db.workoutPlans, async () => {
      const all = await db.workoutPlans.toArray();
      for (const plan of all) {
        const shouldBeActive = plan.id === id;
        if (plan.active !== shouldBeActive) {
          await db.workoutPlans.update(plan.id, {
            active: shouldBeActive,
            updatedAt: nowIso(),
          });
        }
      }
    });
  },
};
