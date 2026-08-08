import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Scale, Trash2 } from "lucide-react";
import { useState } from "react";
import { BottomSheet, ConfirmDialog } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Field, NumberInput, TextInput } from "../../../components/ui/inputs";
import type { BodyMeasurement } from "../../../models";
import { bodyRepository } from "../../../services/storage";
import { formatDateGerman, getLocalDateKey } from "../../../utils/dates";
import { formatKg, parseDecimalInput } from "../../../utils/numbers";

interface FormValues {
  date: string;
  weight: string;
  waist: string;
  chest: string;
  arm: string;
  leg: string;
  bodyFat: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormValues | "form", string>>;

interface ParsedMeasurement {
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  legCm?: number;
  bodyFatPercent?: number;
  notes?: string;
  /** True when weight is the only value — used for the toast wording. */
  onlyWeight: boolean;
}

function emptyValues(): FormValues {
  return {
    date: getLocalDateKey(),
    weight: "",
    waist: "",
    chest: "",
    arm: "",
    leg: "",
    bodyFat: "",
    notes: "",
  };
}

/** Number → input string with German decimal comma ("80.5" → "80,5"). */
function numberToInput(value?: number): string {
  return value == null ? "" : String(value).replace(".", ",");
}

function valuesFromMeasurement(m: BodyMeasurement): FormValues {
  return {
    date: m.date,
    weight: numberToInput(m.weightKg),
    waist: numberToInput(m.waistCm),
    chest: numberToInput(m.chestCm),
    arm: numberToInput(m.armCm),
    leg: numberToInput(m.legCm),
    bodyFat: numberToInput(m.bodyFatPercent),
    notes: m.notes ?? "",
  };
}

function validate(values: FormValues): { errors: FormErrors; parsed?: ParsedMeasurement } {
  const errors: FormErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    errors.date = "Bitte wähle ein Datum.";
  }

  const parseField = (raw: string, key: keyof FormValues): number | undefined => {
    const trimmed = raw.trim();
    if (trimmed === "") return undefined;
    const parsed = parseDecimalInput(trimmed);
    if (parsed == null) {
      errors[key] = "Bitte gib eine gültige Zahl ein.";
      return undefined;
    }
    if (parsed < 0) {
      errors[key] = "Der Wert darf nicht negativ sein.";
      return undefined;
    }
    return parsed;
  };

  const weightKg = parseField(values.weight, "weight");
  const waistCm = parseField(values.waist, "waist");
  const chestCm = parseField(values.chest, "chest");
  const armCm = parseField(values.arm, "arm");
  const legCm = parseField(values.leg, "leg");
  const bodyFatPercent = parseField(values.bodyFat, "bodyFat");
  if (bodyFatPercent != null && bodyFatPercent > 100) {
    errors.bodyFat = "Bitte gib einen Wert zwischen 0 und 100 ein.";
  }

