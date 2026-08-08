import { useMemo } from "react";
import { SectionHeader } from "../layout/PageHeader";
import { Card } from "../ui/Card";
import type { WorkoutLog } from "../../models";
import { formatDateShortGerman } from "../../utils/dates";
import { formatKg } from "../../utils/numbers";

interface ExerciseWeightChartProps {
  /** Completed workouts, newest first (as delivered by listCompleted). */
  completedLogs: WorkoutLog[];
  exerciseId: string;
  /** Maximum number of data points, oldest → newest (default 12). */
  limit?: number;
}

interface DataPoint {
  date: string;
  maxWeightKg: number;
}

const WIDTH = 320;
const HEIGHT = 140;
const PAD_X = 8;
const PAD_Y = 16;

/** Max completed weight per workout for one exercise, chronological. */
function buildPoints(
  completedLogs: WorkoutLog[],
  exerciseId: string,
  limit: number,
): DataPoint[] {
  const byWorkout: DataPoint[] = [];
  for (const workout of completedLogs) {
    let max = 0;
    for (const exerciseLog of workout.exerciseLogs) {
      if (exerciseLog.exerciseId !== exerciseId) continue;
      for (const set of exerciseLog.setLogs) {
        if (set.completed && set.weightKg > max) max = set.weightKg;
      }
    }
    if (max > 0) byWorkout.push({ date: workout.date, maxWeightKg: max });
  }
  // listCompleted is newest first → reverse to chronological, keep the tail.
  return byWorkout.reverse().slice(-limit);
}

/**
 * "Werde ich stärker?" — Gewichtsverlauf einer Übung als SVG-Linie,
 * gerendert als eigene Sektion nur wenn mindestens zwei Datenpunkte da sind.
 */
export function ExerciseWeightChartSection({
  completedLogs,
  exerciseId,
  limit = 12,
}: ExerciseWeightChartProps) {
  const points = useMemo(
    () => buildPoints(completedLogs, exerciseId, limit),
    [completedLogs, exerciseId, limit],
  );

  if (points.length < 2) return null; // a single dot is no trend — skip

  const values = points.map((p) => p.maxWeightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD_X + (i / (points.length - 1)) * (WIDTH - 2 * PAD_X);
  const y = (v: number) =>
    HEIGHT - PAD_Y - ((v - min) / span) * (HEIGHT - 2 * PAD_Y);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.maxWeightKg).toFixed(1)}`)
    .join(" ");

  return (
    <>
      <SectionHeader title="Gewichtsverlauf" />
      <Card>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          role="img"
          aria-label={`Gewichtsverlauf: von ${formatKg(points[0].maxWeightKg)} auf ${formatKg(points[points.length - 1].maxWeightKg)}`}
        >
          <line
            x1={PAD_X}
            y1={y(max)}
            x2={WIDTH - PAD_X}
            y2={y(max)}
            stroke="var(--border-soft)"
            strokeDasharray="3 4"
          />
          <line
            x1={PAD_X}
            y1={y(min)}
            x2={WIDTH - PAD_X}
            y2={y(min)}
            stroke="var(--border-soft)"
            strokeDasharray="3 4"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle key={p.date + i} cx={x(i)} cy={y(p.maxWeightKg)} r={3.5} fill="var(--accent)">
              <title>{`${formatDateShortGerman(p.date)} · ${formatKg(p.maxWeightKg)}`}</title>
            </circle>
          ))}
          <text x={PAD_X} y={y(max) - 5} fontSize={11} fill="var(--text-soft)">
            {formatKg(max)}
          </text>
          <text x={PAD_X} y={y(min) + 14} fontSize={11} fill="var(--text-soft)">
            {formatKg(min)}
          </text>
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-soft)",
            marginTop: 2,
          }}
        >
          <span>{formatDateShortGerman(points[0].date)}</span>
          <span>{formatDateShortGerman(points[points.length - 1].date)}</span>
        </div>
      </Card>
    </>
  );
}
