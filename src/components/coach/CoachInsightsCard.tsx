import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles } from "lucide-react";
import { buildTodayInsights, lastLocalDates, type Insight } from "../../services/calculations/insights";
import {
  bodyRepository,
  db,
  goalRepository,
  workoutLogRepository,
  workoutPlanRepository,
} from "../../services/storage";
import { getLocalDateKey } from "../../utils/dates";
import { Card } from "../ui/Card";

/** Insight → German sentence. Every statement is backed by logged data (§63). */
function insightText(insight: Insight): string {
  switch (insight.kind) {
    case "proteinAdherence":
      return `Du hast dein Protein-Ziel an ${insight.hitDays} von ${insight.trackedDays} getrackten Tagen erreicht.`;
    case "trainingPace": {
      if (insight.done >= insight.planned) {
        return `Wochenpensum erreicht: ${insight.done} von ${insight.planned} Einheiten. Stark!`;
      }
      const open = insight.planned - insight.done;
      return `Diese Woche ${insight.done} von ${insight.planned} geplanten Einheiten — noch ${open} offen.`;
    }
    case "weightTrend": {
      if (Math.abs(insight.deltaKg) < 0.3) {
        return `Dein Gewichtstrend ist seit ${insight.days} Tagen stabil.`;
      }
      const formatted = `${insight.deltaKg > 0 ? "+" : ""}${String(insight.deltaKg).replace(".", ",")} kg`;
      return `Dein Gewicht: ${formatted} in ${insight.days} Tagen.`;
    }
  }
}

/**
 * Deterministic coach insights for Today (§11): at most two statements,
 * derived from real logs. Renders nothing when there is not enough data —
 * no filler, no invented advice.
 */
export function CoachInsightsCard() {
  const today = getLocalDateKey();

  const weekMealLogs = useLiveQuery(
    () => db.mealLogs.where("date").anyOf(lastLocalDates(7, today)).toArray(),
    [today],
  );
  const goal = useLiveQuery(() => goalRepository.getCurrent(), [], null);
  const activePlan = useLiveQuery(() => workoutPlanRepository.getActive(), [], null);
  const completedLogs = useLiveQuery(() => workoutLogRepository.listCompleted(60), []);
  const measurements = useLiveQuery(() => bodyRepository.listNewestFirst(40), []);

  if (!weekMealLogs || goal === null || activePlan === null || !completedLogs || !measurements) {
    return null;
  }

  const insights = buildTodayInsights({
    mealLogs: weekMealLogs,
    goal: goal ?? undefined,
    completedLogs,
    activePlan: activePlan ?? undefined,
    weightsNewestFirst: measurements
      .filter((m) => m.weightKg != null)
      .map((m) => ({ date: m.date, weightKg: m.weightKg! })),
    today,
  }).slice(0, 2);

  if (insights.length === 0) return null;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Sparkles size={18} color="var(--accent-2)" aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
          Coach
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((insight) => (
          <p key={insight.kind} style={{ fontSize: 15, margin: 0 }}>
            {insightText(insight)}
          </p>
        ))}
      </div>
    </Card>
  );
}
