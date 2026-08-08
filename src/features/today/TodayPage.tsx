import { useLiveQuery } from "dexie-react-hooks";
import { Droplets, Dumbbell, Play, Scale, ScanLine, Target, Utensils } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../components/feedback/states";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, StatCard } from "../../components/ui/Card";
import { Field, NumberInput } from "../../components/ui/inputs";
import { MacroBar, ProgressBar } from "../../components/ui/ProgressBar";
import { useActiveWorkout } from "../../hooks/useActiveWorkout";
import type { WorkoutPlan, WorkoutPlanSession } from "../../models";
import { calculateDailyNutrition } from "../../services/calculations/nutrition";
import { calculateTrainingStats } from "../../services/calculations/progress";
import {
  calculateTrainingWeekStreak,
  estimateSessionMinutes,
} from "../../services/calculations/workout";
import {
  bodyRepository,
  db,
  exerciseRepository,
  goalRepository,
  waterRepository,
  workoutLogRepository,
  workoutPlanRepository,
} from "../../services/storage";
import {
  loadLastWeights,
  pickSessionForToday,
  startPlannedWorkout,
} from "../../services/workout/workoutService";
import {
  formatDateGerman,
  formatDateShortGerman,
  formatTime,
  getLocalDateKey,
  greetingForHour,
  nowIso,
} from "../../utils/dates";
import { formatKg, formatLiters, parseDecimalInput, roundTo } from "../../utils/numbers";

