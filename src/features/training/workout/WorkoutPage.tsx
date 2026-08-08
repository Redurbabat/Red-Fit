import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Info,
  Lightbulb,
  Plus,
  Timer,
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
import type {
  Exercise,
  ExerciseLog,
  SetLog,
  WorkoutLog,
  WorkoutPlan,
} from "../../../models";
import { calculateWorkoutDuration } from "../../../services/calculations/workout";
import { db, workoutLogRepository, workoutPlanRepository } from "../../../services/storage";
import {
  cancelWorkout,
  completeSet,
  countIncompleteSets,
  finishWorkout,
  saveWorkout,
} from "../../../services/workout/workoutService";
import { formatDuration, formatTime } from "../../../utils/dates";
import { newId } from "../../../utils/ids";
import { equipmentLabels, muscleGroupLabels } from "../../../utils/labels";
import { parseDecimalInput, roundTo } from "../../../utils/numbers";

const DEFAULT_REST_SECONDS = 90;
const SAVE_DEBOUNCE_MS = 400;
const REST_OVER_HIDE_MS = 1800;

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
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const logRef = useRef<WorkoutLog | null>(null);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restRemaining = useRestTimer(log?.restEndsAt);

  // Exercise library (labels, instructions, animation, add-exercise search).
  const allExercises = useLiveQuery(() => db.exercises.toArray(), []);
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

  /** Every mutation flows through here: set state + autosave (§128). */
  const apply = useCallback(
    (next: WorkoutLog, mode: "now" | "debounce") => {
      logRef.current = next;
      setLogState(next);
      cancelPendingSave();
      if (mode === "now") {
        void saveWorkout(next).catch(() =>
          showToast("Speichern fehlgeschlagen. Bitte versuche es erneut."),
        );
      } else {
        pendingSave.current = setTimeout(() => {
          pendingSave.current = null;
          void saveWorkout(next).catch(() =>
            showToast("Speichern fehlgeschlagen. Bitte versuche es erneut."),
          );
        }, SAVE_DEBOUNCE_MS);
      }
    },
    [cancelPendingSave, showToast],
  );

  // Initial load — one-time read into local state (this screen owns the log).
  useEffect(() => {
    let cancelled = false;
    if (!workoutId) {
      setLogState(null);
      return;
    }
    workoutLogRepository
      .get(workoutId)
      .then((found) => {
        if (cancelled) return;
        logRef.current = found ?? null;
        setLogState(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setLogState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

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
        if (logRef.current) void saveWorkout(logRef.current);
      }
    };
  }, []);

  if (log === undefined) {
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

  /** Rest seconds from the plan's matching exercise, else the 90 s default. */
  const restSecondsFor = (exerciseId: string): number => {
    const session = plan?.sessions.find((s) => s.id === log.sessionId);
    const planned = session?.exercises.find((e) => e.exerciseId === exerciseId);
    return planned?.restSeconds ?? DEFAULT_REST_SECONDS;
  };

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
    apply(completeSet(log, exerciseIndex, firstOpenSet, restSecondsFor(currentLog.exerciseId)), "now");
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
    setFinishOpen(false);
    cancelPendingSave();
    const finished = finishWorkout(logRef.current ?? log);
    try {
      await saveWorkout(finished);
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      return;
    }
    navigate(`/training/workout/${finished.id}/summary`, { replace: true });
  };

  const handleDiscard = async () => {
    setDiscardOpen(false);
    cancelPendingSave();
    try {
      await saveWorkout(cancelWorkout(logRef.current ?? log));
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
      return;
    }
    navigate("/training", { replace: true });
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
              {currentExercise ? (
                <Button variant="ghost" autoWidth onClick={() => setInfoOpen(true)}>
                  <Info size={16} /> Anleitung
                </Button>
              ) : null}
            </div>
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
