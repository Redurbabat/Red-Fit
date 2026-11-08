import { useLiveQuery } from "dexie-react-hooks";
import {
  Apple,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ScanLine,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BottomSheet, ConfirmDialog } from "../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../components/feedback/states";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../components/layout/PageHeader";
import { Button, IconButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field, NumberInput } from "../../components/ui/inputs";
import { MacroBar, ProgressBar } from "../../components/ui/ProgressBar";
import type { FoodItem, MealFoodEntry, MealLog, MealType, WaterLog } from "../../models";
import {
  buildEntryNutrition,
  calculateDailyNutrition,
  calculateMealTotals,
  type NutrientTotals,
} from "../../services/calculations/nutrition";
import { calculateNutritionUncertainty } from "../../services/calculations/nutritionUncertainty";
import { displayedMealWeight, rawEquivalentGrams } from "../../services/calculations/cookingYield";
import {
  db,
  foodRepository,
  goalRepository,
  mealRepository,
  waterRepository,
} from "../../services/storage";
import {
  addDays,
  formatDateGerman,
  formatTime,
  getLocalDateKey,
  nowIso,
  parseDateKey,
} from "../../utils/dates";
import { mealTypeLabels } from "../../utils/labels";
import {
  formatGrams,
  formatKcal,
  formatLiters,
  parseDecimalInput,
  roundTo,
} from "../../utils/numbers";

/** Meal sections that are always visible, in daily order. */
const BASE_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "shake"];
/** Only shown when the user actually logged something for them. */
const EXTRA_MEAL_TYPES: MealType[] = ["preWorkout", "postWorkout"];

