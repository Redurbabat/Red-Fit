import { Check, Dumbbell, Minus, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card, StatCard } from "../../../components/ui/Card";
import type { SetLog, WorkoutLog } from "../../../models";
import {
  calculateWorkoutDuration,
  calculateWorkoutVolume,
  countCompletedSets,
  countTotalReps,
  findNewRecords,
  type ExerciseRecord,
} from "../../../services/calculations/workout";
import { workoutLogRepository } from "../../../services/storage";
import { saveWorkoutNotes } from "../../../services/workout/workoutService";
import { WorkoutRevisionConflictError } from "../../../services/workout/workoutRevision";
import { createSerializedWorkoutWriter } from "../../../services/workout/serializedWorkoutWriter";
import { formatDateGerman, formatDurationLong } from "../../../utils/dates";
import { formatKg } from "../../../utils/numbers";

const NOTES_SAVE_DEBOUNCE_MS = 400;

/** "80 kg × 10" — bodyweight sets (0 kg) fall back to plain reps. */
function formatSet(set: Pick<SetLog, "weightKg" | "reps">): string {
  return set.weightKg > 0 ? `${formatKg(set.weightKg)} × ${set.reps}` : `${set.reps} Wdh.`;
}

/** Post-workout summary: stats, new personal records, sets, notes (§53). */
export default function WorkoutSummaryPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // undefined = loading, null = not found.
  const [log, setLog] = useState<WorkoutLog | null | undefined>(undefined);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [notes, setNotes] = useState("");
  const [notesConflict, setNotesConflict] = useState(false);
  // Refs keep the latest value visible to flush handlers (hidden/pagehide/unmount).
  const notesRef = useRef("");
  const lastSavedNotes = useRef("");
  const pendingNotesSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesWriter = useRef<{
    workoutId: string;
    save: (notes: string) => Promise<void>;
  } | null>(null);
  const notesConflictRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    notesWriter.current = null;
    notesConflictRef.current = false;
    setNotesConflict(false);
    setLog(undefined);
    if (!workoutId) {
      setLog(null);
      return;
    }
    workoutLogRepository
      .get(workoutId)
      .then((found) => {
        if (cancelled) return;
        setLog(found ?? null);
        if (found) {
          // Serial saves use a revision updated ONLY after persistence.
          // Two independent summary views cannot silently overwrite notes.
          let revision = found.saveRevision ?? 0;
          const save = createSerializedWorkoutWriter<string>(
            async (text) => {
              const saved = await saveWorkoutNotes(found.id, revision, text);
              revision = saved.saveRevision ?? 0;
              // An old writer may finish after navigating to another summary.
              // Do not modify the new workout's last-saved note reference.
              if (notesWriter.current?.save === save) {
                lastSavedNotes.current = text;
              }
            },
          );
          notesWriter.current = { workoutId: found.id, save };
        }
        const initialNotes = found?.notes ?? "";
        setNotes(initialNotes);
        notesRef.current = initialNotes;
        lastSavedNotes.current = initialNotes;
      })
      .catch(() => {
        if (!cancelled) setLog(null);
      });
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  // New personal records vs. all previous completed workouts.
  useEffect(() => {
    if (!log) return;
    let cancelled = false;
    workoutLogRepository
      .listCompleted()
      .then((completed) => {
        if (!cancelled) setRecords(findNewRecords(log, completed));
      })
      .catch(() => {
        /* records section simply stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [log]);

  /** Persist the current ref state; toast only on explicit saves (blur). */
  const persistNotes = useCallback(
    async (showFeedback: boolean) => {
      const writer = notesWriter.current;
      if (!writer || writer.workoutId !== workoutId || notesConflictRef.current) {
        return false;
      }
      const trimmed = notesRef.current.trim();
      if (trimmed === lastSavedNotes.current) return true;
      try {
        await writer.save(trimmed);
        if (showFeedback) showToast("Notiz gespeichert.");
        return true;
      } catch (error) {
        const stale = error instanceof WorkoutRevisionConflictError ||
          (error instanceof Error && /no longer exists|require a finalized/.test(error.message));
        if (stale) {
          if (!notesConflictRef.current) {
            notesConflictRef.current = true;
            setNotesConflict(true);
            showToast("Notizen wurden in einem anderen Fenster geändert. Bitte neu laden.");
          }
        } else if (showFeedback) {
          showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
        }
        return false;
      }
    },
    [showToast, workoutId],
  );

  /** Cancel a pending debounced save and persist immediately. */
  const flushNotes = useCallback(
    (showFeedback: boolean) => {
      if (pendingNotesSave.current) {
        clearTimeout(pendingNotesSave.current);
        pendingNotesSave.current = null;
      }
      return persistNotes(showFeedback);
    },
    [persistNotes],
  );

  /** Autosave while typing (debounced) — the note never lives only in state. */
  const handleNotesChange = (value: string) => {
    if (notesConflictRef.current || notesWriter.current?.workoutId !== workoutId) return;
    setNotes(value);
    notesRef.current = value;
    if (pendingNotesSave.current) clearTimeout(pendingNotesSave.current);
    pendingNotesSave.current = setTimeout(() => {
      pendingNotesSave.current = null;
      void persistNotes(false);
    }, NOTES_SAVE_DEBOUNCE_MS);
  };

  // Flush on page hide (app switch/lock — no blur fires on iOS), page unload
  // and unmount, so the typed note survives reload and PWA kill (Regel 1).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushNotes(false);
    };
    const onPageHide = () => flushNotes(false);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      flushNotes(false);
    };
  }, [flushNotes]);

  if (log === undefined || (log !== null && log.id !== workoutId)) {
    return (
      <>
        <PageHeader title="Zusammenfassung" />
        <LoadingState rows={5} />
      </>
    );
  }

  if (log === null) {
    return (
      <>
        <PageHeader title="Zusammenfassung" />
        <EmptyState
          icon={Dumbbell}
          title="Training nicht gefunden."
          text="Es wurde möglicherweise gelöscht."
          action={{ label: "Zum Training", onClick: () => navigate("/training", { replace: true }) }}
        />
      </>
    );
  }

  // An active workout has no summary yet — back to the live screen.
  if (log.status === "active") {
    return <Navigate to={`/training/workout/${log.id}`} replace />;
  }

  const durationSeconds = log.durationSeconds ?? calculateWorkoutDuration(log);

  return (
    <>
      <PageHeader
        title={log.name}
        subtitle={`${formatDateGerman(log.date)} · ${formatDurationLong(durationSeconds)}`}
      />

      <div className="stat-grid">
        <StatCard label="Übungen" value={String(log.exerciseLogs.length)} />
        <StatCard label="Abgeschlossene Sätze" value={String(countCompletedSets(log))} />
        <StatCard label="Wiederholungen" value={String(countTotalReps(log))} />
        <StatCard label="Volumen" value={formatKg(calculateWorkoutVolume(log))} />
      </div>

      {records.length > 0 ? (
        <section>
          <SectionHeader title="Persönliche Rekorde" />
          {records.map((record) => (
            <Card
              key={record.exerciseId}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <Trophy size={26} color="var(--accent-2)" style={{ flexShrink: 0 }} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {record.exerciseName}: {formatKg(record.maxWeightKg)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Neuer Bestwert · {record.maxRepsAtMaxWeight} Wdh.
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <section>
        <SectionHeader title="Übungen" />
        {log.exerciseLogs.length === 0 ? (
          <Card>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Keine Übungen protokolliert.
            </span>
          </Card>
        ) : (
          log.exerciseLogs.map((exerciseLog) => (
            <Card key={exerciseLog.id}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{exerciseLog.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {exerciseLog.setLogs.map((set, index) => (
                  <div
                    key={set.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 14,
                      color: set.completed ? "var(--text)" : "var(--text-soft)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>Satz {index + 1}</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {formatSet(set)}
                      {set.completed ? (
                        <Check size={16} color="var(--success)" aria-label="Abgeschlossen" />
                      ) : (
                        <Minus size={16} color="var(--text-soft)" aria-label="Nicht abgeschlossen" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </section>

      <section>
        <SectionHeader title="Notiz" />
        {notesConflict ? (
          <div role="alert" style={{
            padding: 14,
            marginBottom: 12,
            border: "1px solid var(--warning)",
            borderRadius: "var(--radius-md)",
          }}>
            <p style={{ marginBottom: 10 }}>
              Diese Trainingsnotizen wurden in einem anderen Fenster verändert.
              Ungespeicherte Änderungen hier werden nicht übernommen.
            </p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Gespeicherten Stand neu laden
            </Button>
          </div>
        ) : null}
        <textarea
          disabled={notesConflict}
          className="input"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={() => flushNotes(true)}
          placeholder="Wie lief das Training?"
          aria-label="Notiz zum Training"
          rows={3}
        />
      </section>

      <Button
        style={{ marginTop: 20 }}
        onClick={() => {
          // Do not navigate away if the final unsaved note failed to persist.
          void flushNotes(true).then((saved) => {
            if (saved) navigate("/training");
          });
        }}
      >
        Fertig
      </Button>
    </>
  );
}