/** Macro grams: one decimal, German comma ("10,4"). */
function formatGramValue(value: number): string {
  return roundTo(value, 1).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

const cardLabelStyle = {
  fontSize: 13,
  fontWeight: 600 as const,
  color: "var(--text-muted)",
};

export default function TodayPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const today = getLocalDateKey();

  const activeWorkout = useActiveWorkout();
  const activePlan = useLiveQuery(() => workoutPlanRepository.getActive(), [], null);
  const goal = useLiveQuery(() => goalRepository.getCurrent(), [], null);
  const mealLogs = useLiveQuery(() => db.mealLogs.where("date").equals(today).toArray(), [today]);
  const waterLogs = useLiveQuery(
    () => db.waterLogs.where("date").equals(today).toArray(),
    [today],
  );
  const latestWeight = useLiveQuery(() => bodyRepository.latestWeight(), [], null);
  const completedLogs = useLiveQuery(() => workoutLogRepository.listCompleted(), []);

  const [starting, setStarting] = useState(false);
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [waterInput, setWaterInput] = useState("");
  const [waterError, setWaterError] = useState<string | undefined>(undefined);
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightError, setWeightError] = useState<string | undefined>(undefined);

  const totals = calculateDailyNutrition(mealLogs ?? []);
  const waterTotalMl = (waterLogs ?? []).reduce((sum, log) => sum + log.amountMl, 0);
  const waterTargetMl = goal?.dailyWaterMl ?? 0;
  const streak = calculateTrainingWeekStreak(completedLogs ?? [], today);
  // Calendar-week count from the shared service — same label, same number
  // as the progress screen (no inline re-implementation).
  const workoutsThisWeek = calculateTrainingStats(completedLogs ?? [], today).workoutsThisWeek;

  async function handleStartWorkout(plan: WorkoutPlan, session: WorkoutPlanSession) {
    if (starting) return;
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
      const log = await startPlannedWorkout(plan, session, exercises, lastWeights);
      navigate(`/training/workout/${log.id}`);
    } catch {
      showToast("Training konnte nicht gestartet werden. Bitte versuche es erneut.");
      setStarting(false);
    }
  }

  async function addWater(amountMl: number) {
    try {
      // Compute the day key at action time — the render-time `today` goes
      // stale when the app stays open across midnight.
      await waterRepository.create({ date: getLocalDateKey(), amountMl, loggedAt: nowIso() });
      showToast("Wasser hinzugefügt.");
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function submitCustomWater() {
    const value = parseDecimalInput(waterInput);
    if (value == null || value <= 0) {
      setWaterError("Bitte gib eine gültige Menge in Millilitern ein.");
      return;
    }
    setWaterError(undefined);
    setWaterSheetOpen(false);
    setWaterInput("");
    await addWater(Math.round(value));
  }

  async function submitWeight() {
    const value = parseDecimalInput(weightInput);
    if (value == null || value <= 0 || value > 500) {
      setWeightError("Bitte gib ein gültiges Gewicht ein.");
      return;
    }
    try {
      // Append-only: always a NEW measurement, never overwriting history.
      // Day key at action time — see addWater (midnight-stale render value).
      await bodyRepository.create({ date: getLocalDateKey(), weightKg: roundTo(value, 1) });
      setWeightError(undefined);
      setWeightSheetOpen(false);
      setWeightInput("");
      showToast("Gewicht gespeichert.");
    } catch {
      setWeightError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  function openWeightSheet() {
    setWeightError(undefined);
    setWeightSheetOpen(true);
  }

  return (
    <>
      <PageHeader
        title={greetingForHour(new Date().getHours())}
        subtitle={formatDateGerman(today)}
      />

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

      <SectionHeader title="Training" />
      {activePlan === null || activeWorkout === null ? (
        <LoadingState rows={1} />
      ) : (
        <TodayWorkoutCard
          plan={activePlan}
          hasActiveWorkout={Boolean(activeWorkout)}
          starting={starting}
          onStart={handleStartWorkout}
          onResume={() =>
            activeWorkout && navigate(`/training/workout/${activeWorkout.id}`)
          }
        />
      )}

      <SectionHeader title="Ernährung" />
      <Card>
        <span style={cardLabelStyle}>Heutige Makros</span>
        {goal === null ? (
          <LoadingState rows={2} />
        ) : goal ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <MacroBar
              label="Kalorien"
              current={totals.kcal}
              target={goal.dailyKcal}
              unit="kcal"
              color="var(--calories)"
            />
            <MacroBar
              label="Protein"
              current={totals.protein}
              target={goal.dailyProtein}
              unit="g"
              color="var(--protein)"
              format={formatGramValue}
            />
            <MacroBar
              label="Kohlenhydrate"
              current={totals.carbs}
              target={goal.dailyCarbs}
              unit="g"
              color="var(--carbs)"
              format={formatGramValue}
            />
            <MacroBar
              label="Fett"
              current={totals.fat}
              target={goal.dailyFat}
              unit="g"
              color="var(--fat)"
              format={formatGramValue}
            />
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="Noch kein Ernährungsziel"
            text="Lege Kalorien und Makros fest, um deinen Tagesfortschritt zu sehen."
            action={{ label: "Ziel festlegen", onClick: () => navigate("/settings") }}
          />
        )}
      </Card>

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span style={cardLabelStyle}>Wasser</span>
          <span style={{ fontWeight: 700 }}>
            {waterTargetMl > 0
              ? `${formatLiters(waterTotalMl).replace(" L", "")} / ${formatLiters(waterTargetMl)}`
              : `${formatLiters(waterTotalMl)} heute`}
          </span>
        </div>
        {waterTargetMl > 0 ? (
          <div style={{ marginTop: 10 }}>
            <ProgressBar
              fraction={waterTotalMl / waterTargetMl}
              color="var(--water)"
            />
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Button variant="secondary" small onClick={() => void addWater(250)}>
            +250 ml
          </Button>
          <Button variant="secondary" small onClick={() => void addWater(500)}>
            +500 ml
          </Button>
          <Button
            variant="ghost"
            small
            onClick={() => {
              setWaterError(undefined);
              setWaterSheetOpen(true);
            }}
          >
            Eigene Menge
          </Button>
        </div>
      </Card>

      <SectionHeader title="Körper" />
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={cardLabelStyle}>Gewicht</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>
              {latestWeight === null
                ? "…"
                : latestWeight?.weightKg != null
                  ? formatKg(latestWeight.weightKg)
                  : "—"}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
              {latestWeight?.weightKg != null
                ? `Gemessen am ${formatDateShortGerman(latestWeight.date)}`
                : "Noch kein Gewicht erfasst."}
            </span>
          </div>
          <Button variant="secondary" small onClick={openWeightSheet}>
            Gewicht eintragen
          </Button>
        </div>
      </Card>

      <div className="stat-grid" style={{ marginTop: 14 }}>
        <StatCard
          label="Trainingswochen-Streak"
          value={streak === 1 ? "1 Woche" : `${streak} Wochen`}
          hint="Wochen in Folge mit Training"
        />
        <StatCard
          label="Diese Woche"
          value={String(workoutsThisWeek)}
          hint={workoutsThisWeek === 1 ? "Training absolviert" : "Trainings absolviert"}
        />
      </div>

      <SectionHeader title="Schnellaktionen" />
      <div className="quick-actions">
        <button
          type="button"
          className="quick-action"
          onClick={() => navigate("/nutrition/scan")}
        >
          <ScanLine size={22} aria-hidden="true" />
          <span>Scannen</span>
        </button>
        <button
          type="button"
          className="quick-action"
          onClick={() => navigate("/nutrition/meals/add")}
        >
          <Utensils size={22} aria-hidden="true" />
          <span>Mahlzeit</span>
        </button>
        <button type="button" className="quick-action" onClick={openWeightSheet}>
          <Scale size={22} aria-hidden="true" />
          <span>Gewicht</span>
        </button>
        <button
          type="button"
          className="quick-action"
          onClick={() => void addWater(250)}
        >
          <Droplets size={22} aria-hidden="true" />
          <span>Wasser</span>
        </button>
      </div>

      <BottomSheet
        open={waterSheetOpen}
        title="Wasser hinzufügen"
        onClose={() => setWaterSheetOpen(false)}
      >
        <Field label="Menge (ml)" error={waterError}>
          {(id) => (
            <NumberInput
              id={id}
              value={waterInput}
              onChange={(e) => setWaterInput(e.target.value)}
              placeholder="z. B. 330"
            />
          )}
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Button onClick={() => void submitCustomWater()}>Hinzufügen</Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={weightSheetOpen}
        title="Gewicht eintragen"
        onClose={() => setWeightSheetOpen(false)}
      >
        <Field label="Gewicht (kg)" error={weightError}>
          {(id) => (
            <NumberInput
              id={id}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="z. B. 82,5"
            />
          )}
        </Field>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Button onClick={() => void submitWeight()}>Speichern</Button>
        </div>
      </BottomSheet>
    </>
  );
}

interface TodayWorkoutCardProps {
  plan: WorkoutPlan | undefined;
  hasActiveWorkout: boolean;
  starting: boolean;
  onStart: (plan: WorkoutPlan, session: WorkoutPlanSession) => Promise<void>;
  onResume: () => void;
}

function TodayWorkoutCard({
  plan,
  hasActiveWorkout,
  starting,
  onStart,
  onResume,
}: TodayWorkoutCardProps) {
  const navigate = useNavigate();

  if (!plan) {
    return (
      <Card>
        <EmptyState
          icon={Dumbbell}
          title="Noch kein Trainingsplan aktiv."
          text="Wähle eine Vorlage oder erstelle deinen eigenen Plan."
          action={{ label: "Plan auswählen", onClick: () => navigate("/training/plans") }}
        />
      </Card>
    );
  }

  const session = pickSessionForToday(plan);
  if (!session || session.exercises.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Dumbbell}
          title={session ? "Diese Einheit hat noch keine Übungen." : "Dein Plan hat noch keine Einheiten."}
          text={`Bearbeite „${plan.name}“, um loszulegen.`}
          action={{
            label: "Plan bearbeiten",
            onClick: () => navigate(`/training/plans/${plan.id}`),
          }}
        />
      </Card>
    );
  }

  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets, 0);
  const totalRest = session.exercises.reduce((sum, e) => sum + e.restSeconds * e.sets, 0);
  const minutes = estimateSessionMinutes(
    totalSets,
    totalRest > 0 ? totalRest / totalSets : undefined,
  );
  const exerciseCount = session.exercises.length;

  return (
    <Card>
      <span style={cardLabelStyle}>Training</span>
      <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{session.name}</p>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2, marginBottom: 14 }}>
        {exerciseCount} {exerciseCount === 1 ? "Übung" : "Übungen"} · ca. {minutes} Min
      </p>
      {hasActiveWorkout ? (
        <Button onClick={onResume}>Training fortsetzen</Button>
      ) : (
        <Button disabled={starting} onClick={() => void onStart(plan, session)}>
          <Play size={18} aria-hidden="true" />
          {starting ? "Wird gestartet…" : "Training starten"}
        </Button>
      )}
    </Card>
  );
}
