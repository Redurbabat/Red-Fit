import type {
  Difficulty,
  EquipmentType,
  MuscleGroup,
} from "../models/exercise";
import type { FoodCategory, MealType } from "../models/nutrition";
import type { NutritionTrackingMode } from "../models/profile";
import type { FitnessGoal, TrainingLocation, WorkoutStatus } from "../models/workout";

/** Code enums stay English — the UI always speaks German via these mappers. */

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  biceps: "Bizeps",
  triceps: "Trizeps",
  abs: "Bauch",
  legs: "Beine",
  glutes: "Gesäß",
  calves: "Waden",
  forearms: "Unterarme",
  fullBody: "Ganzkörper",
  cardio: "Cardio",
  mobility: "Mobilität",
};

export const equipmentLabels: Record<EquipmentType, string> = {
  none: "Ohne Gerät",
  dumbbell: "Kurzhantel",
  barbell: "Langhantel",
  machine: "Maschine",
  cable: "Kabelzug",
  kettlebell: "Kettlebell",
  resistanceBand: "Widerstandsband",
  bodyweight: "Körpergewicht",
  treadmill: "Laufband",
  bike: "Fahrrad",
  other: "Sonstiges",
};

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: "Anfänger",
  intermediate: "Fortgeschritten",
  advanced: "Profi",
};

export const fitnessGoalLabels: Record<FitnessGoal, string> = {
  buildMuscle: "Muskelaufbau",
  loseFat: "Fett verlieren",
  maintain: "Gewicht halten",
  strength: "Kraft steigern",
  endurance: "Ausdauer verbessern",
  health: "Gesundheit verbessern",
};

export const trainingLocationLabels: Record<TrainingLocation, string> = {
  gym: "Fitnessstudio",
  home: "Zuhause",
  both: "Beides",
};

export const workoutStatusLabels: Record<WorkoutStatus, string> = {
  planned: "Geplant",
  active: "Aktiv",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
  snack: "Snack",
  shake: "Shake",
  preWorkout: "Pre-Workout",
  postWorkout: "Post-Workout",
};

export const foodCategoryLabels: Record<FoodCategory, string> = {
  breakfast: "Frühstück",
  meal: "Gericht",
  snack: "Snack",
  drink: "Getränk",
  dairy: "Milchprodukt",
  meat: "Fleisch",
  fish: "Fisch",
  grain: "Getreide",
  fruit: "Obst",
  vegetable: "Gemüse",
  supplement: "Supplement",
  sweet: "Süßes",
  other: "Sonstiges",
};

export const nutritionTrackingModeLabels: Record<NutritionTrackingMode, string> = {
  calories: "Kalorien zählen",
  protein: "Protein verfolgen",
  mealPlan: "Essensplan nutzen",
  simple: "Nur grob tracken",
};

/** "+ Guter Schlaf" / "- Energie niedrig" — readiness factors as short German phrases. */
export function describeReadinessFactor(factor: {
  key: string;
  delta: number;
  value: number;
}): string | null {
  if (factor.delta === 0) return null;
  const positive = factor.delta > 0;
  switch (factor.key) {
    case "sleep":
      return positive ? "Guter Schlaf" : "Wenig Schlaf";
    case "energy":
      return positive ? "Viel Energie" : "Energie niedrig";
    case "stress":
      return positive ? "Entspannt" : "Hoher Stress";
    case "soreness":
      return positive ? "Kein Muskelkater" : "Muskelkater";
    case "restDays":
      return factor.value === 1 ? "1 Tag Erholung" : `${factor.value} Tage Erholung`;
    case "trainedToday":
      return "Heute schon trainiert";
    default:
      return null;
  }
}
