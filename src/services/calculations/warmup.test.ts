import { describe, expect, it } from "vitest";
import { calculateWarmupSets, isCompoundMovement } from "./warmup";

describe("calculateWarmupSets (openGym-inspired ramp)", () => {
  it("builds heavy barbell compound ramp", () => {
    expect(calculateWarmupSets({ workWeightKg: 100, compound: true, barWeightKg: 20 }))
      .toEqual([
        { weightKg: 20, reps: 10 },
        { weightKg: 40, reps: 5 },
        { weightKg: 60, reps: 3 },
        { weightKg: 80, reps: 1 },
      ]);
  });

  it("keeps a medium compound's bar and one ascending set", () => {
    expect(calculateWarmupSets({ workWeightKg: 50, compound: true, barWeightKg: 20 }))
      .toEqual([{ weightKg: 20, reps: 10 }, { weightKg: 35, reps: 3 }]);
  });

  it("drops collisions when the smallest loads are limited", () => {
    expect(calculateWarmupSets({ workWeightKg: 30, compound: true, barWeightKg: 20 }))
      .toEqual([{ weightKg: 20, reps: 10 }]);
  });

  it("never recommends the work set or higher", () => {
    const sets = calculateWarmupSets({ workWeightKg: 60, compound: true, barWeightKg: 20, incrementKg: 20 });
    expect(sets.every((set) => set.weightKg < 60)).toBe(true);
    expect(sets.map((set) => set.weightKg)).toEqual([20, 40]);
  });

  it("offers fewer isolation warmups and none for light weights", () => {
    expect(calculateWarmupSets({ workWeightKg: 60, compound: false }))
      .toEqual([{ weightKg: 30, reps: 10 }, { weightKg: 45, reps: 4 }]);
    expect(calculateWarmupSets({ workWeightKg: 8, compound: false })).toEqual([]);
  });

  it("does not calculate invalid values", () => {
    expect(calculateWarmupSets({ workWeightKg: NaN, compound: true })).toEqual([]);
    expect(calculateWarmupSets({ workWeightKg: 80, compound: true, incrementKg: 0 })).toEqual([]);
  });

  it("uses the exercise's movement taxonomy", () => {
    expect(isCompoundMovement({ animationType: "squat", muscleGroup: "legs" })).toBe(true);
    expect(isCompoundMovement({ animationType: "curl", muscleGroup: "biceps" })).toBe(false);
    expect(isCompoundMovement({ animationType: "pull", muscleGroup: "cardio" })).toBe(false);
  });
});
