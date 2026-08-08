import { useLiveQuery } from "dexie-react-hooks";
import { Dumbbell, Flame, Scale, Trophy, Utensils } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, LoadingState } from "../../components/feedback/states";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, StatCard } from "../../components/ui/Card";
import { calculateAverages } from "../../services/calculations/nutrition";
import {
  calculateTrainingStats,
  calculateWeightTrend,
  findTopExercises,
} from "../../services/calculations/progress";
import {
  calculateTrainingWeekStreak,
  findExerciseRecords,
} from "../../services/calculations/workout";
import { bodyRepository, db } from "../../services/storage";
import {
  addDays,
  formatDateShortGerman,
  formatDurationLong,
  getLocalDateKey,
} from "../../utils/dates";
import { formatGrams, formatKcal, formatKg } from "../../utils/numbers";

const MAX_CHART_POINTS = 12;
const TOP_EXERCISE_COUNT = 5;
const RECORD_COUNT = 5;

/** "12.500 kg" — whole kilograms with German thousands separators. */
function formatVolumeKg(volumeKg: number): string {
  return `${Math.round(volumeKg).toLocaleString("de-DE")} kg`;
}

/** Neutral +/- formatting for the weight change — deliberately no judgement. */
function formatWeightChange(changeKg: number): string {
  if (changeKg > 0) return `+${formatKg(changeKg)}`;
  if (changeKg < 0) return `-${formatKg(Math.abs(changeKg))}`;
  return `±${formatKg(0)}`;
}

interface WeightPoint {
  date: string;
  weightKg: number;
}

const CHART_W = 320;
const CHART_H = 160;
const PAD_LEFT = 42;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

