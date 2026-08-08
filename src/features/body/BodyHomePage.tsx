import { useLiveQuery } from "dexie-react-hooks";
import { ChartLine, ChevronRight, Ruler, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReadinessSection } from "../../components/body/ReadinessSection";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Card, StatCard } from "../../components/ui/Card";
import {
  calculateWeightChangeOverDays,
  calculateWeightTrend,
} from "../../services/calculations/progress";
import { bodyRepository } from "../../services/storage";
import { formatDateShortGerman, getLocalDateKey } from "../../utils/dates";
import { formatKg } from "../../utils/numbers";

/** "-0,4 kg" with sign, or "±0 kg". */
function formatDeltaKg(delta: number): string {
  if (delta === 0) return "±0 kg";
  return `${delta > 0 ? "+" : ""}${formatKg(delta)}`;
}

/**
 * Körper home (§43): weight trend, body status, recovery/readiness — the
 * fourth 2031 tab. Detailed logging lives in Messwerte, training analytics
 * keep their own page under Fortschritt.
 */
export default function BodyHomePage() {
  const navigate = useNavigate();
  const today = getLocalDateKey();
  const measurements = useLiveQuery(() => bodyRepository.listNewestFirst(), []);

  const trend = calculateWeightTrend(measurements ?? []);
  const change30d = calculateWeightChangeOverDays(measurements ?? [], 30, today);
  const latestWeightEntry = (measurements ?? []).find((m) => m.weightKg != null);

  // Latest value per measurement type — entries are append-only.
  const latest = {
    waist: (measurements ?? []).find((m) => m.waistCm != null),
    bodyFat: (measurements ?? []).find((m) => m.bodyFatPercent != null),
    chest: (measurements ?? []).find((m) => m.chestCm != null),
    arm: (measurements ?? []).find((m) => m.armCm != null),
  };
  const hasBodyStatus = Boolean(
    latest.waist || latest.bodyFat || latest.chest || latest.arm,
  );

  return (
    <>
      <PageHeader title="Körper" subtitle="Gewicht, Maße, Erholung" />

      <SectionHeader title="Readiness" />
      <ReadinessSection />

      <SectionHeader title="Gewicht" />
      {trend.currentKg != null ? (
        <div className="stat-grid">
          <StatCard
            label="Aktuell"
            value={formatKg(trend.currentKg)}
            hint={
              latestWeightEntry ? formatDateShortGerman(latestWeightEntry.date) : undefined
            }
          />
          <StatCard
            label="30 Tage"
            value={change30d != null ? formatDeltaKg(change30d) : "–"}
            hint={change30d != null ? "Veränderung" : "zu wenige Messungen"}
          />
        </div>
      ) : (
        <Card>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
            Noch kein Gewicht erfasst. Trage dein erstes Gewicht unter „Messwerte &
            Verlauf“ ein — oder über das Plus unten rechts.
          </p>
        </Card>
      )}

      {hasBodyStatus ? (
        <>
          <SectionHeader title="Körperstatus" />
          <div className="stat-grid">
            {latest.waist ? (
              <StatCard label="Taille" value={`${latest.waist.waistCm} cm`} />
            ) : null}
            {latest.bodyFat ? (
              <StatCard label="Körperfett" value={`${latest.bodyFat.bodyFatPercent} %`} />
            ) : null}
            {latest.chest ? (
              <StatCard label="Brust" value={`${latest.chest.chestCm} cm`} />
            ) : null}
            {latest.arm ? (
              <StatCard label="Arm" value={`${latest.arm.armCm} cm`} />
            ) : null}
          </div>
        </>
      ) : null}

      <SectionHeader title="Bereiche" />
      <Card>
        <button
          type="button"
          className="list-row"
          onClick={() => navigate("/body/measurements")}
        >
          <Scale size={20} color="var(--accent)" aria-hidden="true" />
          <span className="list-row__body">
            <span className="list-row__title">Messwerte & Verlauf</span>
            <span className="list-row__subtitle">
              Gewicht und Maße erfassen, Diagramme ansehen
            </span>
          </span>
          <span className="list-row__trailing">
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </button>
        <button type="button" className="list-row" onClick={() => navigate("/progress")}>
          <ChartLine size={20} color="var(--accent)" aria-hidden="true" />
          <span className="list-row__body">
            <span className="list-row__title">Trainings-Fortschritt</span>
            <span className="list-row__subtitle">
              Volumen, Rekorde, Trainings-Heatmap
            </span>
          </span>
          <span className="list-row__trailing">
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          className="list-row"
          onClick={() => navigate("/body/measurements")}
        >
          <Ruler size={20} color="var(--accent)" aria-hidden="true" />
          <span className="list-row__body">
            <span className="list-row__title">Neue Messung</span>
            <span className="list-row__subtitle">Gewicht, Taille, Körperfett …</span>
          </span>
          <span className="list-row__trailing">
            <ChevronRight size={18} aria-hidden="true" />
          </span>
        </button>
      </Card>
    </>
  );
}
