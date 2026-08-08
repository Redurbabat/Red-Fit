import { useLiveQuery } from "dexie-react-hooks";
import { CalendarCheck, Sparkles } from "lucide-react";
import { CoachInsightsCard } from "../../components/coach/CoachInsightsCard";
import { LoadingState } from "../../components/feedback/states";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Card, StatCard } from "../../components/ui/Card";
import { lastLocalDates } from "../../services/calculations/insights";
import {
  buildWeeklyReview,
  type WeeklySuggestion,
} from "../../services/calculations/weeklyReview";
import {
  bodyRepository,
  db,
  goalRepository,
  recoveryRepository,
  workoutLogRepository,
  workoutPlanRepository,
} from "../../services/storage";
import { getLocalDateKey } from "../../utils/dates";

/** Suggestion → German sentence. Rule-based, never invented (§68/§69). */
function suggestionText(s: WeeklySuggestion): string {
  switch (s.kind) {
    case "planSessions":
      return s.open === 1
        ? "Noch 1 geplante Einheit offen — plane sie fest ein."
        : `Noch ${s.open} geplante Einheiten offen — plane sie fest ein.`;
    case "protein":
      return `Protein-Ziel nur an ${s.hitDays} von ${s.trackedDays} Tagen erreicht — proteinreiche Snacks vorbereiten hilft.`;
    case "volumeDrop":
      return `Dein Trainingsvolumen liegt ${Math.abs(s.percent)} % unter der Vorwoche — prüfe, ob das geplant ist (Deload) oder Einheiten fehlen.`;
    case "recovery":
      return `Deine Erholung war diese Woche niedrig (Ø ${String(s.avg).replace(".", ",")}/5) — plane einen zusätzlichen Ruhetag oder mehr Schlaf ein.`;
    case "onTrack":
      return "Alles im Plan — Training, Ernährung und Erholung passen diese Woche. Weiter so!";
  }
}

/**
 * RED Coach (§64): deterministic insights + weekly review. Chat/AI is a
 * possible later surface — nothing here pretends to be intelligent, every
 * statement is computed from logged data.
 */
export default function CoachPage() {
  const today = getLocalDateKey();

  const completedLogs = useLiveQuery(() => workoutLogRepository.listCompleted(120), []);
  const activePlan = useLiveQuery(() => workoutPlanRepository.getActive(), [], null);
  const goal = useLiveQuery(() => goalRepository.getCurrent(), [], null);
  const weekMealLogs = useLiveQuery(
    () => db.mealLogs.where("date").anyOf(lastLocalDates(7, today)).toArray(),
    [today],
  );
  const measurements = useLiveQuery(() => bodyRepository.listNewestFirst(40), []);
  const recoveryLogs = useLiveQuery(() => recoveryRepository.listNewestFirst(14), []);

  const loading =
    !completedLogs ||
    activePlan === null ||
    goal === null ||
    !weekMealLogs ||
    !measurements ||
    !recoveryLogs;

  const review = loading
    ? undefined
    : buildWeeklyReview({
        completedLogs,
        activePlan: activePlan ?? undefined,
        mealLogs: weekMealLogs,
        goal: goal ?? undefined,
        weightsNewestFirst: measurements
          .filter((m) => m.weightKg != null)
          .map((m) => ({ date: m.date, weightKg: m.weightKg! })),
        recoveryLogs,
        today,
      });

  return (
    <>
      <PageHeader title="Coach" subtitle="Transparent und datenbasiert" back backFallback="/more" />

      <SectionHeader title="Heute" />
      <CoachInsightsCard />

      <SectionHeader title="Wochenrückblick" />
      {!review ? (
        <LoadingState rows={3} />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Training"
              value={
                review.training.planned > 0
                  ? `${review.training.done} / ${review.training.planned}`
                  : String(review.training.done)
              }
              hint={review.training.planned > 0 ? "Einheiten diese Woche" : "Einheiten (kein Plan)"}
            />
            {review.volumeDeltaPercent != null ? (
              <StatCard
                label="Volumen"
                value={`${review.volumeDeltaPercent > 0 ? "+" : ""}${review.volumeDeltaPercent} %`}
                hint="vs. Vorwoche"
              />
            ) : null}
            {review.protein ? (
              <StatCard
                label="Protein"
                value={`${review.protein.hitDays} / ${review.protein.trackedDays}`}
                hint="Tage am Ziel"
              />
            ) : null}
            {review.weightDelta7dKg != null ? (
              <StatCard
                label="Gewicht"
                value={`${review.weightDelta7dKg > 0 ? "+" : ""}${String(review.weightDelta7dKg).replace(".", ",")} kg`}
                hint="7 Tage"
              />
            ) : null}
            {review.recoveryAvg != null ? (
              <StatCard
                label="Erholung"
                value={`${String(review.recoveryAvg).replace(".", ",")} / 5`}
                hint="Ø Check-ins"
              />
            ) : null}
          </div>

          <SectionHeader title="Nächste Woche" />
          <Card>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                margin: 0,
                padding: 0,
              }}
            >
              {review.suggestions.map((s) => (
                <li key={s.kind} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <CalendarCheck
                    size={18}
                    color="var(--accent-2)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                    aria-hidden="true"
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>{suggestionText(s)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <Card flat style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Sparkles size={18} color="var(--text-soft)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Alle Aussagen werden aus deinen lokalen Daten berechnet — nichts wird
            erfunden. Eine optionale KI-Unterstützung (nur mit deiner Freigabe,
            nie mit stillen Änderungen) ist für später vorgesehen.
          </p>
        </div>
      </Card>
    </>
  );
}
