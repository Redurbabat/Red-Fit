import { z } from "zod";
import {
  baseEntitySchema,
  isoDateTimeSchema,
  localDateKeySchema,
  nonNegativeNumber,
} from "./common";
import { DIFFICULTIES } from "./exercise";

export const TRAINING_LOCATIONS = ["gym", "home", "both"] as const;
export type TrainingLocation = (typeof TRAINING_LOCATIONS)[number];

export const FITNESS_GOALS = [
  "buildMuscle",
  "loseFat",
  "maintain",
  "strength",
  "endurance",
  "health",
] as const;
export type FitnessGoal = (typeof FITNESS_GOALS)[number];

export const workoutPlanExerciseSchema = z
  .object({
    id: z.string().min(1),
    exerciseId: z.string().min(1),
    sets: z.number().int().min(1),
    repsMin: z.number().int().min(0),
    repsMax: z.number().int().min(0),
    restSeconds: z.number().int().min(0),
    targetWeightKg: nonNegativeNumber.optional(),
    notes: z.string().optional(),
  })
  .refine((e) => e.repsMin <= e.repsMax, {
    message: "repsMin darf nicht größer als repsMax sein",
  });
export type WorkoutPlanExercise = z.infer<typeof workoutPlanExerciseSchema>;

export const workoutPlanSessionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  dayIndex: z.number().int().min(0).max(6).optional(), // 0 = Montag … 6 = Sonntag
  exercises: z.array(workoutPlanExerciseSchema),
});
export type WorkoutPlanSession = z.infer<typeof workoutPlanSessionSchema>;

export const workoutPlanSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1),
  goal: z.enum(FITNESS_GOALS),
  daysPerWeek: z.number().int().min(1).max(7),
  level: z.enum(DIFFICULTIES),
  location: z.enum(TRAINING_LOCATIONS),
  sessions: z.array(workoutPlanSessionSchema),
  active: z.boolean(),
});
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

export const WORKOUT_STATUSES = [
  "planned",
  "active",
  "completed",
  "cancelled",
] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const setLogSchema = z.object({
  id: z.string().min(1),
  setIndex: z.number().int().min(0),
  weightKg: nonNegativeNumber, // 0 = bodyweight
  reps: z.number().int().min(0),
  rpe: z.number().min(0).max(10).optional(),
  completed: z.boolean(),
  completedAt: isoDateTimeSchema.optional(),
  notes: z.string().optional(),
});
export type SetLog = z.infer<typeof setLogSchema>;

export const exerciseLogSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  name: z.string().min(1), // snapshot so history stays stable
  setLogs: z.array(setLogSchema),
  notes: z.string().optional(),
});
export type ExerciseLog = z.infer<typeof exerciseLogSchema>;

/**
 * An active workout IS a WorkoutLog with status "active" — persisted immediately
 * on start and autosaved on every change, so a reload can never lose it.
 * The rest timer is an absolute deadline (`restEndsAt`), never countdown state.
 */
export const workoutLogSchema = baseEntitySchema.extend({
  date: localDateKeySchema,
  planId: z.string().optional(),
  sessionId: z.string().optional(),
  name: z.string().trim().min(1),
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.optional(),
  durationSeconds: z.number().int().min(0).optional(),
  status: z.enum(WORKOUT_STATUSES),
  exerciseLogs: z.array(exerciseLogSchema),
  notes: z.string().optional(),
  restEndsAt: isoDateTimeSchema.optional(),
  currentExerciseIndex: z.number().int().min(0).optional(),
});
export type WorkoutLog = z.infer<typeof workoutLogSchema>;
