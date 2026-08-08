import type {
  Exercise,
  ExerciseLog,
  SetLog,
  WorkoutLog,
  WorkoutPlan,
  WorkoutPlanSession,
} from "../../models";
import { getDayIndex, getLocalDateKey, nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { calculateWorkoutDuration } from "../calculations/workout";
import { workoutLogRepository } from "../storage/workoutLogRepository";

/**
 * The workout lifecycle. Core rule: an active workout is a persisted
 * WorkoutLog from the very first second — every mutation goes through
 * `saveWorkout` (autosave), so no reload can ever lose gym data.
 */

/** Pick today's session by dayIndex, else the next upcoming one, else the first. */
export function pickSessionForToday(plan: WorkoutPlan): WorkoutPlanSession | undefined {
  if (plan.sessions.length === 0) return undefined;
  const today = getDayIndex();
  const withDay = plan.sessions.filter((s) => s.dayIndex != null);
  const exact = withDay.find((s) => s.dayIndex === today);
  if (exact) return exact;
  // Next session in the week (wrap around), otherwise first session.
  const upcoming = [...withDay].sort(
    (a, b) =>
      (((a.dayIndex! - today + 7) % 7) || 7) - (((b.dayIndex! - today + 7) % 7) || 7),
  );
  return upcoming[0] ?? plan.sessions[0];
}

/** Build the initial set logs for a planned exercise (planned but not completed). */
function buildSetLogs(sets: number, targetWeightKg: number | undefined, repsMax: number): SetLog[] {
  return Array.from({ length: Math.max(1, sets) }, (_, i) => ({
    id: newId(),
    setIndex: i,
    weightKg: targetWeightKg ?? 0,
    reps: repsMax,
    completed: false,
  }));
}

/**
 * Start a workout from a plan session — the log is persisted IMMEDIATELY
 * with status "active" before any UI renders (§45).
 */
export async function startPlannedWorkout(
  plan: WorkoutPlan,
  session: WorkoutPlanSession,
  exercises: Exercise[],
  lastWeights: Map<string, number>,
): Promise<WorkoutLog> {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const now = nowIso();
  const exerciseLogs: ExerciseLog[] = session.exercises.map((pe) => {
    const exercise = byId.get(pe.exerciseId);
    // Previous performance beats the plan's target weight as starting value.
    const startWeight = lastWeights.get(pe.exerciseId) ?? pe.targetWeightKg;
    return {
      id: newId(),
      exerciseId: pe.exerciseId,
      name: exercise?.name ?? "Übung",
      setLogs: buildSetLogs(pe.sets, startWeight, pe.repsMax),
    };
  });

  const log: WorkoutLog = {
    id: newId(),
    date: getLocalDateKey(),
    planId: plan.id,
    sessionId: session.id,
    name: session.name,
    startedAt: now,
    status: "active",
    exerciseLogs,
    currentExerciseIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
  await workoutLogRepository.put(log);
  return log;
}

/** Start an empty manual workout (exercises get added on the fly). */
export async function startManualWorkout(name = "Freies Training"): Promise<WorkoutLog> {
  const now = nowIso();
  const log: WorkoutLog = {
    id: newId(),
    date: getLocalDateKey(),
    name,
    startedAt: now,
    status: "active",
    exerciseLogs: [],
    currentExerciseIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
  await workoutLogRepository.put(log);
  return log;
}

/** Autosave — every mutation of the active workout flows through here (§128). */
export async function saveWorkout(log: WorkoutLog): Promise<WorkoutLog> {
  const updated = { ...log, updatedAt: nowIso() };
  await workoutLogRepository.put(updated);
  return updated;
}

/** Mark a set completed and arm the rest timer as an absolute deadline (§49/50). */
export function completeSet(
  log: WorkoutLog,
  exerciseIndex: number,
  setIndex: number,
  restSeconds: number,
): WorkoutLog {
  const now = new Date();
  const exerciseLogs = log.exerciseLogs.map((el, ei) =>
    ei !== exerciseIndex
      ? el
      : {
          ...el,
          setLogs: el.setLogs.map((s, si) =>
            si !== setIndex
              ? s
              : { ...s, completed: true, completedAt: now.toISOString() },
          ),
        },
  );
  return {
    ...log,
    exerciseLogs,
    restEndsAt:
      restSeconds > 0
        ? new Date(now.getTime() + restSeconds * 1000).toISOString()
        : undefined,
  };
}

export function finishWorkout(log: WorkoutLog): WorkoutLog {
  const endedAt = nowIso();
  return {
    ...log,
    status: "completed",
    endedAt,
    durationSeconds: calculateWorkoutDuration({ ...log, endedAt }),
    restEndsAt: undefined,
  };
}

export function cancelWorkout(log: WorkoutLog): WorkoutLog {
  return { ...log, status: "cancelled", endedAt: nowIso(), restEndsAt: undefined };
}

export function countIncompleteSets(log: WorkoutLog): number {
  return log.exerciseLogs.reduce(
    (sum, e) => sum + e.setLogs.filter((s) => !s.completed).length,
    0,
  );
}

/**
 * Last completed weights per exercise across completed workouts —
 * used as "previous performance" starting values.
 */
export async function loadLastWeights(): Promise<Map<string, number>> {
  const completed = await workoutLogRepository.listCompleted(30);
  const map = new Map<string, number>();
  for (const workout of completed) {
    for (const exerciseLog of workout.exerciseLogs) {
      if (map.has(exerciseLog.exerciseId)) continue;
      const completedSets = exerciseLog.setLogs.filter((s) => s.completed && s.weightKg > 0);
      if (completedSets.length > 0) {
        map.set(exerciseLog.exerciseId, Math.max(...completedSets.map((s) => s.weightKg)));
      }
    }
  }
  return map;
}
