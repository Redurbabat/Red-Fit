import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  History,
  Play,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, LoadingState } from "../../components/feedback/states";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useActiveWorkout } from "../../hooks/useActiveWorkout";
import { db, exerciseRepository, workoutLogRepository } from "../../services/storage";
import {
  loadLastWeights,
  pickSessionForToday,
  startManualWorkout,
  startPlannedWorkout,
} from "../../services/workout/workoutService";
import {
  formatDateShortGerman,
  formatDurationLong,
  formatTime,
  weekdayNameDe,
} from "../../utils/dates";
import {
  equipmentLabels,
  fitnessGoalLabels,
  muscleGroupLabels,
} from "../../utils/labels";

const EXERCISE_PREVIEW_COUNT = 4;

/** Non-interactive "Aktiv" badge in chip look (no nested buttons in rows). */
function ActiveBadge() {
  return (
    <span
      className="chip"
      style={{
        background: "rgba(239, 68, 68, 0.14)",
        borderColor: "var(--accent)",
        color: "var(--text)",
        minHeight: 28,
        fontSize: 13,
      }}
    >
      Aktiv
    </span>
  );
}

interface RowButtonProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onClick: () => void;
}

/** Tappable list row (≥56 px) with title, subtitle and trailing content. */
function RowButton({ title, subtitle, trailing, onClick }: RowButtonProps) {
  return (
    <button type="button" className="list-row" onClick={onClick}>
      <div className="list-row__body">
        <div className="list-row__title">{title}</div>
        {subtitle ? <div className="list-row__subtitle">{subtitle}</div> : null}
      </div>
      <div className="list-row__trailing">
        {trailing}
        <ChevronRight size={18} aria-hidden="true" />
      </div>
    </button>
  );
}

