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
import { db } from "../storage/database";
import { canPersistWorkoutStatus } from "./workoutStatusGuard";
import { nextWorkoutRevision } from "./workoutRevision";

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
 * A workout must be created or resumed in ONE IndexedDB write transaction.
 * The previous UI did a separate getActive() and then put(), allowing two
 * tabs to create different active workouts at the same time.
 *
 * Every training-start entry point uses this atomic operation; a losing
 * concurrent starter resumes the winning workout (with its original ID
 * and revision) rather than creating a second active session.
 */
export async function createOrResumeWorkout(proposed: WorkoutLog): Promise<WorkoutLog> {
  if (proposed.status !== "active" || proposed.saveRevision !== 0) {
    throw new Error("New workout must start active with revision zero");
  }
  return db.transaction("rw", db.workoutLogs, async () => {
    const existing = await db.workoutLogs
      .where("status").equals("active").first();
    if (existing) return existing;
    // add() rejects ID collisions rather than overwriting another workout.
    await db.workoutLogs.add(proposed);
    return proposed;
  });
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
      // Snapshot grouping so an active workout survives plan edits/deletion.
      supersetGroup: pe.supersetGroup,
      supersetRestSeconds: pe.supersetRestSeconds,
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
    saveRevision: 0,
    exerciseLogs,
    currentExerciseIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
  return createOrResumeWorkout(log);
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
    saveRevision: 0,
    exerciseLogs: [],
    currentExerciseIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
  return createOrResumeWorkout(log);
}

/**
 * Autosave the latest snapshot atomically. A separate browser tab could still
 * have a stale active copy of a workout already completed elsewhere. Check the
 * persisted lifecycle under the same IndexedDB read-write transaction before
 * overwriting it. Same-status edits (e.g. notes after completion) remain legal.
 */
export async function saveWorkout(log: WorkoutLog): Promise<WorkoutLog> {
  return db.transaction("rw", db.workoutLogs, async () => {
    const stored = await db.workoutLogs.get(log.id as never);
    if (!stored) {
      // A concurrent deletion or stale screen must not recreate a workout.
      throw new Error("Workout no longer exists");
    }
    if (!canPersistWorkoutStatus(stored.status, log.status)) {
      throw new Error("Workout is already finalized with another status");
    }
    // Compare and increment under one write transaction: two active tabs
    // cannot both save based on the same historical set snapshot.
    const saveRevision = nextWorkoutRevision(log.saveRevision, stored.saveRevision);
    const updated: WorkoutLog = { ...log, saveRevision, updatedAt: nowIso() };
    await db.workoutLogs.put(updated);
    return updated;
  });
}

/**
 * Persist summary notes without replacing the complete workout snapshot.
 * This used to bypass saveRevision via workoutLogRepository.update(), allowing
 * a stale full-workout write to overwrite a more recent note. Only terminal
 * workouts have a summary; the revision comparison is atomic with the patch.
 */
export async function saveWorkoutNotes(
  logId: string,
  expectedRevision: number | undefined,
  notes: string,
): Promise<WorkoutLog> {
  return db.transaction("rw", db.workoutLogs, async () => {
    const stored = await db.workoutLogs.get(logId as never);
    if (!stored) throw new Error("Workout no longer exists");
    if (stored.status !== "completed" && stored.status !== "cancelled") {
      throw new Error("Workout summary notes require a finalized workout");
    }
    const saveRevision = nextWorkoutRevision(
      expectedRevision,
      stored.saveRevision,
    );
    const updated: WorkoutLog = {
      ...stored,
      notes: notes.trim() || undefined,
      saveRevision,
      updatedAt: nowIso(),
    };
    await db.workoutLogs.put(updated);
    return updated;
  });
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