/** Simple self-drawn SVG line chart — no chart library, per project rules. */
function WeightChart({ points }: { points: WeightPoint[] }) {
  const weights = points.map((p) => p.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  // Pad the value range so the line never touches the chart edges.
  const valuePad = Math.max((max - min) * 0.15, 0.5);
  const lo = min - valuePad;
  const hi = max + valuePad;
  const innerW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const xFor = (i: number) =>
    points.length === 1
      ? PAD_LEFT + innerW / 2
      : PAD_LEFT + (i / (points.length - 1)) * innerW;
  const yFor = (w: number) => PAD_TOP + (1 - (w - lo) / (hi - lo)) * innerH;
  const line = points
    .map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.weightKg).toFixed(1)}`)
    .join(" ");
  const gridYs =
    max === min
      ? [yFor(max)]
      : [yFor(max), yFor((min + max) / 2), yFor(min)];
  const label = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 });

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`Gewichtsverlauf: ${points.length} Messungen zwischen ${label(min)} und ${label(max)} kg`}
    >
      {gridYs.map((y) => (
        <line
          key={y}
          x1={PAD_LEFT}
          x2={CHART_W - PAD_RIGHT}
          y1={y}
          y2={y}
          stroke="var(--border-soft)"
          strokeWidth={1}
        />
      ))}
      <text
        x={PAD_LEFT - 6}
        y={yFor(max) + 4}
        textAnchor="end"
        fontSize={12}
        fill="var(--text-soft)"
      >
        {label(max)}
      </text>
      {max !== min ? (
        <text
          x={PAD_LEFT - 6}
          y={yFor(min) + 4}
          textAnchor="end"
          fontSize={12}
          fill="var(--text-soft)"
        >
          {label(min)}
        </text>
      ) : null}
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={`${p.date}-${i}`}
          cx={xFor(i)}
          cy={yFor(p.weightKg)}
          r={3}
          fill="var(--accent)"
        />
      ))}
      <text x={PAD_LEFT} y={CHART_H - 8} fontSize={12} fill="var(--text-soft)">
        {formatDateShortGerman(points[0].date)}
      </text>
      <text
        x={CHART_W - PAD_RIGHT}
        y={CHART_H - 8}
        textAnchor="end"
        fontSize={12}
        fill="var(--text-soft)"
      >
        {formatDateShortGerman(points[points.length - 1].date)}
      </text>
    </svg>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const today = getLocalDateKey();

  const completedLogs = useLiveQuery(async () => {
    const logs = await db.workoutLogs.where("status").equals("completed").toArray();
    logs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return logs;
  }, []);
  const measurements = useLiveQuery(() => bodyRepository.listNewestFirst(), []);
  const recentMealLogs = useLiveQuery(
    () =>
      db.mealLogs
        .where("date")
        .between(addDays(today, -6), today, true, true)
        .toArray(),
    [today],
  );

  const weightTrend = useMemo(
    () => (measurements ? calculateWeightTrend(measurements) : undefined),
    [measurements],
  );
  const weightPoints = useMemo<WeightPoint[]>(() => {
    if (!measurements) return [];
    // Newest-first → take the latest N with a weight, then flip to chronological.
    return measurements
      .flatMap((m) => (m.weightKg != null ? [{ date: m.date, weightKg: m.weightKg }] : []))
      .slice(0, MAX_CHART_POINTS)
      .reverse();
  }, [measurements]);

  const trainingStats = useMemo(
    () => (completedLogs ? calculateTrainingStats(completedLogs) : undefined),
    [completedLogs],
  );
  const weekStreak = useMemo(
    () => (completedLogs ? calculateTrainingWeekStreak(completedLogs) : 0),
    [completedLogs],
  );
  const topExercises = useMemo(
    () => (completedLogs ? findTopExercises(completedLogs, TOP_EXERCISE_COUNT) : []),
    [completedLogs],
  );
  const records = useMemo(() => {
    if (!completedLogs) return [];
    return [...findExerciseRecords(completedLogs).values()]
      .sort((a, b) => b.maxWeightKg - a.maxWeightKg)
      .slice(0, RECORD_COUNT);
  }, [completedLogs]);

  const nutritionAverages = useMemo(
    () => (recentMealLogs ? calculateAverages(recentMealLogs) : undefined),
    [recentMealLogs],
  );

  return (
    <>
      <PageHeader title="Fortschritt" />

      <SectionHeader title="Körper" />
      {measurements === undefined ? (
        <LoadingState rows={2} />
      ) : measurements.length === 0 ? (
        <Card>
          <EmptyState
            icon={Scale}
            title="Dein Fortschritt erscheint hier, sobald du Daten erfasst."
            text="Erfasse Gewicht und Körpermaße, um deine Entwicklung zu verfolgen."
            action={{
              label: "Körperwerte erfassen",
              onClick: () => navigate("/progress/body"),
            }}
          />
        </Card>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Aktuelles Gewicht"
              value={weightTrend?.currentKg != null ? formatKg(weightTrend.currentKg) : "–"}
            />
            <StatCard
              label="Veränderung"
              value={
                weightTrend?.changeKg != null
                  ? formatWeightChange(weightTrend.changeKg)
                  : "–"
              }
              hint="seit letzter Messung"
            />
          </div>
          <Card style={{ marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
              Gewichtsverlauf
            </span>
            {weightPoints.length >= 2 ? (
              <div style={{ marginTop: 10 }}>
                <WeightChart points={weightPoints} />
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>
                Ab zwei Gewichtseinträgen siehst du hier deinen Verlauf.
              </p>
            )}
          </Card>
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" onClick={() => navigate("/progress/body")}>
              Körperwerte
            </Button>
          </div>
        </>
      )}

      <SectionHeader title="Training" />
      {completedLogs === undefined || trainingStats === undefined ? (
        <LoadingState rows={2} />
      ) : completedLogs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Dumbbell}
            title="Noch keine abgeschlossenen Workouts"
            text="Deine Trainingsstatistiken erscheinen hier nach dem ersten abgeschlossenen Workout."
          />
        </Card>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Diese Woche"
              value={String(trainingStats.workoutsThisWeek)}
              hint="Trainings"
            />
            <StatCard
              label="Letzte 30 Tage"
              value={String(trainingStats.workoutsLast30Days)}
              hint="Trainings"
            />
            <StatCard
              label="Gesamtvolumen"
              value={formatVolumeKg(trainingStats.totalVolumeKg)}
            />
            <StatCard
              label="Ø Dauer"
              value={formatDurationLong(trainingStats.avgDurationSeconds)}
            />
          </div>
          <div className="stat-card" style={{ marginTop: 10 }}>
            <span className="stat-card__label">Trainingswochen-Streak</span>
            <span
              className="stat-card__value"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Flame size={22} color="var(--accent-2)" aria-hidden="true" />
              {weekStreak} {weekStreak === 1 ? "Woche" : "Wochen"}
            </span>
            <span className="stat-card__hint">
              Wochen in Folge mit mindestens einem Training
            </span>
          </div>
        </>
      )}

      {topExercises.length > 0 ? (
        <>
          <SectionHeader title="Kraft" />
          <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
            {topExercises.map((exercise) => (
              <div key={exercise.exerciseId} className="list-row">
                <div className="list-row__body">
                  <div className="list-row__title">{exercise.exerciseName}</div>
                  <div className="list-row__subtitle">
                    Max: {formatKg(exercise.maxWeightKg)} · Volumen:{" "}
                    {formatVolumeKg(exercise.totalVolumeKg)}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </>
      ) : null}

      {records.length > 0 ? (
        <>
          <SectionHeader title="Rekorde" />
          {records.map((record) => (
            <Card
              key={record.exerciseId}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <Trophy size={22} color="var(--carbs)" aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600 }}>{record.exerciseName}</p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
                  {formatKg(record.maxWeightKg)} × {record.maxRepsAtMaxWeight}
                </p>
              </div>
            </Card>
          ))}
        </>
      ) : null}

      <SectionHeader title="Ernährung" />
      {recentMealLogs === undefined || nutritionAverages === undefined ? (
        <LoadingState rows={2} />
      ) : nutritionAverages.daysWithLogs === 0 ? (
        <Card>
          <EmptyState
            icon={Utensils}
            title="Noch keine Ernährungsdaten"
            text="Erfasse Mahlzeiten, um deine 7-Tage-Durchschnitte zu sehen."
          />
        </Card>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Ø Kalorien (7 Tage)"
              value={formatKcal(nutritionAverages.avgKcal)}
            />
            <StatCard
              label="Ø Protein (7 Tage)"
              value={formatGrams(nutritionAverages.avgProtein)}
            />
          </div>
          <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 8 }}>
            Basierend auf {nutritionAverages.daysWithLogs}{" "}
            {nutritionAverages.daysWithLogs === 1 ? "Tag" : "Tagen"} mit Einträgen.
          </p>
        </>
      )}
    </>
  );
}
