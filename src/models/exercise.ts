import { z } from "zod";
import { baseEntitySchema } from "./common";

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "legs",
  "glutes",
  "calves",
  "forearms",
  "fullBody",
  "cardio",
  "mobility",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  "none",
  "dumbbell",
  "barbell",
  "machine",
  "cable",
  "kettlebell",
  "resistanceBand",
  "bodyweight",
  "treadmill",
  "bike",
  "other",
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Movement category driving the animated exercise figure (SVG, procedural). */
export const ANIMATION_TYPES = [
  "push",
  "pull",
  "squat",
  "hinge",
  "press",
  "curl",
  "crunch",
  "plank",
  "raise",
  "lunges",
] as const;
export type AnimationType = (typeof ANIMATION_TYPES)[number];

export const exerciseSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)),
  equipment: z.enum(EQUIPMENT_TYPES),
  difficulty: z.enum(DIFFICULTIES),
  instructions: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  tips: z.array(z.string()),
  animationType: z.enum(ANIMATION_TYPES).optional(),
  animation3dUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  isCustom: z.boolean(),
});

export type Exercise = z.infer<typeof exerciseSchema>;
