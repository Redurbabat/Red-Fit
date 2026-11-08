import { describe, expect, it } from "vitest";
import { calculateEnergyGoal, type EnergyInput } from "./energyGoal";

const input: EnergyInput = {
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
  formulaVariant: "male",
  activityLevel: "sedentary",
  direction: "maintain",
};

describe("calculateEnergyGoal", () => {
  it("calculates Mifflin-St Jeor and activity-adjusted maintenance", () => {
    const result = calculateEnergyGoal(input);
    expect(result.method).toBe("mifflinStJeor");
    expect(result.basalKcal).toBe(1780);
    expect(result.maintenanceKcal).toBe(2136);
    expect(result.dailyKcal).toBe(2136);
    expect(result.dailyWaterMl).toBe(2000);
  });

  it("changes only the goal budget when the target changes", () => {
    expect(calculateEnergyGoal({ ...input, direction: "lose" }).dailyKcal).toBe(1786);
    expect(calculateEnergyGoal({ ...input, direction: "gain" }).dailyKcal).toBe(2386);
  });

  it("can use measured body-fat percentage and keeps macros nonnegative", () => {
    const result = calculateEnergyGoal({ ...input, bodyFatPercent: 20 });
    expect(result.method).toBe("katchMcArdle");
    expect(result.basalKcal).toBe(1752);
    expect(result.dailyCarbs).toBeGreaterThanOrEqual(0);
    expect(result.dailyProtein).toBeGreaterThan(0);
  });

  it("rejects impossible and non-finite measurements", () => {
    expect(() => calculateEnergyGoal({ ...input, ageYears: 12 })).toThrow(RangeError);
    expect(() => calculateEnergyGoal({ ...input, weightKg: NaN })).toThrow(RangeError);
    expect(() => calculateEnergyGoal({ ...input, bodyFatPercent: 99 })).toThrow(RangeError);
  });
});
