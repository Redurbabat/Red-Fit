import type { Difficulty, Exercise } from "../../models/exercise";
import type {
  FitnessGoal,
  TrainingLocation,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutPlanSession,
} from "../../models/workout";
import { nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";

/**
 * Copyable plan templates. Exercises are referenced by (German) name and
 * resolved against the exercise library at copy time, so templates stay
 * valid regardless of seed ids. Copying always creates new ids (§42).
 */
export interface PlanTemplateExercise {
  exerciseName: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
}

export interface PlanTemplateSession {
  name: string;
  dayIndex?: number;
  exercises: PlanTemplateExercise[];
}

export interface PlanTemplate {
  key: string;
  name: string;
  goal: FitnessGoal;
  daysPerWeek: number;
  level: Difficulty;
  location: TrainingLocation;
  sessions: PlanTemplateSession[];
}

const ex = (
  exerciseName: string,
  sets: number,
  repsMin: number,
  repsMax: number,
  restSeconds = 90,
): PlanTemplateExercise => ({ exerciseName, sets, repsMin, repsMax, restSeconds });

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: "ppl",
    name: "Push Pull Legs",
    goal: "buildMuscle",
    daysPerWeek: 3,
    level: "intermediate",
    location: "gym",
    sessions: [
      {
        name: "Push",
        dayIndex: 0,
        exercises: [
          ex("Bankdrücken", 4, 6, 10, 120),
          ex("Schulterdrücken", 3, 8, 12),
          ex("Schrägbankdrücken KH", 3, 8, 12),
          ex("Seitheben", 3, 12, 15, 60),
          ex("Trizepsdrücken am Kabel", 3, 10, 15, 60),
        ],
      },
      {
        name: "Pull",
        dayIndex: 2,
        exercises: [
          ex("Kreuzheben", 3, 5, 8, 180),
          ex("Latzug", 4, 8, 12),
          ex("Rudern am Kabel", 3, 8, 12),
          ex("Bizepscurls", 3, 10, 15, 60),
          ex("Face Pulls", 3, 12, 15, 60),
        ],
      },
      {
        name: "Legs",
        dayIndex: 4,
        exercises: [
          ex("Kniebeuge", 4, 6, 10, 180),
          ex("Beinpresse", 3, 10, 12, 120),
          ex("Beinbeuger", 3, 10, 15),
          ex("Wadenheben stehend", 4, 12, 20, 60),
          ex("Plank", 3, 30, 60, 60),
        ],
      },
    ],
  },
  {
    key: "fullbody-3",
    name: "Ganzkörper 3 Tage",
    goal: "buildMuscle",
    daysPerWeek: 3,
    level: "beginner",
    location: "gym",
    sessions: [
      {
        name: "Ganzkörper A",
        dayIndex: 0,
        exercises: [
          ex("Kniebeuge", 3, 8, 12, 120),
          ex("Bankdrücken", 3, 8, 12, 120),
          ex("Rudern am Kabel", 3, 8, 12),
          ex("Plank", 3, 30, 60, 60),
        ],
      },
      {
        name: "Ganzkörper B",
        dayIndex: 2,
        exercises: [
          ex("Kreuzheben", 3, 6, 10, 150),
          ex("Schulterdrücken", 3, 8, 12),
          ex("Latzug", 3, 8, 12),
          ex("Bizepscurls", 2, 10, 15, 60),
        ],
      },
      {
        name: "Ganzkörper C",
        dayIndex: 4,
        exercises: [
          ex("Beinpresse", 3, 10, 15, 120),
          ex("Schrägbankdrücken KH", 3, 8, 12),
          ex("Rudern am Kabel", 3, 8, 12),
          ex("Seitheben", 3, 12, 15, 60),
        ],
      },
    ],
  },
  {
    key: "upper-lower",
    name: "Oberkörper / Unterkörper",
    goal: "strength",
    daysPerWeek: 4,
    level: "intermediate",
    location: "gym",
    sessions: [
      {
        name: "Oberkörper 1",
        dayIndex: 0,
        exercises: [
          ex("Bankdrücken", 4, 5, 8, 150),
          ex("Rudern am Kabel", 4, 6, 10, 120),
          ex("Schulterdrücken", 3, 8, 12),
          ex("Bizepscurls", 3, 10, 12, 60),
        ],
      },
      {
        name: "Unterkörper 1",
        dayIndex: 1,
        exercises: [
          ex("Kniebeuge", 4, 5, 8, 180),
          ex("Beinbeuger", 3, 8, 12),
          ex("Wadenheben stehend", 4, 12, 15, 60),
          ex("Plank", 3, 30, 60, 60),
        ],
      },
      {
        name: "Oberkörper 2",
        dayIndex: 3,
        exercises: [
          ex("Schrägbankdrücken KH", 4, 8, 12, 120),
          ex("Latzug", 4, 8, 12),
          ex("Seitheben", 3, 12, 15, 60),
          ex("Trizepsdrücken am Kabel", 3, 10, 15, 60),
        ],
      },
      {
        name: "Unterkörper 2",
        dayIndex: 4,
        exercises: [
          ex("Kreuzheben", 4, 5, 8, 180),
          ex("Beinpresse", 3, 10, 15, 120),
          ex("Ausfallschritte", 3, 10, 12),
          ex("Crunches", 3, 15, 25, 45),
        ],
      },
    ],
  },
  {
    key: "home-beginner",
    name: "Zuhause ohne Geräte",
    goal: "health",
    daysPerWeek: 3,
    level: "beginner",
    location: "home",
    sessions: [
      {
        name: "Zuhause A",
        dayIndex: 0,
        exercises: [
          ex("Liegestütze", 3, 8, 15, 90),
          ex("Kniebeuge ohne Gewicht", 3, 12, 20, 60),
          ex("Plank", 3, 20, 45, 60),
          ex("Ausfallschritte", 3, 10, 14, 60),
        ],
      },
      {
        name: "Zuhause B",
        dayIndex: 2,
        exercises: [
          ex("Liegestütze", 3, 8, 15, 90),
          ex("Glute Bridge", 3, 12, 20, 60),
          ex("Crunches", 3, 12, 20, 45),
          ex("Superman", 3, 10, 15, 60),
        ],
      },
    ],
  },
];

