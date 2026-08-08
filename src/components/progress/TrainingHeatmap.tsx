import { useMemo } from "react";
import type { WorkoutLog } from "../../models";
import {
  addDays,
  formatDateShortGerman,
  getLocalDateKey,
  getWeekStart,
} from "../../utils/dates";

interface TrainingHeatmapProps {
  /** Completed workout logs (any order). */
  logs: WorkoutLog[];
  /** Number of week columns to show (default 16 ≈ 4 Monate). */
  weeks?: number;
}

const CELL = 14;
const GAP = 3;
const DAY_LABELS = ["Mo", "", "Mi", "", "Fr", "", "So"];

/** Cell color by workout count that day — accent ramps up with activity. */
function cellColor(count: number): string {
  if (count <= 0) return "var(--surface-3)";
  if (count === 1) return "color-mix(in srgb, var(--accent) 55%, var(--surface-3))";
  return "var(--accent)";
}

/**
 * Activity grid over the last weeks: one column per calendar week (Monday
 * based), one row per weekday. Pure SVG — no chart library.
 */
export function TrainingHeatmap({ logs, weeks = 16 }: TrainingHeatmapProps) {
  const { columns, totalDays } = useMemo(() => {
    const countByDate = new Map<string, number>();
    for (const log of logs) {
      if (log.status !== "completed") continue;
      countByDate.set(log.date, (countByDate.get(log.date) ?? 0) + 1);
    }
    const today = getLocalDateKey();
    const currentWeekStart = getWeekStart(today);
    const cols: { weekStart: string; days: { date: string; count: number }[] }[] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = addDays(currentWeekStart, -7 * w);
      cols.push({
        weekStart,
        days: Array.from({ length: 7 }, (_, d) => {
          const date = addDays(weekStart, d);
          return { date, count: date > today ? -1 : (countByDate.get(date) ?? 0) };
        }),
      });
    }
    const activeDays = [...countByDate.keys()].filter(
      (date) => date >= cols[0].weekStart && date <= today,
    ).length;
    return { columns: cols, totalDays: activeDays };
  }, [logs, weeks]);

  const width = weeks * (CELL + GAP) + 28;
  const height = 7 * (CELL + GAP) + 4;

  return (
    <div>
      <div style={{ overflowX: "auto" }} aria-hidden="true">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", marginLeft: "auto" }}
        >
          {DAY_LABELS.map((label, d) =>
            label ? (
              <text
                key={d}
                x={0}
                y={d * (CELL + GAP) + CELL - 3}
                fontSize={10}
                fill="var(--text-soft)"
              >
                {label}
              </text>
            ) : null,
          )}
          {columns.map((col, c) =>
            col.days.map((day, d) =>
              day.count >= 0 ? (
                <rect
                  key={day.date}
                  x={28 + c * (CELL + GAP)}
                  y={d * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={4}
                  fill={cellColor(day.count)}
                >
                  <title>
                    {formatDateShortGerman(day.date)} ·{" "}
                    {day.count === 1 ? "1 Training" : `${day.count} Trainings`}
                  </title>
                </rect>
              ) : null,
            ),
          )}
        </svg>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
        {totalDays === 1 ? "1 Trainingstag" : `${totalDays} Trainingstage`} in den
        letzten {weeks} Wochen
      </p>
    </div>
  );
}
