import { useState } from "react";
import { BottomSheet } from "../feedback/Modal";
import { SegmentedControl } from "../ui/inputs";
import { calculatePlates } from "../../services/calculations/plates";
import { formatKg } from "../../utils/numbers";

interface PlateCalculatorSheetProps {
  open: boolean;
  targetKg: number;
  onClose: () => void;
}

/** Plate heights scale with weight so the stack reads like a real bar. */
function plateHeight(kg: number): number {
  if (kg >= 25) return 84;
  if (kg >= 20) return 76;
  if (kg >= 15) return 64;
  if (kg >= 10) return 52;
  if (kg >= 5) return 40;
  if (kg >= 2.5) return 32;
  return 26;
}

function plateColor(kg: number): string {
  if (kg >= 25) return "var(--accent)";
  if (kg >= 20) return "var(--info)";
  if (kg >= 15) return "var(--warning)";
  if (kg >= 10) return "var(--success)";
  return "var(--text-soft)";
}

/**
 * "Was muss ich auflegen?" — plate breakdown per side for the current
 * set weight, with a visual bar. Bar weight is switchable (20/15/10 kg).
 */
export function PlateCalculatorSheet({ open, targetKg, onClose }: PlateCalculatorSheetProps) {
  const [barKg, setBarKg] = useState<"20" | "15" | "10">("20");
  const breakdown = calculatePlates(targetKg, Number(barKg));

  return (
    <BottomSheet open={open} title="Scheibenrechner" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SegmentedControl
          ariaLabel="Stangengewicht"
          options={[
            { value: "20", label: "Stange 20 kg" },
            { value: "15", label: "15 kg" },
            { value: "10", label: "10 kg" },
          ]}
          value={barKg}
          onChange={setBarKg}
        />

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Ziel {formatKg(targetKg)}
            {breakdown.missingKg > 0 ? (
              <> · ladbar {formatKg(breakdown.achievableKg)}</>
            ) : null}
          </p>
        </div>

        {/* Visual: one side of the bar. */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            minHeight: 100,
          }}
        >
          <div
            style={{
              width: 90,
              height: 8,
              background: "var(--surface-3)",
              borderRadius: 4,
            }}
          />
          {breakdown.perSide.map((plate, i) => (
            <div
              key={i}
              style={{
                width: plate >= 10 ? 14 : 10,
                height: plateHeight(plate),
                background: plateColor(plate),
                borderRadius: 4,
              }}
            />
          ))}
          <div
            style={{
              width: 26,
              height: 8,
              background: "var(--surface-3)",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ textAlign: "center" }}>
          {breakdown.perSide.length === 0 ? (
            <p style={{ fontSize: 15 }}>
              Leere Stange — {formatKg(breakdown.barKg)}.
            </p>
          ) : (
            <p style={{ fontSize: 17, fontWeight: 700 }}>
              Pro Seite:{" "}
              {breakdown.perSide
                .map((p) => String(p).replace(".", ","))
                .join(" + ")}{" "}
              kg
            </p>
          )}
          {breakdown.missingKg > 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {formatKg(breakdown.missingKg)} nicht ladbar mit Standardscheiben
              (kleinste 1,25 kg).
            </p>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}
