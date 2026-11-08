import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../../components/feedback/Modal";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field, NumberInput, SegmentedControl } from "../../components/ui/inputs";
import { useSettings } from "../../hooks/useSettings";
import { DEFAULT_GOAL } from "../../services/demoData/defaults";
import EnergyGoalCalculator from "../nutrition/EnergyGoalCalculator";
import { db } from "../../services/storage/database";
import { goalRepository, settingsRepository } from "../../services/storage";
import { getLocalDateKey } from "../../utils/dates";
import { parseDecimalInput } from "../../utils/numbers";

interface GoalDraft {
  dailyKcal: string;
  dailyProtein: string;
  dailyCarbs: string;
  dailyFat: string;
  dailyWaterMl: string;
  validFrom: string;
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="list-row"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
    >
      <span className="list-row__body">
        <span className="list-row__title" style={{ fontWeight: 500 }}>
          {label}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          border: "1.5px solid var(--border-strong)",
          background: checked ? "var(--accent)" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          transition: "background 140ms var(--ease)",
        }}
      >
        {checked ? <Check size={16} /> : null}
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const [resetOpen, setResetOpen] = useState(false);

  const goal = useLiveQuery(
    () => db.nutritionGoals.orderBy("updatedAt").reverse().first(),
    [],
  );
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);

  // Initialize the goal form once the stored goal arrives.
  useEffect(() => {
    if (goalDraft !== null) return;
    const source = goal ?? { ...DEFAULT_GOAL };
    setGoalDraft({
      dailyKcal: String(source.dailyKcal),
      dailyProtein: String(source.dailyProtein),
      dailyCarbs: String(source.dailyCarbs),
      dailyFat: String(source.dailyFat),
      dailyWaterMl: String(source.dailyWaterMl),
      validFrom: ("validFrom" in source ? source.validFrom : undefined) ?? getLocalDateKey(),
    });
  }, [goal, goalDraft]);

  async function saveGoal() {
    if (!goalDraft) return;
    const values = {
      dailyKcal: parseDecimalInput(goalDraft.dailyKcal),
      dailyProtein: parseDecimalInput(goalDraft.dailyProtein),
      dailyCarbs: parseDecimalInput(goalDraft.dailyCarbs),
      dailyFat: parseDecimalInput(goalDraft.dailyFat),
      dailyWaterMl: parseDecimalInput(goalDraft.dailyWaterMl),
    };
    if (Object.values(values).some((v) => v == null || v < 0)) {
      showToast("Bitte prüfe die Zielwerte.");
      return;
    }
    const data = {
      dailyKcal: values.dailyKcal!,
      dailyProtein: values.dailyProtein!,
      dailyCarbs: values.dailyCarbs!,
      dailyFat: values.dailyFat!,
      dailyWaterMl: values.dailyWaterMl!,
    };
    // Goal timeline: same validFrom updates that goal in place; a new
    // start date creates a new goal and keeps the old one as history.
    const validFrom = goalDraft.validFrom || getLocalDateKey();
    const existingSameStart = (await goalRepository.list()).find(
      (g) => g.validFrom === validFrom,
    );
    if (existingSameStart) {
      await goalRepository.update(existingSameStart.id, { ...data, validFrom });
    } else {
      // New start date → new goal; older goals stay as history for past days.
      await goalRepository.create({ ...DEFAULT_GOAL, ...data, validFrom });
    }
    showToast("Ziel gespeichert.");
  }

  async function resetAllData() {
    await db.transaction(
      "rw",
      [
        db.exercises, db.workoutPlans, db.workoutLogs, db.foodItems, db.mealLogs,
        db.nutritionGoals, db.waterLogs, db.bodyMeasurements, db.shoppingLists,
        db.mealPlans, db.recipes, db.userProfiles, db.recoveryLogs,
        db.mediaAssets, db.progressPhotos, db.settings, db.metadata,
      ],
      async () => {
        await Promise.all([
          db.exercises.clear(), db.workoutPlans.clear(), db.workoutLogs.clear(),
          db.foodItems.clear(), db.mealLogs.clear(), db.nutritionGoals.clear(),
          db.waterLogs.clear(), db.bodyMeasurements.clear(), db.shoppingLists.clear(),
          db.mealPlans.clear(), db.recipes.clear(), db.userProfiles.clear(),
          db.recoveryLogs.clear(), db.mediaAssets.clear(), db.progressPhotos.clear(),
          db.settings.clear(), db.metadata.clear(),
        ]);
      },
    );
    await settingsRepository.saveMetadata({
      schemaVersion: 1,
      onboardingCompleted: false,
      onboardingVersion: 0,
      demoDataSeeded: false,
    });
    setResetOpen(false);
    showToast("Alle Daten gelöscht.");
    navigate("/onboarding", { replace: true });
  }

  const goalField = (key: keyof GoalDraft, label: string) => (
    <Field label={label}>
      {(id) => (
        <NumberInput
          id={id}
          value={goalDraft?.[key] ?? ""}
          onChange={(e) =>
            setGoalDraft((d) => (d ? { ...d, [key]: e.target.value } : d))
          }
        />
      )}
    </Field>
  );

  return (
    <>
      <PageHeader title="Einstellungen" back backFallback="/more" />

      <SectionHeader title="Darstellung" />
      <SegmentedControl
        ariaLabel="Theme"
        options={[
          { value: "dark", label: "Dunkel" },
          { value: "light", label: "Hell" },
          { value: "system", label: "System" },
        ]}
        value={settings.theme}
        onChange={(theme) => void updateSettings({ theme })}
      />

      <SectionHeader title="Bewegung" />
      <Card>
        <ToggleRow
          label="Animationen reduzieren"
          checked={settings.reducedMotion}
          onToggle={() => void updateSettings({ reducedMotion: !settings.reducedMotion })}
        />
      </Card>

      <SectionHeader title="Wochenstart" />
      <SegmentedControl
        ariaLabel="Erster Tag der Woche"
        options={[
          { value: "monday", label: "Montag" },
          { value: "sunday", label: "Sonntag" },
        ]}
        value={settings.firstDayOfWeek}
        onChange={(firstDayOfWeek) => void updateSettings({ firstDayOfWeek })}
      />

      <SectionHeader title="3D" />
      <Card>
        <ToggleRow
          label="3D-Platzhalter anzeigen"
          checked={settings.show3dPlaceholders}
          onToggle={() =>
            void updateSettings({ show3dPlaceholders: !settings.show3dPlaceholders })
          }
        />
      </Card>

      <SectionHeader title="Kalorienbedarf (Schätzung)" />
      <EnergyGoalCalculator
        onApply={(estimate) => {
          setGoalDraft((previous) => ({
            dailyKcal: String(estimate.dailyKcal),
            dailyProtein: String(estimate.dailyProtein),
            dailyFat: String(estimate.dailyFat),
            dailyCarbs: String(estimate.dailyCarbs),
            dailyWaterMl: String(estimate.dailyWaterMl),
            validFrom: previous?.validFrom ?? getLocalDateKey(),
          }));
          showToast("Schätzung übernommen. Bitte Ziel speichern.");
        }}
      />

      <SectionHeader title="Ernährungsziel" />
      <Card>
        {goalField("dailyKcal", "Kalorien pro Tag (kcal)")}
        {goalField("dailyProtein", "Protein pro Tag (g)")}
        {goalField("dailyCarbs", "Kohlenhydrate pro Tag (g)")}
        {goalField("dailyFat", "Fett pro Tag (g)")}
        {goalField("dailyWaterMl", "Wasser pro Tag (ml)")}
        <Field label="Gilt ab">
          {(id) => (
            <input
              id={id}
              type="date"
              className="input"
              value={goalDraft?.validFrom ?? ""}
              onChange={(e) =>
                setGoalDraft((d) => (d ? { ...d, validFrom: e.target.value } : d))
              }
            />
          )}
        </Field>
        <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 12 }}>
          Frühere Tage behalten das Ziel, das damals galt.
        </p>
        <Button onClick={() => void saveGoal()}>Ziel speichern</Button>
      </Card>

      <SectionHeader title="Daten" />
      <Card>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>
          Deine Daten werden auf diesem Gerät gespeichert. Für RED Fit ist kein
          Konto erforderlich.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" onClick={() => navigate("/backup")}>
            Backup
          </Button>
          <Button variant="secondary" onClick={() => navigate("/backup")}>
            Import
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: 30 }}>
        <Button variant="ghost" onClick={() => setResetOpen(true)}>
          <span style={{ color: "var(--danger)" }}>Alle lokalen Daten löschen</span>
        </Button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Alle Daten löschen"
        text="Alle Trainings-, Ernährungs- und Fortschrittsdaten werden endgültig von diesem Gerät gelöscht. Erstelle vorher ein Backup, wenn du die Daten behalten willst."
        confirmLabel="Alle Daten löschen"
        danger
        onConfirm={() => void resetAllData()}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