/** Macro grams: one decimal, German comma ("10,4"). */
function formatGramValue(value: number): string {
  return roundTo(value, 1).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

/**
 * Fallback when the referenced food was deleted: scale the frozen snapshot
 * values proportionally instead of recomputing from per-100g truth.
 */
function scaleSnapshot(entry: MealFoodEntry, amountG: number): NutrientTotals {
  if (entry.amountG <= 0) {
    return { kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat };
  }
  const factor = amountG / entry.amountG;
  return {
    kcal: roundTo(entry.kcal * factor, 1),
    protein: roundTo(entry.protein * factor, 2),
    carbs: roundTo(entry.carbs * factor, 2),
    fat: roundTo(entry.fat * factor, 2),
  };
}

/** Decimal for a text input: German comma, no thousands separator. */
function toInputValue(value: number): string {
  return String(value).replace(".", ",");
}

const cardLabelStyle = {
  fontSize: 13,
  fontWeight: 600 as const,
  color: "var(--text-muted)",
};

/** Valid, calendar-checked date key from ?date=… — falls back to today. */
function parseDateParam(raw: string | null): string {
  const isValid =
    raw !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
    getLocalDateKey(parseDateKey(raw)) === raw;
  return isValid ? raw : getLocalDateKey();
}

interface EntryEditState {
  logId: string;
  mealType: MealType;
  entry: MealFoodEntry;
  /** Current food record; null while loading or when the food was deleted. */
  food: FoodItem | null;
}

export default function NutritionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const today = getLocalDateKey();

  // AddMealPage returns with ?date=… so the saved entry's day stays visible.
  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateParam(searchParams.get("date")),
  );
  const isToday = selectedDate === today;

  const mealLogs = useLiveQuery(
    () => db.mealLogs.where("date").equals(selectedDate).toArray(),
    [selectedDate],
  );
  const waterLogs = useLiveQuery(
    () => db.waterLogs.where("date").equals(selectedDate).toArray(),
    [selectedDate],
  );
  // Goal timeline: browsing an older day shows the goal that applied then.
  const goal = useLiveQuery(() => goalRepository.getForDate(selectedDate), [selectedDate], null);

  const [editing, setEditing] = useState<EntryEditState | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [waterSheetOpen, setWaterSheetOpen] = useState(false);
  const [waterInput, setWaterInput] = useState("");
  const [waterError, setWaterError] = useState<string | undefined>(undefined);

  const totals = calculateDailyNutrition(mealLogs ?? []);
  const uncertainty = calculateNutritionUncertainty(mealLogs ?? []);
  const logsByType = new Map<MealType, MealLog>();
  for (const log of mealLogs ?? []) logsByType.set(log.mealType, log);
  const visibleTypes: MealType[] = [
    ...BASE_MEAL_TYPES,
    ...EXTRA_MEAL_TYPES.filter((t) => logsByType.has(t)),
  ];

  const waterTotalMl = (waterLogs ?? []).reduce((sum, log) => sum + log.amountMl, 0);
  const waterTargetMl = goal?.dailyWaterMl ?? 0;
  const sortedWaterLogs = [...(waterLogs ?? [])].sort((a, b) =>
    b.loggedAt.localeCompare(a.loggedAt),
  );

  function openEntryEditor(log: MealLog, entry: MealFoodEntry) {
    setEditing({ logId: log.id, mealType: log.mealType, entry, food: null });
    setAmountInput(toInputValue(displayedMealWeight(entry)));
    setAmountError(undefined);
    // Load the current food so the preview matches what saveEntryAmount will
    // store (per-100g truth); stays null when the food was deleted.
    void foodRepository
      .get(entry.foodId)
      .then((food) => {
        if (!food) return;
        setEditing((current) =>
          current && current.entry.id === entry.id ? { ...current, food } : current,
        );
      })
      .catch(() => {
        // Preview falls back to the snapshot; saving re-fetches anyway.
      });
  }

  function closeEntryEditor() {
    setEditing(null);
    setConfirmDeleteOpen(false);
  }

  async function saveEntryAmount() {
    if (!editing) return;
    const value = parseDecimalInput(amountInput);
    if (value == null || value <= 0 || value > 1_000_000) {
      setAmountError("Bitte gib eine realistische Menge über 0 g ein.");
      return;
    }
    try {
      const cooked = editing.entry.weighedAs === "cooked" &&
        editing.entry.cookingYieldFactor !== undefined;
      const weighedAmountG = roundTo(value, 1);
      if (weighedAmountG <= 0) {
        setAmountError("Bitte gib mindestens 0,1 g ein.");
        return;
      }
      const amountG = roundTo(
        rawEquivalentGrams(weighedAmountG, cooked ? editing.entry.cookingYieldFactor : 1),
        1,
      );
      if (amountG <= 0) {
        setAmountError("Die umgerechnete Menge ist zu klein.");
        return;
      }
      // Recompute from per-100g truth when the food still exists,
      // otherwise scale the snapshot proportionally.
      const food = await foodRepository.get(editing.entry.foodId);
      const nutrition = food
        ? buildEntryNutrition(food, amountG)
        : scaleSnapshot(editing.entry, amountG);
      await mealRepository.updateEntryNutrition(editing.logId, editing.entry.id, {
        amountG,
        ...(cooked ? { weighedAmountG } : {}),
        ...nutrition,
      });
      closeEntryEditor();
      showToast("Menge aktualisiert.");
    } catch {
      setAmountError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function deleteEntry() {
    if (!editing) return;
    try {
      await mealRepository.deleteEntry(editing.logId, editing.entry.id);
      closeEntryEditor();
      showToast("Eintrag gelöscht.");
    } catch {
      setConfirmDeleteOpen(false);
      showToast("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function addWater(amountMl: number) {
    try {
      await waterRepository.create({ date: selectedDate, amountMl, loggedAt: nowIso() });
      showToast("Wasser hinzugefügt.");
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function submitCustomWater() {
    const value = parseDecimalInput(waterInput);
    if (value == null || value <= 0) {
      setWaterError("Bitte gib eine gültige Menge in Millilitern ein.");
      return;
    }
    setWaterError(undefined);
    setWaterInput("");
    await addWater(Math.round(value));
  }

  async function deleteWaterLog(log: WaterLog) {
    try {
      await waterRepository.delete(log.id);
      showToast("Eintrag gelöscht.", {
        label: "Rückgängig",
        onClick: () => {
          void waterRepository.put(log);
        },
      });
    } catch {
      showToast("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  return (
    <>
      <PageHeader title="Ernährung" />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <IconButton
          label="Vorheriger Tag"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
        >
          <ChevronLeft size={22} />
        </IconButton>
        <span style={{ fontWeight: 700, fontSize: 16, textAlign: "center" }}>
          {isToday ? "Heute" : formatDateGerman(selectedDate)}
        </span>
        <IconButton
          label="Nächster Tag"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
        >
          <ChevronRight size={22} />
        </IconButton>
      </div>

      <Card>
        <span style={cardLabelStyle}>Makros</span>
        {goal === null || mealLogs === undefined ? (
          <LoadingState rows={2} />
        ) : goal ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <MacroBar
              label="Kalorien"
              current={totals.kcal}
              target={goal.dailyKcal}
              unit="kcal"
              color="var(--calories)"
            />
            <MacroBar
              label="Protein"
              current={totals.protein}
              target={goal.dailyProtein}
              unit="g"
              color="var(--protein)"
              format={formatGramValue}
            />
            <MacroBar
              label="Kohlenhydrate"
              current={totals.carbs}
              target={goal.dailyCarbs}
              unit="g"
              color="var(--carbs)"
              format={formatGramValue}
            />
            <MacroBar
              label="Fett"
              current={totals.fat}
              target={goal.dailyFat}
              unit="g"
              color="var(--fat)"
              format={formatGramValue}
            />
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="Noch kein Ernährungsziel"
            text="Lege Kalorien und Makros fest, um deinen Tagesfortschritt zu sehen."
            action={{ label: "Ziel festlegen", onClick: () => navigate("/settings") }}
          />
        )}
        {mealLogs !== undefined && uncertainty.uncertainEntries > 0 ? (
          <p style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 13 }}>
            {uncertainty.uncertainEntries} geschätzte Mengen:
            rechnerische Unschärfe von ungefähr ±{Math.round(uncertainty.caloriesSigma)} kcal.
            Diese Orientierung berücksichtigt keine Fehler der Nährwertangaben.
          </p>
        ) : null}
      </Card>

      <SectionHeader title="Mahlzeiten" />
      {mealLogs === undefined ? (
        <LoadingState rows={3} />
      ) : (
        visibleTypes.map((type) => (
          <MealSection
            key={type}
            type={type}
            log={logsByType.get(type)}
            onAdd={() =>
              navigate(`/nutrition/meals/add?mealType=${type}&date=${selectedDate}`)
            }
            onEntryClick={openEntryEditor}
          />
        ))
      )}

      <SectionHeader title="Wasser" />
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span style={cardLabelStyle}>Wasser</span>
          <span style={{ fontWeight: 700 }}>
            {waterTargetMl > 0
              ? `${formatLiters(waterTotalMl).replace(" L", "")} / ${formatLiters(waterTargetMl)}`
              : formatLiters(waterTotalMl)}
          </span>
        </div>
        {waterTargetMl > 0 ? (
          <div style={{ marginTop: 10 }}>
            <ProgressBar fraction={waterTotalMl / waterTargetMl} color="var(--water)" />
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Button variant="secondary" small onClick={() => void addWater(250)}>
            +250 ml
          </Button>
          <Button variant="secondary" small onClick={() => void addWater(500)}>
            +500 ml
          </Button>
          <Button
            variant="ghost"
            small
            onClick={() => {
              setWaterError(undefined);
              setWaterSheetOpen(true);
            }}
          >
            Eigene Menge / Einträge
          </Button>
        </div>
      </Card>

      <SectionHeader title="Aktionen" />
      <div className="quick-actions" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <button
          type="button"
          className="quick-action"
          onClick={() => navigate("/nutrition/foods")}
        >
          <Apple size={22} aria-hidden="true" />
          <span>Lebensmittel</span>
        </button>
        <button
          type="button"
          className="quick-action"
          onClick={() => navigate("/nutrition/scan")}
        >
          <ScanLine size={22} aria-hidden="true" />
          <span>Scannen</span>
        </button>
        <button
          type="button"
          className="quick-action"
          onClick={() => navigate("/nutrition/meal-plan")}
        >
          <CalendarDays size={22} aria-hidden="true" />
          <span>Essensplan</span>
        </button>
      </div>

      <BottomSheet
        open={editing !== null}
        title={editing?.entry.foodName ?? "Eintrag bearbeiten"}
        onClose={closeEntryEditor}
      >
        {editing ? (
          <>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>
              {mealTypeLabels[editing.mealType]} ·{" "}
              {isToday ? "Heute" : formatDateGerman(selectedDate)}
            </p>
            <Field
              label={editing.entry.weighedAs === "cooked"
                ? "Menge gekocht (g)" : "Menge (g)"}
              error={amountError}
            >
              {(id) => (
                <NumberInput
                  id={id}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="z. B. 150"
                />
              )}
            </Field>
            {editing.entry.weighedAs === "cooked" ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                Gekocht gewogen · gespeicherter Umrechnungsfaktor{" "}
                {editing.entry.cookingYieldFactor?.toLocaleString("de-DE", {
                  maximumFractionDigits: 2,
                }) ?? "nicht verfügbar"}.
                Nährwerte beziehen sich auf das Roh-/Trockenäquivalent.
              </p>
            ) : null}
            <EntryPreview entry={editing.entry} food={editing.food} amountInput={amountInput} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <Button onClick={() => void saveEntryAmount()}>Speichern</Button>
              <Button variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 size={18} aria-hidden="true" />
                Eintrag löschen
              </Button>
            </div>
          </>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eintrag löschen?"
        text={
          editing
            ? `„${editing.entry.foodName}“ wird aus ${mealTypeLabels[editing.mealType]} entfernt.`
            : ""
        }
        confirmLabel="Löschen"
        danger
        onConfirm={() => void deleteEntry()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <BottomSheet
        open={waterSheetOpen}
        title="Wasser"
        onClose={() => setWaterSheetOpen(false)}
      >
        <Field label="Eigene Menge (ml)" error={waterError}>
          {(id) => (
            <NumberInput
              id={id}
              value={waterInput}
              onChange={(e) => setWaterInput(e.target.value)}
              placeholder="z. B. 330"
            />
          )}
        </Field>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => void submitCustomWater()}>Hinzufügen</Button>
        </div>
        <p style={{ ...cardLabelStyle, marginTop: 18 }}>
          Einträge {isToday ? "heute" : `am ${formatDateGerman(selectedDate)}`}
        </p>
        {sortedWaterLogs.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-soft)", marginTop: 8 }}>
            Noch kein Wasser eingetragen.
          </p>
        ) : (
          <div>
            {sortedWaterLogs.map((log) => (
              <div key={log.id} className="list-row">
                <div className="list-row__body">
                  <div className="list-row__title">{log.amountMl} ml</div>
                  <div className="list-row__subtitle">{formatTime(log.loggedAt)} Uhr</div>
                </div>
                <div className="list-row__trailing">
                  <IconButton
                    label={`Eintrag ${log.amountMl} ml löschen`}
                    onClick={() => void deleteWaterLog(log)}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

interface MealSectionProps {
  type: MealType;
  log: MealLog | undefined;
  onAdd: () => void;
  onEntryClick: (log: MealLog, entry: MealFoodEntry) => void;
}

function MealSection({ type, log, onAdd, onEntryClick }: MealSectionProps) {
  const entries = log?.entries ?? [];
  const mealTotals = calculateMealTotals(entries);
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={cardLabelStyle}>{mealTypeLabels[type]}</span>
        {entries.length > 0 ? (
          <span style={{ fontWeight: 700 }}>{formatKcal(mealTotals.kcal)}</span>
        ) : null}
      </div>
      {entries.length > 0 ? (
        <div style={{ marginTop: 2 }}>
          {log &&
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="list-row"
                onClick={() => onEntryClick(log, entry)}
              >
                <span className="list-row__body" style={{ display: "block" }}>
                  <span className="list-row__title" style={{ display: "block" }}>
                    {entry.foodName}
                  </span>
                  <span className="list-row__subtitle" style={{ display: "block" }}>
                    {entry.weighedAs === "cooked"
                      ? `${formatGrams(displayedMealWeight(entry))} gekocht (≈ ${formatGrams(entry.amountG)} roh)`
                      : formatGrams(entry.amountG)} · {formatKcal(entry.kcal)}
                  </span>
                </span>
                <span className="list-row__trailing">
                  <Pencil size={16} aria-hidden="true" />
                </span>
              </button>
            ))}
        </div>
      ) : (
        <p style={{ fontSize: 14, color: "var(--text-soft)", marginTop: 8 }}>
          Noch nichts eingetragen.
        </p>
      )}
      <div style={{ marginTop: 10 }}>
        <Button variant="ghost" small autoWidth onClick={onAdd}>
          <Plus size={16} aria-hidden="true" />
          Hinzufügen
        </Button>
      </div>
    </Card>
  );
}

/**
 * Live preview while editing the amount. Mirrors saveEntryAmount: recompute
 * from the current per-100g food values when the food still exists, and only
 * scale the frozen snapshot when it was deleted.
 */
function EntryPreview({
  entry,
  food,
  amountInput,
}: {
  entry: MealFoodEntry;
  food: FoodItem | null;
  amountInput: string;
}) {
  const value = parseDecimalInput(amountInput);
  if (value == null || value <= 0 || value > 1_000_000) return null;
  // Same rounding as saveEntryAmount so preview and stored values match.
  const factor = entry.weighedAs === "cooked"
    ? entry.cookingYieldFactor ?? 1 : 1;
  const weighedAmountG = roundTo(value, 1);
  if (weighedAmountG <= 0) return null;
  const amountG = roundTo(rawEquivalentGrams(weighedAmountG, factor), 1);
  if (amountG <= 0) return null;
  const n = food ? buildEntryNutrition(food, amountG) : scaleSnapshot(entry, amountG);
  return (
    <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
      {formatKcal(n.kcal)} · {formatGrams(n.protein)} Protein · {formatGrams(n.carbs)} KH ·{" "}
      {formatGrams(n.fat)} Fett
    </p>
  );
}
