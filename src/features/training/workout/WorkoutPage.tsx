import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Disc3,
  Info,
  Lightbulb,
  Plus,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ExerciseAnimation } from "../../../components/exercise/ExerciseAnimation";
import { BottomSheet, ConfirmDialog } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { NumberInput, TextInput } from "../../../components/ui/inputs";
import { Stepper } from "../../../components/ui/Stepper";
import { useRestTimer } from "../../../hooks/useRestTimer";
import { PlateCalculatorSheet } from "../../../components/workout/PlateCalculatorSheet";
import { armTimerSignal, playTimerSignal } from "../../../services/audio/timerSignal";
import { createSerializedWorkoutWriter } from "../../../services/workout/serializedWorkoutWriter";
import { WorkoutRevisionConflictError } from "../../../services/workout/workoutRevision";
import type {
  Exercise,
  ExerciseLog,
  SetLog,
  WorkoutLog,
  WorkoutPlan,
} from "../../../models";
import {
  calculateWorkoutDuration,
  findLastPerformance,
  suggestNextWeight,
} from "../../../services/calculations/workout";
import { db, workoutLogRepository, workoutPlanRepository } from "../../../services/storage";
import {
  calculateWarmupSets,
  isCompoundMovement,
} from "../../../services/calculations/warmup";
import {
  contiguousSuperset,
  nextSupersetExerciseIndex,
  shouldRestAfterSupersetSet,
  supersetRestSeconds,
} from "../../../services/calculations/supersets";
import {
  cancelWorkout,
  completeSet,
  countIncompleteSets,
  finishWorkout,
  saveWorkout,
} from "../../../services/workout/workoutService";
import { formatDateShortGerman, formatDuration, formatTime } from "../../../utils/dates";
import { newId } from "../../../utils/ids";
import { equipmentLabels, muscleGroupLabels } from "../../../utils/labels";
import { formatKg, parseDecimalInput, roundTo } from "../../../utils/numbers";

const DEFAULT_REST_SECONDS = 90;
const SAVE_DEBOUNCE_MS = 400;
const REST_OVER_HIDE_MS = 1800;

/** "80 kg × 8" — bodyweight sets (0 kg) fall back to plain reps. */
function formatSetShort(set: Pick<SetLog, "weightKg" | "reps">): string {
  return set.weightKg > 0 ? `${formatKg(set.weightKg)} × ${set.reps}` : `${set.reps} Wdh.`;
}

/** Subtle pulse for the running rest timer — disabled for reduced motion. */
const REST_TIMER_CSS = `
@keyframes rest-timer-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.28); }
  50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
}
.rest-timer-card { animation: rest-timer-pulse 2s var(--ease) infinite; }
@media (prefers-reduced-motion: reduce) {
  .rest-timer-card { animation: none; }
}
`;

/**
 * Fullscreen workout mode (§45-53). The single source of truth is the
 * persisted WorkoutLog: every mutation updates local state AND autosaves
 * immediately (stepper typing is debounced ~400 ms). Leaving the screen
 * keeps the workout active — it can be resumed any time.
 */