  const valueCount = [weightKg, waistCm, chestCm, armCm, legCm, bodyFatPercent].filter(
    (v) => v != null,
  ).length;
  if (valueCount === 0 && Object.keys(errors).length === 0) {
    errors.form = "Bitte gib mindestens einen Wert ein.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  const notes = values.notes.trim();
  return {
    errors,
    parsed: {
      date: values.date,
      weightKg,
      waistCm,
      chestCm,
      armCm,
      legCm,
      bodyFatPercent,
      notes: notes === "" ? undefined : notes,
      onlyWeight: weightKg != null && valueCount === 1,
    },
  };
}

/** "82,9 cm" style centimetre formatting (no cm helper in utils/numbers). */
function formatCm(value: number): string {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} cm`;
}

/** "Gewicht 82,9 kg · Bauch 84 cm · Körperfett 18 %" — only the set values. */
function measurementSummary(m: BodyMeasurement): string {
  const parts: string[] = [];
  if (m.weightKg != null) parts.push(`Gewicht ${formatKg(m.weightKg)}`);
  if (m.waistCm != null) parts.push(`Bauch ${formatCm(m.waistCm)}`);
  if (m.chestCm != null) parts.push(`Brust ${formatCm(m.chestCm)}`);
  if (m.armCm != null) parts.push(`Arm ${formatCm(m.armCm)}`);
  if (m.legCm != null) parts.push(`Bein ${formatCm(m.legCm)}`);
  if (m.bodyFatPercent != null) {
    parts.push(
      `Körperfett ${m.bodyFatPercent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`,
    );
  }
  return parts.join(" · ");
}

interface MeasurementFieldsProps {
  values: FormValues;
  errors: FormErrors;
  onChange: (patch: Partial<FormValues>) => void;
}

/** Shared field set for the create card and the edit bottom sheet. */
function MeasurementFields({ values, errors, onChange }: MeasurementFieldsProps) {
  return (
    <>
      <Field label="Datum" error={errors.date}>
        {(id) => (
          <TextInput
            id={id}
            type="date"
            value={values.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        )}
      </Field>
      <Field label="Gewicht (kg)" error={errors.weight}>
        {(id) => (
          <NumberInput
            id={id}
            value={values.weight}
            placeholder="z. B. 80,5"
            onChange={(e) => onChange({ weight: e.target.value })}
          />
        )}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Bauch (cm)" error={errors.waist}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.waist}
              placeholder="z. B. 84"
              onChange={(e) => onChange({ waist: e.target.value })}
            />
          )}
        </Field>
        <Field label="Brust (cm)" error={errors.chest}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.chest}
              placeholder="z. B. 100"
              onChange={(e) => onChange({ chest: e.target.value })}
            />
          )}
        </Field>
        <Field label="Arm (cm)" error={errors.arm}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.arm}
              placeholder="z. B. 38"
              onChange={(e) => onChange({ arm: e.target.value })}
            />
          )}
        </Field>
        <Field label="Bein (cm)" error={errors.leg}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.leg}
              placeholder="z. B. 58"
              onChange={(e) => onChange({ leg: e.target.value })}
            />
          )}
        </Field>
      </div>
      <Field label="Körperfett (%)" error={errors.bodyFat}>
        {(id) => (
          <NumberInput
            id={id}
            value={values.bodyFat}
            placeholder="z. B. 18"
            onChange={(e) => onChange({ bodyFat: e.target.value })}
          />
        )}
      </Field>
      <Field label="Notiz" error={errors.notes}>
        {(id) => (
          <TextInput
            id={id}
            value={values.notes}
            placeholder="Optional"
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        )}
      </Field>
    </>
  );
}

export default function BodyPage() {
  const { showToast } = useToast();

  const measurements = useLiveQuery(() => bodyRepository.listNewestFirst(), []);

  const [form, setForm] = useState<FormValues>(emptyValues);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [editForm, setEditForm] = useState<FormValues>(emptyValues);
  const [editErrors, setEditErrors] = useState<FormErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<BodyMeasurement | null>(null);

  async function handleCreate() {
    if (saving) return;
    const { errors, parsed } = validate(form);
    setFormErrors(errors);
    if (!parsed) return;
    setSaving(true);
    try {
      // Append-only: a new measurement is always created, never overwritten.
      await bodyRepository.create({
        date: parsed.date,
        weightKg: parsed.weightKg,
        waistCm: parsed.waistCm,
        chestCm: parsed.chestCm,
        armCm: parsed.armCm,
        legCm: parsed.legCm,
        bodyFatPercent: parsed.bodyFatPercent,
        notes: parsed.notes,
      });
      showToast(parsed.onlyWeight ? "Gewicht gespeichert." : "Messung gespeichert.");
      setForm({ ...emptyValues(), date: form.date });
      setFormErrors({});
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(measurement: BodyMeasurement) {
    setEditing(measurement);
    setEditForm(valuesFromMeasurement(measurement));
    setEditErrors({});
  }

  async function handleEditSave() {
    if (!editing) return;
    const { errors, parsed } = validate(editForm);
    setEditErrors(errors);
    if (!parsed) return;
    try {
      // Explicit undefined clears a value the user removed in the sheet.
      await bodyRepository.update(editing.id, {
        date: parsed.date,
        weightKg: parsed.weightKg,
        waistCm: parsed.waistCm,
        chestCm: parsed.chestCm,
        armCm: parsed.armCm,
        legCm: parsed.legCm,
        bodyFatPercent: parsed.bodyFatPercent,
        notes: parsed.notes,
      });
      showToast("Messung aktualisiert.");
      setEditing(null);
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await bodyRepository.delete(deleteTarget.id);
      showToast("Gelöscht.");
    } catch {
      showToast("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <PageHeader back title="Körperwerte" />

      <Card>
        <MeasurementFields
          values={form}
          errors={formErrors}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />
        {formErrors.form ? (
          <p className="field__error" style={{ marginBottom: 10 }}>
            {formErrors.form}
          </p>
        ) : null}
        <Button onClick={handleCreate} disabled={saving}>
          Speichern
        </Button>
      </Card>

      <SectionHeader title="Verlauf" />
      {measurements === undefined ? (
        <LoadingState rows={3} />
      ) : measurements.length === 0 ? (
        <Card>
          <EmptyState
            icon={Scale}
            title="Noch keine Messungen"
            text="Deine erste Messung erscheint hier, sobald du sie gespeichert hast."
          />
        </Card>
      ) : (
        measurements.map((measurement) => (
          <Card key={measurement.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600 }}>{formatDateGerman(measurement.date)}</p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
                  {measurementSummary(measurement) || "Keine Werte erfasst"}
                </p>
                {measurement.notes ? (
                  <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 4 }}>
                    {measurement.notes}
                  </p>
                ) : null}
              </div>
              <IconButton label="Messung bearbeiten" onClick={() => openEdit(measurement)}>
                <Pencil size={18} />
              </IconButton>
              <IconButton label="Messung löschen" onClick={() => setDeleteTarget(measurement)}>
                <Trash2 size={18} color="var(--danger)" />
              </IconButton>
            </div>
          </Card>
        ))
      )}

      <BottomSheet
        open={editing !== null}
        title="Messung bearbeiten"
        onClose={() => setEditing(null)}
      >
        <MeasurementFields
          values={editForm}
          errors={editErrors}
          onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))}
        />
        {editErrors.form ? (
          <p className="field__error" style={{ marginBottom: 10 }}>
            {editErrors.form}
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button onClick={handleEditSave}>Speichern</Button>
          <Button variant="ghost" onClick={() => setEditing(null)}>
            Abbrechen
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Messung löschen"
        text={
          deleteTarget
            ? `Möchtest du die Messung vom ${formatDateGerman(deleteTarget.date)} wirklich löschen?`
            : ""
        }
        confirmLabel="Löschen"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
