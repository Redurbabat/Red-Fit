import { useLiveQuery } from "dexie-react-hooks";
import { HeartPulse } from "lucide-react";
import { useState } from "react";
import { calculateReadiness, readinessVerdict } from "../../services/calculations/readiness";
import { recoveryRepository, workoutLogRepository } from "../../services/storage";
import { getLocalDateKey } from "../../utils/dates";
import { describeReadinessFactor } from "../../utils/labels";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { RecoveryCheckinSheet } from "./RecoveryCheckinSheet";

/** Score color: green when ready, orange mid, red when recovery is needed. */
function scoreColor(score: number): string {
  if (score >= 65) return "var(--success)";
  if (score >= 45) return "var(--accent-2)";
  return "var(--danger)";
}

/**
 * Self-contained readiness card (§11/§12): shows the explainable score after
 * today's check-in, otherwise invites to check in. Used on Today and Körper.
 */
export function ReadinessSection({ compact = false }: { compact?: boolean }) {
  const [checkinOpen, setCheckinOpen] = useState(false);
  const today = getLocalDateKey();

  const recovery = useLiveQuery(() => recoveryRepository.getByDate(today), [today], null);
  const completedLogs = useLiveQuery(() => workoutLogRepository.listCompleted(30), []);

  // null = loading distinguishable from "no check-in yet" (undefined).
  if (recovery === null) return null;

  const readiness = calculateReadiness(recovery, completedLogs ?? [], today);

  return (
    <>
      <Card>
        {readiness ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: scoreColor(readiness.score),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {readiness.score}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                {readinessVerdict(readiness.score)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {readiness.factors.map((factor) => {
                  const text = describeReadinessFactor(factor);
                  if (!text) return null;
                  return (
                    <span
                      key={factor.key}
                      className="chip"
                      style={{
                        fontSize: 12,
                        color: factor.delta > 0 ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {factor.delta > 0 ? "+" : "−"} {text}
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCheckinOpen(true)}
                style={{
                  marginTop: 8,
                  minHeight: 44,
                  padding: 0,
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Check-in bearbeiten
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HeartPulse size={26} color="var(--accent)" aria-hidden="true" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 15 }}>Wie erholt bist du heute?</strong>
              {!compact ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Kurzer Check-in — dein Readiness-Score zeigt, wie hart du heute
                  trainieren kannst.
                </p>
              ) : null}
            </div>
            <Button variant="secondary" autoWidth onClick={() => setCheckinOpen(true)}>
              Check-in
            </Button>
          </div>
        )}
      </Card>
      <RecoveryCheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} />
    </>
  );
}
