/**
 * Optional, explainable energy-needs estimate (informed by the open nutrition
 * research reviewed alongside Dietry). Pure calculation, no external service.
 * Do not silently overwrite existing nutrition goals.
 */
export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  lightlyActive: 1.375,
  moderatelyActive: 1.55,
  veryActive: 1.725,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
export type EnergyGoalDirection = "lose" | "maintain" | "gain";
export type FormulaVariant = "male" | "female";

export interface EnergyInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  formulaVariant: FormulaVariant;
  activityLevel: ActivityLevel;
  direction: EnergyGoalDirection;
  /** Optional measured body fat; uses Katch-McArdle instead of Mifflin-St Jeor. */
  bodyFatPercent?: number;
}

export interface EnergyEstimate {
  method: "mifflinStJeor" | "katchMcArdle";
  basalKcal: number;
  maintenanceKcal: number;
  dailyKcal: number;
  dailyProtein: number;
  dailyFat: number;
  dailyCarbs: number;
  dailyWaterMl: number;
}

function requireRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(label + " is outside the supported range.");
  }
}

/**
 * Adult estimates only. Adjustments (-350 / +250 kcal) are suggestions,
 * not prescriptions; individual requirements vary considerably.
 */
export function calculateEnergyGoal(input: EnergyInput): EnergyEstimate {
  requireRange(input.weightKg, 20, 350, "weightKg");
  requireRange(input.heightCm, 100, 230, "heightCm");
  requireRange(input.ageYears, 18, 100, "ageYears");
  const activityFactor = ACTIVITY_FACTORS[input.activityLevel];
  if (!activityFactor) throw new RangeError("Unsupported activity level");
  if (input.direction !== "lose" && input.direction !== "maintain" && input.direction !== "gain") {
    throw new RangeError("Unsupported energy goal");
  }
  if (input.formulaVariant !== "male" && input.formulaVariant !== "female") {
    throw new RangeError("Unsupported formula variant");
  }

  let method: EnergyEstimate["method"] = "mifflinStJeor";
  let basal = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears +
    (input.formulaVariant === "male" ? 5 : -161);
  if (input.bodyFatPercent !== undefined) {
    requireRange(input.bodyFatPercent, 3, 70, "bodyFatPercent");
    basal = 370 + 21.6 * input.weightKg * (1 - input.bodyFatPercent / 100);
    method = "katchMcArdle";
  }

  const maintenance = basal * activityFactor;
  const adjustment = input.direction === "lose" ? -350 : input.direction === "gain" ? 250 : 0;
  const calories = Math.max(1200, Math.round(maintenance + adjustment));
  const proteinPerKg = input.direction === "lose" ? 1.8 : 1.6;
  // Keep a meaningful carbohydrate budget even for unusually low estimated needs.
  const protein = Math.round(Math.min(input.weightKg * proteinPerKg, calories * 0.35 / 4));
  const fat = Math.round(calories * 0.27 / 9);
  const carbs = Math.round(Math.max(0, (calories - protein * 4 - fat * 9) / 4));
  const water = Math.round(Math.min(3000, Math.max(1500, input.weightKg * 25)) / 250) * 250;

  return {
    method,
    basalKcal: Math.round(basal),
    maintenanceKcal: Math.round(maintenance),
    dailyKcal: calories,
    dailyProtein: protein,
    dailyFat: fat,
    dailyCarbs: carbs,
    dailyWaterMl: water,
  };
}
