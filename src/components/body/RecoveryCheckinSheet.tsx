import { useEffect, useState } from "react";
import type { RecoveryLog, RecoveryRating } from "../../models";
import { recoveryRepository } from "../../services/storage";
import { getLocalDateKey } from "../../utils/dates";
import { parseDecimalInput } from "../../utils/numbers";
import { BottomSheet } from "../feedback/Modal";
import { useToast } from "../feedback/ToastProvider";
import { Button } from "../ui/Button";
import { Field, NumberInput, SegmentedControl } from "../ui/inputs";

type RatingKey = "sleepQuality" | "energy" | "stress" | "soreness";

/** Every dial reads "5 = optimal" — the anchors make the direction obvious. */
const RATING_ROWS: { key: RatingKey; label: string; low: string; high: string }[] = [
  { key: "sleepQuality", label: "Schlafqualität", low: "sehr schlecht", high: "sehr gut" },
  { key: "energy", label: "Energie", low: "leer", high: "voll da" },
  { key: "stress", label: "Stress", low: "sehr gestresst", high: "entspannt" },
  { key: "soreness", label: "Muskelkater", low: "stark", high: "keiner" },
];

const RATING_OPTIONS = ["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: v }));

interface RecoveryCheckinSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save with the stored log. */
  onSaved?: (log: RecoveryLog) => void;
}

/** Daily recovery check-in (§95): four dials, optional sleep hours, done. */
export function RecoveryCheckinSheet({ open, onClose, onSaved }: RecoveryCheckinSheetProps) {
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<Record<RatingKey, RecoveryRating>>({
    sleepQuality: 3,
    energy: 3,
    stress: 3,
    soreness: 3,
  });
  const [sleepHoursInput, setSleepHoursInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Editing an existing check-in starts from today's stored values.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    recoveryRepository
      .getByDate(getLocalDateKey())
      .then((existing) => {
        if (cancelled || !existing) return;
        setRatings({
          sleepQuality: existing.sleepQuality,
          energy: existing.energy,
          stress: existing.stress,
          soreness: existing.soreness,
        });
        setSleepHoursInput(existing.sleepHours != null ? String(existing.sleepHours).replace(".", ",") : "");
      })
      .catch(() => {
        /* fresh defaults are fine */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const parsedHours = parseDecimalInput(sleepHoursInput.trim());
      const sleepHours =
        parsedHours != null && parsedHours >= 0 && parsedHours <= 24 ? parsedHours : undefined;
      const log = await recoveryRepository.upsertForDate(getLocalDateKey(), {
        ...ratings,
        sleepHours,
      });
      showToast("Check-in gespeichert.");
      onSaved?.(log);
      onClose();
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} title="Recovery Check-in" onClose={onClose}>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 14px" }}>
        Wie erholt bist du heute? 1 bis 5 — höher ist besser.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {RATING_ROWS.map((row) => (
          <div key={row.key} className="field">
            <span className="field__label">
              {row.label}{" "}
              <span style={{ fontWeight: 400, color: "var(--text-soft)" }}>
                (1 = {row.low} · 5 = {row.high})
              </span>
            </span>
            <SegmentedControl
              options={RATING_OPTIONS}
              value={String(ratings[row.key])}
              onChange={(value) =>
                setRatings((r) => ({ ...r, [row.key]: Number(value) as RecoveryRating }))
              }
              ariaLabel={row.label}
            />
          </div>
        ))}
        <Field label="Schlafdauer (Stunden, optional)">
          {(id) => (
            <NumberInput
              id={id}
              value={sleepHoursInput}
              onChange={(e) => setSleepHoursInput(e.target.value)}
              placeholder="z. B. 7,5"
            />
          )}
        </Field>
        <Button disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Wird gespeichert…" : "Check-in speichern"}
        </Button>
      </div>
    </BottomSheet>
  );
}
