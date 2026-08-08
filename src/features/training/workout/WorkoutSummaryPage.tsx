import { Check, Dumbbell, Minus, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { formatDateGerman, formatDurationLong } from "../../../utils/dates";
import { formatKg } from "../../../utils/numbers";

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
  const lastSavedNotes = useRef("");

  useEffect(() => {
    let cancelled = false;
    if (!workoutId) {
      setLog(null);
      return;
    }
    workoutLogRepository
      .get(workoutId)
      .then((found) => {
        if (cancelled) return;
        setLog(found ?? null);
        const initialNotes = found?.notes ?? "";
        setNotes(initialNotes);
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

  const saveNotes = async () => {
    if (!log) return;
    const trimmed = notes.trim();
    if (trimmed === lastSavedNotes.current) return;
    try {
      await workoutLogRepository.update(log.id, {
        notes: trimmed === "" ? undefined : trimmed,
      });
      lastSavedNotes.current = trimmed;
      showToast("Notiz gespeichert.");
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  };

  if (log === undefined) {
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
                  Neuer Bestwert · × {record.maxRepsAtMaxWeight} Wdh.
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
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          placeholder="Wie lief das Training?"
          aria-label="Notiz zum Training"
          rows={3}
        />
      </section>

      <Button style={{ marginTop: 20 }} onClick={() => navigate("/training")}>
        Fertig
      </Button>
    </>
  );
}