/**
 * Build a real WorkoutPlan from a template. Exercise names are resolved
 * against the library (case-insensitive); unknown names are skipped so a
 * template never breaks the app.
 */
export function instantiateTemplate(
  template: PlanTemplate,
  exercises: Exercise[],
  active: boolean,
): WorkoutPlan {
  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));
  const findExercise = (name: string) => {
    const exact = byName.get(name.toLowerCase());
    if (exact) return exact;
    // Fallback: substring match ("Kniebeuge" → "Kniebeuge (Squat)").
    const lower = name.toLowerCase();
    return exercises.find(
      (e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()),
    );
  };

  const sessions: WorkoutPlanSession[] = template.sessions.map((session) => {
    const sessionExercises: WorkoutPlanExercise[] = [];
    for (const te of session.exercises) {
      const exercise = findExercise(te.exerciseName);
      if (!exercise) continue;
      sessionExercises.push({
        id: newId(),
        exerciseId: exercise.id,
        sets: te.sets,
        repsMin: te.repsMin,
        repsMax: te.repsMax,
        restSeconds: te.restSeconds,
      });
    }
    return {
      id: newId(),
      name: session.name,
      dayIndex: session.dayIndex,
      exercises: sessionExercises,
    };
  });

  const now = nowIso();
  return {
    id: newId(),
    name: template.name,
    goal: template.goal,
    daysPerWeek: template.daysPerWeek,
    level: template.level,
    location: template.location,
    sessions,
    active,
    createdAt: now,
    updatedAt: now,
  };
}
