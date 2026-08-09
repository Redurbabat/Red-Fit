import { describe, expect, it } from "vitest";
import type { MealLog, NutritionGoal, WorkoutLog, WorkoutPlan } from "../../models";
import {
  lastLocalDates,
  proteinAdherenceInsight,
  trainingPaceInsight,
  weightTrendInsight,
} from "./insights";

const TODAY = "2026-08-08"; // Saturday

function goal(dailyProtein = 150): NutritionGoal {
  return {
    id: "g1",
    goalType: "buildMuscle",
    dailyKcal: 2400,
    dailyProtein,
    dailyCarbs: 260,
    dailyFat: 70,
    dailyWaterMl: 3000,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** One meal log whose single entry carries the given protein total. */
function mealLog(date: string, protein: number): MealLog {
  return {
    id: `m-${date}`,
    date,
    mealType: "lunch",
    entries: [
      {
        id: `e-${date}`,
        foodId: "f1",
        foodName: "Testfood",
        amountG: 100,
        kcal: 400,
        protein,
        carbs: 10,
        fat: 5,
      },
    ],
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function completedWorkout(date: string): WorkoutLog {
  return {
    id: `w-${date}`,
    date,
    name: "Push",
    startedAt: `${date}T18:00:00.000Z`,
    status: "completed",
    exerciseLogs: [],
    createdAt: `${date}T18:00:00.000Z`,
    updatedAt: `${date}T18:00:00.000Z`,
  };
}

function plan(daysPerWeek: number): WorkoutPlan {
  return {
    id: "p1",
    name: "PPL",
    goal: "buildMuscle",
    daysPerWeek,
    level: "intermediate",
    location: "gym",
    active: true,
    sessions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("lastLocalDates", () => {
  it("returns the window oldest-first, today included", () => {
    const dates = lastLocalDates(3, TODAY);
    expect(dates).toEqual(["2026-08-06", "2026-08-07", "2026-08-08"]);
  });
});

describe("proteinAdherenceInsight", () => {
  it("counts only tracked days and needs at least three", () => {
    const logs = [mealLog("2026-08-06", 160), mealLog("2026-08-07", 120)];
    expect(proteinAdherenceInsight(logs, goal(), TODAY)).toBeUndefined();

    const enough = [...logs, mealLog("2026-08-08", 155)];
    const insight = proteinAdherenceInsight(enough, goal(), TODAY);
    expect(insight).toEqual({ kind: "proteinAdherence", hitDays: 2, trackedDays: 3 });
  });

  it("ignores days outside the 7-day window and empty goals", () => {
    const logs = [
      mealLog("2026-07-20", 200),
      mealLog("2026-08-06", 160),
      mealLog("2026-08-07", 160),
      mealLog("2026-08-08", 160),
    ];
    const insight = proteinAdherenceInsight(logs, goal(), TODAY);
    expect(insight).toEqual({ kind: "proteinAdherence", hitDays: 3, trackedDays: 3 });
    expect(proteinAdherenceInsight(logs, undefined, TODAY)).toBeUndefined();
  });
});

describe("trainingPaceInsight", () => {
  it("compares this ISO week's completed sessions with the plan", () => {
    const logs = [
      completedWorkout("2026-08-03"), // Monday, same ISO week as Sat 2026-08-08
      completedWorkout("2026-08-05"),
      completedWorkout("2026-07-30"), // previous week — ignored
    ];
    expect(trainingPaceInsight(logs, plan(4), TODAY)).toEqual({
      kind: "trainingPace",
      done: 2,
      planned: 4,
    });
  });

  it("returns undefined without an active plan", () => {
    expect(trainingPaceInsight([completedWorkout("2026-08-05")], undefined, TODAY)).toBeUndefined();
  });
});

describe("weightTrendInsight", () => {
  it("needs at least three measurements spanning 14+ days", () => {
    const short = [
      { date: "2026-08-08", weightKg: 78.2 },
      { date: "2026-08-01", weightKg: 78.6 },
    ];
    expect(weightTrendInsight(short, TODAY)).toBeUndefined();

    const enough = [
      { date: "2026-08-08", weightKg: 78.2 },
      { date: "2026-08-01", weightKg: 78.6 },
      { date: "2026-07-22", weightKg: 79.0 },
    ];
    expect(weightTrendInsight(enough, TODAY)).toEqual({
      kind: "weightTrend",
      deltaKg: -0.8,
      days: 17,
    });
  });
});