export default function TrainingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const activeWorkout = useActiveWorkout();
  const plans = useLiveQuery(() => db.workoutPlans.toArray(), []);
  const exercisePreview = useLiveQuery(
    () => db.exercises.orderBy("name").limit(EXERCISE_PREVIEW_COUNT).toArray(),
    [],
  );
  const recentWorkouts = useLiveQuery(() => workoutLogRepository.listCompleted(5), []);

  const [starting, setStarting] = useState(false);

  const activePlan = plans?.find((p) => p.active);
  const todaySession = activePlan ? pickSessionForToday(activePlan) : undefined;

  async function handleStartPlannedWorkout() {
    if (starting || !activePlan || !todaySession) return;
    setStarting(true);
    try {
      // Never create a second active workout — resume the existing one instead.
      const existing = await workoutLogRepository.getActive();
      if (existing) {
        navigate(`/training/workout/${existing.id}`);
        return;
      }
      const [exercises, lastWeights] = await Promise.all([
        exerciseRepository.list(),
        loadLastWeights(),
      ]);
      const log = await startPlannedWorkout(activePlan, todaySession, exercises, lastWeights);
      navigate(`/training/workout/${log.id}`);
    } catch {
      showToast("Training konnte nicht gestartet werden. Bitte versuche es erneut.");
      setStarting(false);
    }
  }

  async function handleStartManualWorkout() {
    if (starting) return;
    setStarting(true);
    try {
      const existing = await workoutLogRepository.getActive();
      if (existing) {
        navigate(`/training/workout/${existing.id}`);
        return;
      }
      const log = await startManualWorkout();
      navigate(`/training/workout/${log.id}`);
    } catch {
      showToast("Training konnte nicht gestartet werden. Bitte versuche es erneut.");
      setStarting(false);
    }
  }

  return (
    <>
      <PageHeader title="Training" />

      {activeWorkout ? (
        <Card style={{ borderColor: "var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Dumbbell size={26} color="var(--accent)" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700 }}>Du hast ein laufendes Training</p>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {activeWorkout.name} · gestartet um {formatTime(activeWorkout.startedAt)}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate(`/training/workout/${activeWorkout.id}`)}>
            Training fortsetzen
          </Button>
        </Card>
      ) : null}

      {plans === undefined ? (
        <LoadingState rows={2} />
      ) : activePlan ? (
        <Card>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
            Aktiver Plan
          </span>
          <p style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{activePlan.name}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
            {fitnessGoalLabels[activePlan.goal]} · {activePlan.daysPerWeek}× pro Woche
          </p>
          {todaySession ? (
            <p style={{ fontSize: 14, marginTop: 10 }}>
              Nächste Einheit: <strong>{todaySession.name}</strong>
              {todaySession.dayIndex != null
                ? ` (${weekdayNameDe(todaySession.dayIndex)})`
                : ""}
              {" · "}
              {todaySession.exercises.length}{" "}
              {todaySession.exercises.length === 1 ? "Übung" : "Übungen"}
            </p>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 10 }}>
              Dieser Plan enthält noch keine Einheiten.
            </p>
          )}
          {todaySession && todaySession.exercises.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 10 }}>
              Diese Einheit hat noch keine Übungen — bearbeite den Plan, um loszulegen.
            </p>
          ) : null}
          <div style={{ marginTop: 14 }}>
            {activeWorkout ? (
              <Button onClick={() => navigate(`/training/workout/${activeWorkout.id}`)}>
                Training fortsetzen
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleStartPlannedWorkout}
                  disabled={starting || !todaySession || todaySession.exercises.length === 0}
                >
                  <Play size={18} aria-hidden="true" /> Workout starten
                </Button>
                {todaySession && todaySession.exercises.length === 0 ? (
                  <Button
                    variant="secondary"
                    style={{ marginTop: 8 }}
                    onClick={() => navigate(`/training/plans/${activePlan.id}`)}
                  >
                    Plan bearbeiten
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Kein aktiver Trainingsplan"
            text="Wähle einen Plan oder erstelle einen neuen, um direkt loszulegen."
            action={{ label: "Plan wählen", onClick: () => navigate("/training/plans") }}
          />
        </Card>
      )}

      <SectionHeader
        title="Trainingspläne"
        action={{ label: "Alle", onClick: () => navigate("/training/plans") }}
      />
      {plans === undefined ? (
        <LoadingState rows={2} />
      ) : plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarRange}
            title="Noch keine Trainingspläne"
            text="Erstelle einen Plan oder starte mit einer fertigen Vorlage."
            action={{ label: "Plan erstellen", onClick: () => navigate("/training/plans") }}
          />
        </Card>
      ) : (
        <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
          {plans.map((plan) => (
            <RowButton
              key={plan.id}
              title={plan.name}
              subtitle={`${fitnessGoalLabels[plan.goal]} · ${plan.daysPerWeek}× pro Woche`}
              trailing={plan.active ? <ActiveBadge /> : undefined}
              onClick={() => navigate(`/training/plans/${plan.id}`)}
            />
          ))}
        </Card>
      )}

      <SectionHeader
        title="Übungen"
        action={{ label: "Alle Übungen", onClick: () => navigate("/training/exercises") }}
      />
      {exercisePreview === undefined ? (
        <LoadingState rows={3} />
      ) : exercisePreview.length === 0 ? (
        <Card>
          <EmptyState
            icon={Dumbbell}
            title="Noch keine Übungen"
            text="Die Übungsbibliothek ist leer. Lege eigene Übungen an."
            action={{
              label: "Zur Übungsbibliothek",
              onClick: () => navigate("/training/exercises"),
            }}
          />
        </Card>
      ) : (
        <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
          {exercisePreview.map((exercise) => (
            <RowButton
              key={exercise.id}
              title={exercise.name}
              subtitle={`${muscleGroupLabels[exercise.muscleGroup]} · ${equipmentLabels[exercise.equipment]}`}
              onClick={() => navigate(`/training/exercises/${exercise.id}`)}
            />
          ))}
        </Card>
      )}

      <SectionHeader title="Letzte Workouts" />
      {recentWorkouts === undefined ? (
        <LoadingState rows={2} />
      ) : recentWorkouts.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title="Noch keine abgeschlossenen Workouts"
            text="Dein erstes Training erscheint hier, sobald du es abgeschlossen hast."
          />
        </Card>
      ) : (
        <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
          {recentWorkouts.map((log) => (
            <RowButton
              key={log.id}
              title={log.name}
              subtitle={
                log.durationSeconds != null
                  ? `${formatDateShortGerman(log.date)} · ${formatDurationLong(log.durationSeconds)}`
                  : formatDateShortGerman(log.date)
              }
              onClick={() => navigate(`/training/workout/${log.id}/summary`)}
            />
          ))}
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" onClick={handleStartManualWorkout} disabled={starting}>
          Manuelles Workout starten
        </Button>
      </div>
    </>
  );
}