export default function WorkoutPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // undefined = loading, null = not found.
  const [log, setLogState] = useState<WorkoutLog | null | undefined>(undefined);
  const [plan, setPlan] = useState<WorkoutPlan | undefined>(undefined);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [infoOpen, setInfoOpen] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);

  const logRef = useRef<WorkoutLog | null>(null);
  const routeWorkoutId = useRef(workoutId);
  routeWorkoutId.current = workoutId;
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use ONE ordered writer for autosave, pagehide and terminal states.
  const orderedSave = useRef(createSerializedWorkoutWriter<WorkoutLog>(saveWorkout));
  const terminalSaveInFlight = useRef(false);
  const conflictNotified = useRef(false);

  const restRemaining = useRestTimer(log?.restEndsAt);

  // "Pause vorbei"-Signal: beep + vibration exactly when the timer hits 0.
  const signalPlayed = useRef(false);
  useEffect(() => {
    if (restRemaining === null || restRemaining > 0) {
      signalPlayed.current = false;
      return;
    }
    if (!signalPlayed.current) {
      signalPlayed.current = true;
      playTimerSignal();
    }
  }, [restRemaining]);

  // Exercise library (labels, instructions, animation, add-exercise search).
  const allExercises = useLiveQuery(() => db.exercises.toArray(), []);
  // Previous sessions feed "Letztes Mal" + the progression suggestion.
  const completedLogs = useLiveQuery(() => workoutLogRepository.listCompleted(30), []);
  const exercisesById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const exercise of allExercises ?? []) map.set(exercise.id, exercise);
    return map;
  }, [allExercises]);
  const sortedExercises = useMemo(
    () => [...(allExercises ?? [])].sort((a, b) => a.name.localeCompare(b.name, "de")),
    [allExercises],
  );
  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === "") return sortedExercises;
    return sortedExercises.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        muscleGroupLabels[e.muscleGroup].toLowerCase().includes(query),
    );
  }, [sortedExercises, search]);

  const cancelPendingSave = useCallback(() => {
    if (pendingSave.current) {
      clearTimeout(pendingSave.current);
      pendingSave.current = null;
    }
  }, []);

  const reportSaveError = useCallback((error: unknown) => {
    const conflict = error instanceof WorkoutRevisionConflictError ||
      (error instanceof Error && /already finalized|no longer exists/.test(error.message));
    if (conflict) {
      if (!conflictNotified.current) {
        conflictNotified.current = true;
        setSaveConflict(true);
        showToast("Training wurde in einem anderen Fenster geändert. Bitte neu laden.");
      }
      return;
    }
    showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
  }, [showToast]);

  /** Every mutation flows through here: set state + autosave (§128). */
  const apply = useCallback(
    (next: WorkoutLog, mode: "now" | "debounce") => {
      if (terminalSaveInFlight.current || conflictNotified.current ||
          !workoutId || next.id !== workoutId ||
          logRef.current?.id !== workoutId) return;
      logRef.current = next;
      setLogState(next);
      cancelPendingSave();
      if (mode === "now") {
        void orderedSave.current(next).catch(reportSaveError);
      } else {
        pendingSave.current = setTimeout(() => {
          pendingSave.current = null;
          void orderedSave.current(next).catch(reportSaveError);
        }, SAVE_DEBOUNCE_MS);
      }
    },
    [cancelPendingSave, reportSaveError, workoutId],
  );

  // Initial load — one-time read into local state (this screen owns the log).
  useEffect(() => {
    let cancelled = false;
    setLogState(undefined);
    if (!workoutId) {
      setLogState(null);
      return;
    }
    workoutLogRepository
      .get(workoutId)
      .then((found) => {
        if (cancelled) return;
        logRef.current = found ?? null;
        conflictNotified.current = false;
        setSaveConflict(false);
        // A separate queue per loaded workout carries its own expected
        // revision. Every successful queued write advances that revision.
        // A second tab's edit makes this version stale and is rejected.
        let savedRevision = found?.saveRevision ?? 0;
        orderedSave.current = createSerializedWorkoutWriter<WorkoutLog>(
          async (snapshot) => {
            // A pending debounce from another route must not use this
            // workout's revision token to persist a different workout.
            if (snapshot.id !== found?.id) {
              throw new Error("Workout writer received a different session");
            }
            const saved = await saveWorkout({
              ...snapshot,
              saveRevision: savedRevision,
            });
            savedRevision = saved.saveRevision ?? 0;
          },
        );
        setLogState(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setLogState(null);
      });
    return () => {
      cancelled = true;
      // Switching between /training/workout/:id routes reuses this React
      // component. Flush the old route's pending debounce using its OWN
      // writer before the new route installs another one.
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
        pendingSave.current = null;
        const previous = logRef.current;
        const previousWriter = orderedSave.current;
        if (previous?.id === workoutId) {
          void previousWriter(previous).catch(reportSaveError);
        }
      }
    };
  }, [workoutId, reportSaveError]);

  // Plan (for per-exercise rest seconds), if the workout came from one.
  const planId = log?.planId;
  useEffect(() => {
    let cancelled = false;
    if (!planId) {
      setPlan(undefined);
      return;
    }
    workoutPlanRepository
      .get(planId)
      .then((found) => {
        if (!cancelled) setPlan(found);
      })
      .catch(() => {
        /* rest falls back to the default */
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  // Elapsed-time clock: timestamp-based, recomputed on visibility change (§146).
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setNowMs(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // "Pause vorbei" shows briefly, then the deadline is cleared and saved.
  useEffect(() => {
    if (restRemaining !== 0) return;
    const timer = setTimeout(() => {
      const current = logRef.current;
      if (!current?.restEndsAt) return;
      apply({ ...current, restEndsAt: undefined }, "now");
    }, REST_OVER_HIDE_MS);
    return () => clearTimeout(timer);
  }, [restRemaining, apply]);

  // Flush a pending debounced save when the screen unmounts — no data loss.
  useEffect(() => {
    return () => {
      if (pendingSave.current) {
        clearTimeout(pendingSave.current);
        pendingSave.current = null;
        if (logRef.current) {
          void orderedSave.current(logRef.current).catch(() => undefined);
        }
      }
    };
  }, []);

  // Flush the pending debounced save when the page is hidden or unloaded —
  // React's unmount cleanup never runs on reload/tab close/PWA kill, and
  // suspended background timers would silently drop the last change (§128).
  useEffect(() => {
    const flushPendingSave = () => {
      if (!pendingSave.current) return;
      clearTimeout(pendingSave.current);
      pendingSave.current = null;
      if (logRef.current) {
          void orderedSave.current(logRef.current).catch(() => undefined);
        }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushPendingSave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushPendingSave);
    };
  }, []);

  if (log === undefined || (log !== null && log.id !== workoutId)) {
    return (
      <div style={{ paddingTop: 20 }}>
        <LoadingState rows={6} />
      </div>
    );
  }

  if (log === null) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Training nicht gefunden."
        text="Es wurde möglicherweise gelöscht oder bereits beendet."
        action={{ label: "Zur Startseite", onClick: () => navigate("/today", { replace: true }) }}
      />
    );
  }

  if (log.status === "completed") {
    return <Navigate to={`/training/workout/${log.id}/summary`} replace />;
  }

  if (log.status === "cancelled") {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Dieses Training wurde verworfen."
        action={{ label: "Zum Training", onClick: () => navigate("/training", { replace: true }) }}
      />
    );
  }

  const exerciseCount = log.exerciseLogs.length;
  const exerciseIndex =
    exerciseCount === 0 ? 0 : Math.min(log.currentExerciseIndex ?? 0, exerciseCount - 1);
  const currentLog: ExerciseLog | undefined = log.exerciseLogs[exerciseIndex];
  const currentExercise = currentLog ? exercisesById.get(currentLog.exerciseId) : undefined;
  const firstOpenSet = currentLog ? currentLog.setLogs.findIndex((s) => !s.completed) : -1;
  const canGoNext = exerciseIndex < exerciseCount - 1;
  const elapsedSeconds = calculateWorkoutDuration(log, nowMs);
  const incompleteCount = countIncompleteSets(log);
  const resting = restRemaining != null && log.restEndsAt != null;

  const planSession = plan?.sessions.find((s) => s.id === log.sessionId);

  /** Rest seconds from the plan's matching exercise, else the 90 s default. */
  const restSecondsFor = (exerciseId: string): number => {
    const planned = planSession?.exercises.find((e) => e.exerciseId === exerciseId);
    return planned?.restSeconds ?? DEFAULT_REST_SECONDS;
  };

  // "Letztes Mal" for the current exercise + progression hint: reached all
  // target reps last session → suggest one increment more today.
  const lastPerformance = currentLog
    ? findLastPerformance(completedLogs ?? [], currentLog.exerciseId)
    : undefined;
  const plannedExercise = currentLog
    ? planSession?.exercises.find((e) => e.exerciseId === currentLog.exerciseId)
    : undefined;
  const suggestedKg = suggestNextWeight(lastPerformance, plannedExercise?.repsMax);
  // Non-persistent warm-up preview: the main work sets remain unchanged.
  const warmupWorkWeight = currentLog?.setLogs.find((set) => set.weightKg > 0)?.weightKg ?? 0;
  const warmupPreview = currentExercise && warmupWorkWeight > 0
    ? calculateWarmupSets({
        workWeightKg: warmupWorkWeight,
        compound: isCompoundMovement(currentExercise),
        barWeightKg: currentExercise.equipment === "barbell" ? 20 : 0,
      })
    : [];

  const updateSet = (
    setIndex: number,
    changes: Partial<SetLog>,
    mode: "now" | "debounce" = "debounce",
  ) => {
    const next: WorkoutLog = {
      ...log,
      exerciseLogs: log.exerciseLogs.map((el, ei) =>
        ei !== exerciseIndex
          ? el
          : {
              ...el,
              setLogs: el.setLogs.map((s, si) => (si !== setIndex ? s : { ...s, ...changes })),
            },
      ),
    };
    apply(next, mode);
  };

  const commitRpe = (setIndex: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : parseDecimalInput(trimmed);
    const rpe = parsed == null ? undefined : roundTo(Math.min(10, Math.max(0, parsed)), 1);
    const setLog = currentLog?.setLogs[setIndex];
    if (!setLog || setLog.rpe === rpe) return;
    updateSet(setIndex, { rpe }, "now");
  };

  const handleCompleteSet = () => {
    if (!currentLog || firstOpenSet < 0) return;
    // Unlock audio inside the tap gesture so the end-of-rest beep may play.
    armTimerSignal();
    const completed = completeSet(log, exerciseIndex, firstOpenSet, 0);
    const nextSupersetIndex = nextSupersetExerciseIndex(completed.exerciseLogs, exerciseIndex);
    const shouldRest = shouldRestAfterSupersetSet(
      completed.exerciseLogs, exerciseIndex, nextSupersetIndex,
    );
    const seconds = shouldRest
      ? supersetRestSeconds(completed.exerciseLogs, exerciseIndex, restSecondsFor)
      : 0;
    apply({
      ...completed,
      currentExerciseIndex: nextSupersetIndex ?? exerciseIndex,
      restEndsAt: seconds > 0
        ? new Date(Date.now() + seconds * 1000).toISOString()
        : undefined,
    }, "now");
  };

  const goToExercise = (index: number) => {
    if (exerciseCount === 0) return;
    const clamped = Math.max(0, Math.min(index, exerciseCount - 1));
    if (clamped === exerciseIndex) return;
    apply({ ...log, currentExerciseIndex: clamped }, "now");
  };

  const extendRest = () => {
    if (!log.restEndsAt) return;
    const base = Math.max(new Date(log.restEndsAt).getTime(), Date.now());
    apply({ ...log, restEndsAt: new Date(base + 30_000).toISOString() }, "now");
  };

  const skipRest = () => {
    if (!log.restEndsAt) return;
    apply({ ...log, restEndsAt: undefined }, "now");
  };

  const handleAddExercise = (exercise: Exercise) => {
    const setLogs: SetLog[] = Array.from({ length: 3 }, (_, i) => ({
      id: newId(),
      setIndex: i,
      weightKg: 0,
      reps: 0,
      completed: false,
    }));
    const entry: ExerciseLog = {
      id: newId(),
      exerciseId: exercise.id,
      name: exercise.name,
      setLogs,
    };
    apply(
      {
        ...log,
        exerciseLogs: [...log.exerciseLogs, entry],
        currentExerciseIndex: log.exerciseLogs.length,
      },
      "now",
    );
    setAddOpen(false);
    setSearch("");
    showToast("Übung hinzugefügt.");
  };

  const requestFinish = () => {
    if (incompleteCount > 0) setFinishOpen(true);
    else void handleFinish();
  };

  const handleFinish = async () => {
    if (terminalSaveInFlight.current || conflictNotified.current) return;
    terminalSaveInFlight.current = true;
    setFinishOpen(false);
    cancelPendingSave();
    const finished = finishWorkout(logRef.current ?? log);
    try {
      // Drain all older active writes BEFORE the final status update.
      await orderedSave.current(finished);
      logRef.current = finished;
    } catch (error) {
      terminalSaveInFlight.current = false;
      reportSaveError(error);
      return;
    }
    if (routeWorkoutId.current === finished.id) {
      navigate(`/training/workout/${finished.id}/summary`, { replace: true });
    } else {
      terminalSaveInFlight.current = false;
    }
  };

  const handleDiscard = async () => {
    if (terminalSaveInFlight.current || conflictNotified.current) return;
    terminalSaveInFlight.current = true;
    setDiscardOpen(false);
    cancelPendingSave();
    const discarded = cancelWorkout(logRef.current ?? log);
    try {
      await orderedSave.current(discarded);
      logRef.current = discarded;
    } catch (error) {
      terminalSaveInFlight.current = false;
      reportSaveError(error);
      return;
    }
    if (routeWorkoutId.current === discarded.id) {
      navigate("/training", { replace: true });
    } else {
      terminalSaveInFlight.current = false;
    }
  };

  // Big thumb-zone primary action: complete set → next exercise → finish.
  let primaryLabel = "Übung hinzufügen";
  let onPrimary: () => void = () => setAddOpen(true);
  if (currentLog) {
    if (firstOpenSet >= 0) {
      primaryLabel = `Satz ${firstOpenSet + 1} fertig`;
      onPrimary = handleCompleteSet;
    } else if (canGoNext) {
      primaryLabel = "Nächste Übung";
      onPrimary = () => goToExercise(exerciseIndex + 1);
    } else {
      primaryLabel = "Training abschließen";
      onPrimary = requestFinish;
    }
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <style>{REST_TIMER_CSS}</style>
      {saveConflict ? (
        <div
          role="alert"
          style={{
            padding: 16,
            marginBottom: 16,
            border: "1px solid var(--warning)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 8 }}>
            Dieses Training wurde in einem anderen Fenster verändert.
          </p>
          <p style={{ fontSize: 14, marginBottom: 12 }}>
            Neue Eingaben in diesem Fenster werden nicht gespeichert.
            Beim Neuladen wird der aktuell gespeicherte Trainingsstand angezeigt.
          </p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Gespeicherten Stand neu laden
          </Button>
        </div>
      ) : null}

      {/* Own compact top bar — back keeps the workout active (resume later). */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0 14px" }}>
        <IconButton label="Zurück zum Training" onClick={() => navigate("/training")}>
          <ArrowLeft size={22} />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {log.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {exerciseCount > 0
              ? `Übung ${exerciseIndex + 1} von ${exerciseCount}`
              : "Noch keine Übungen"}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {formatDuration(elapsedSeconds)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Dauer</div>
        </div>
      </div>

      {/* Rest timer — absolute deadline, prominent while running (§50). */}
      {resting ? (
        restRemaining > 0 ? (
          <Card
            className="rest-timer-card"
            style={{ textAlign: "center", borderColor: "var(--accent)", marginBottom: 16 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Timer size={16} aria-hidden="true" /> Pause
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.25,
              }}
            >
              {formatDuration(restRemaining)}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10 }}>
              <Button variant="secondary" autoWidth onClick={extendRest}>
                +30 Sek.
              </Button>
              <Button variant="ghost" autoWidth onClick={skipRest}>
                Überspringen
              </Button>
            </div>
          </Card>
        ) : (
          <Card style={{ textAlign: "center", borderColor: "var(--success)", marginBottom: 16 }}>
            <strong style={{ color: "var(--success)", fontSize: 18 }}>Pause vorbei!</strong>
          </Card>
        )
      ) : null}

      {currentLog ? (
        <>
          {/* Current exercise */}
          <section>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>
              {currentLog.name}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 2,
                flexWrap: "wrap",
              }}
            >
              {currentExercise ? (
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  {muscleGroupLabels[currentExercise.muscleGroup]}
                </span>
              ) : null}
              {plannedExercise ? (
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  · Ziel{" "}
                  {plannedExercise.repsMin === plannedExercise.repsMax
                    ? plannedExercise.repsMax
                    : `${plannedExercise.repsMin}–${plannedExercise.repsMax}`}{" "}
                  Wdh.
                </span>
              ) : null}
              {currentExercise ? (
                <Button variant="ghost" autoWidth onClick={() => setInfoOpen(true)}>
                  <Info size={16} /> Anleitung
                </Button>
              ) : null}
              {currentExercise?.equipment === "barbell" ? (
                <Button variant="ghost" autoWidth onClick={() => setPlatesOpen(true)}>
                  <Disc3 size={16} /> Scheiben
                </Button>
              ) : null}
            </div>
            {contiguousSuperset(log.exerciseLogs, exerciseIndex).length >= 2 ? (
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--accent-2)" }}>
                Supersatz {currentLog.supersetGroup} · automatischer Übungswechsel nach jedem Satz
              </p>
            ) : null}
            {lastPerformance ? (
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
                Letztes Mal ({formatDateShortGerman(lastPerformance.date)}):{" "}
                {lastPerformance.sets.map(formatSetShort).join(" · ")}
              </p>
            ) : null}
            {suggestedKg != null ? (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--accent-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TrendingUp size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                Vorschlag: {formatKg(suggestedKg)} — letztes Mal alle Sätze geschafft
              </p>
            ) : null}
            {warmupPreview.length > 0 ? (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "var(--surface-2)",
                  fontSize: 14,
                }}
              >
                <strong>Aufwärmen (Vorschlag)</strong>
                <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
                  {warmupPreview.map((set) => `${formatKg(set.weightKg)} × ${set.reps}`).join(" · ")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                  Geschätzte Aufwärmsätze; nicht automatisch protokolliert.
                  Bei Langhantel standardmäßig 20 kg Stange angenommen.
                </p>
              </div>
            ) : null}
          </section>

          {/* Sets as big cards — fast to hit mid-workout, editable after completion. */}
          <div style={{ marginTop: 12 }}>
            {currentLog.setLogs.map((set, setIndex) => (
              <Card
                key={set.id}
                style={
                  setIndex === firstOpenSet ? { borderColor: "var(--accent)" } : undefined
                }
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <strong style={{ fontSize: 16 }}>Satz {setIndex + 1}</strong>
                  {set.completed ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--success)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={18} aria-hidden="true" />
                      {set.completedAt ? formatTime(set.completedAt) : "Fertig"}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-soft)", fontSize: 13 }}>Offen</span>
                  )}
                </div>
                <div className="field__label" style={{ marginBottom: 6 }}>
                  Gewicht
                </div>
                <Stepper
                  value={set.weightKg}
                  step={2.5}
                  min={0}
                  unit="kg"
                  decimals={1}
                  inputMode="decimal"
                  label={`Gewicht Satz ${setIndex + 1}`}
                  onChange={(value) => updateSet(setIndex, { weightKg: value })}
                />
                <div className="field__label" style={{ margin: "12px 0 6px" }}>
                  Wiederholungen
                </div>
                <Stepper
                  value={set.reps}
                  step={1}
                  min={0}
                  decimals={0}
                  inputMode="numeric"
                  label={`Wiederholungen Satz ${setIndex + 1}`}
                  onChange={(value) => updateSet(setIndex, { reps: Math.round(value) })}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <span className="field__label" style={{ margin: 0, flex: 1 }}>
                    RPE (optional, 0–10)
                  </span>
                  <NumberInput
                    key={`${set.id}-rpe-${set.rpe ?? "none"}`}
                    defaultValue={set.rpe ?? ""}
                    placeholder="–"
                    aria-label={`RPE Satz ${setIndex + 1}`}
                    style={{ maxWidth: 90, textAlign: "center" }}
                    onBlur={(e) => commitRpe(setIndex, e.target.value)}
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Exercise navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
            <IconButton
              label="Vorherige Übung"
              onClick={() => goToExercise(exerciseIndex - 1)}
              disabled={exerciseIndex <= 0}
              style={{ opacity: exerciseIndex <= 0 ? 0.35 : 1 }}
            >
              <ChevronLeft size={22} />
            </IconButton>
            <Button
              variant="ghost"
              autoWidth
              style={{ flex: 1 }}
              onClick={() => goToExercise(exerciseIndex + 1)}
              disabled={!canGoNext}
            >
              Übung überspringen
            </Button>
            <IconButton
              label="Nächste Übung"
              onClick={() => goToExercise(exerciseIndex + 1)}
              disabled={!canGoNext}
              style={{ opacity: canGoNext ? 1 : 0.35 }}
            >
              <ChevronRight size={22} />
            </IconButton>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title="Noch keine Übungen."
          text="Füge eine Übung hinzu, um loszulegen."
          action={{ label: "Übung hinzufügen", onClick: () => setAddOpen(true) }}
        />
      )}

      <Button variant="secondary" onClick={() => setAddOpen(true)} style={{ marginTop: 14 }}>
        <Plus size={18} /> Übung hinzufügen
      </Button>
      <Button
        variant="ghost"
        onClick={() => setDiscardOpen(true)}
        style={{ marginTop: 8, color: "var(--danger)" }}
      >
        Training verwerfen
      </Button>

      {/* Fixed thumb-zone action bar (§48). */}
      <div className="action-bar">
        <div className="action-bar__inner">
          <Button variant="secondary" autoWidth onClick={requestFinish}>
            Beenden
          </Button>
          <Button autoWidth style={{ flex: 1 }} onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </div>

      {/* Instructions sheet */}
      <BottomSheet
        open={infoOpen}
        title={currentExercise?.name ?? "Anleitung"}
        onClose={() => setInfoOpen(false)}
      >
        {currentExercise ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {currentExercise.animationType ? (
              <Card style={{ position: "relative", height: 180 }} flat>
                <ExerciseAnimation type={currentExercise.animationType} />
              </Card>
            ) : null}
            {currentExercise.instructions.length > 0 ? (
              <section>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Anleitung</h3>
                <ol style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 20, margin: 0 }}>
                  {currentExercise.instructions.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </section>
            ) : null}
            {currentExercise.commonMistakes.length > 0 ? (
              <section>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Häufige Fehler</h3>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0 }}>
                  {currentExercise.commonMistakes.map((mistake, index) => (
                    <li key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <X size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <span style={{ flex: 1, minWidth: 0 }}>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {currentExercise.tips.length > 0 ? (
              <section>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Tipps</h3>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0, padding: 0 }}>
                  {currentExercise.tips.map((tip, index) => (
                    <li key={index} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Lightbulb size={18} color="var(--accent-2)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <span style={{ flex: 1, minWidth: 0 }}>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      {/* Add-exercise sheet */}
      <BottomSheet
        open={addOpen}
        title="Übung hinzufügen"
        onClose={() => {
          setAddOpen(false);
          setSearch("");
        }}
      >
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Übung suchen …"
          aria-label="Übung suchen"
        />
        <div style={{ marginTop: 10 }}>
          {filteredExercises.length === 0 ? (
            <EmptyState
              title="Keine Übung gefunden."
              text="Versuche einen anderen Suchbegriff."
            />
          ) : (
            filteredExercises.slice(0, 60).map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                className="list-row"
                onClick={() => handleAddExercise(exercise)}
              >
                <div className="list-row__body">
                  <div className="list-row__title">{exercise.name}</div>
                  <div className="list-row__subtitle">
                    {muscleGroupLabels[exercise.muscleGroup]} · {equipmentLabels[exercise.equipment]}
                  </div>
                </div>
                <span className="list-row__trailing">
                  <Plus size={20} aria-hidden="true" />
                </span>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Plate calculator for the active set weight (barbell exercises). */}
      <PlateCalculatorSheet
        open={platesOpen}
        targetKg={
          currentLog?.setLogs[firstOpenSet >= 0 ? firstOpenSet : 0]?.weightKg ?? 20
        }
        onClose={() => setPlatesOpen(false)}
      />

      {/* Finish with open sets — explicit confirmation (§52). */}
      <ConfirmDialog
        open={finishOpen}
        title="Training beenden?"
        text={
          incompleteCount === 1
            ? "1 Satz ist noch nicht abgeschlossen."
            : `${incompleteCount} Sätze sind noch nicht abgeschlossen.`
        }
        confirmLabel="Trotzdem beenden"
        onConfirm={() => void handleFinish()}
        extraAction={{ label: "Weiter trainieren", onClick: () => setFinishOpen(false) }}
        onCancel={() => setFinishOpen(false)}
      />

      {/* Discard — destructive, needs confirmation. */}
      <ConfirmDialog
        open={discardOpen}
        title="Training verwerfen?"
        text="Das Training wird als abgebrochen gespeichert und zählt nicht für deinen Fortschritt."
        confirmLabel="Verwerfen"
        danger
        onConfirm={() => void handleDiscard()}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
