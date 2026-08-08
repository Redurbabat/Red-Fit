import type { NutritionGoal } from "../../models";
import { addDays, getLocalDateKey, nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { db } from "../storage/database";
import { settingsRepository } from "../storage/settingsRepository";
import { SEED_EXERCISES } from "./exerciseCatalog";
import { SEED_FOODS } from "./foods";
import { instantiateTemplate, PLAN_TEMPLATES } from "./planTemplates";

/**
 * Base library seeding — idempotent via stable seed ids (bulkPut).
 * Runs on every start; custom user data is never touched (§136).
 */
export async function seedBaseLibrary(): Promise<void> {
  await db.transaction("rw", [db.exercises, db.foodItems], async () => {
    // Only insert seeds that don't exist yet — user edits to seeded rows survive.
    const existingExerciseIds = new Set(await db.exercises.toCollection().primaryKeys());
    const newExercises = SEED_EXERCISES.filter((e) => !existingExerciseIds.has(e.id));
    if (newExercises.length > 0) await db.exercises.bulkAdd(newExercises);

    const existingFoodIds = new Set(await db.foodItems.toCollection().primaryKeys());
    const newFoods = SEED_FOODS.filter((f) => !existingFoodIds.has(f.id));
    if (newFoods.length > 0) await db.foodItems.bulkAdd(newFoods);
  });
}

export const DEFAULT_GOAL: Omit<NutritionGoal, "id" | "createdAt" | "updatedAt"> = {
  dailyKcal: 2600,
  dailyProtein: 160,
  dailyCarbs: 300,
  dailyFat: 80,
  dailyWaterMl: 3000,
  goalType: "buildMuscle",
};

/**
 * Demo data (plans, logs, measurements) — only on explicit user choice in
 * onboarding, and only once (`demoDataSeeded` flag).
 */
export async function seedDemoData(): Promise<void> {
  const metadata = await settingsRepository.getMetadata();
  if (metadata.demoDataSeeded) return;

  await seedBaseLibrary();
  const exercises = await db.exercises.toArray();
  const now = nowIso();
  const today = getLocalDateKey();

  // Demo plans: PPL active, the others available.
  const plans = PLAN_TEMPLATES.map((t, i) => instantiateTemplate(t, exercises, i === 0));
  await db.workoutPlans.bulkAdd(plans);

  // Nutrition goal.
  await db.nutritionGoals.add({
    ...DEFAULT_GOAL,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  });

  // A few past body weights so progress has a line to draw.
  const weights = [84.2, 83.8, 83.5, 83.1, 82.9];
  for (let i = 0; i < weights.length; i++) {
    await db.bodyMeasurements.add({
      id: newId(),
      date: addDays(today, -(weights.length - 1 - i) * 7),
      weightKg: weights[i],
      createdAt: now,
      updatedAt: now,
    });
  }

  // Two completed demo workouts (last week + this week) so history/streak show data.
  const activePlan = plans[0];
  const pushSession = activePlan.sessions[0];
  const demoWorkoutDates = [addDays(today, -8), addDays(today, -2)];
  for (const [w, date] of demoWorkoutDates.entries()) {
    const startedAt = new Date(`${date}T18:00:00`);
    const endedAt = new Date(startedAt.getTime() + 55 * 60 * 1000);
    await db.workoutLogs.add({
      id: newId(),
      date,
      planId: activePlan.id,
      sessionId: pushSession.id,
      name: pushSession.name,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds: 55 * 60,
      status: "completed",
      exerciseLogs: pushSession.exercises.slice(0, 4).map((pe, i) => {
        const exercise = exercises.find((e) => e.id === pe.exerciseId);
        const baseWeight = [60, 30, 22.5, 10][i] ?? 20;
        return {
          id: newId(),
          exerciseId: pe.exerciseId,
          name: exercise?.name ?? "Übung",
          setLogs: Array.from({ length: pe.sets }, (_, s) => ({
            id: newId(),
            setIndex: s,
            weightKg: baseWeight + w * 2.5,
            reps: pe.repsMax - s,
            completed: true,
            completedAt: new Date(startedAt.getTime() + (i * 8 + s * 2) * 60000).toISOString(),
          })),
        };
      }),
      createdAt: now,
      updatedAt: now,
    });
  }

  await settingsRepository.updateMetadata({ demoDataSeeded: true });
}
