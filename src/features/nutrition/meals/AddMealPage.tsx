import { useLiveQuery } from "dexie-react-hooks";
import { Plus, SearchX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BottomSheet } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Chip, Field, NumberInput, TextInput } from "../../../components/ui/inputs";
import type { EstimateLevel, FoodItem, MealFoodEntry, MealType } from "../../../models";
import { MEAL_TYPES } from "../../../models";
import {
  buildEntryNutrition,
  calculateFoodNutrition,
} from "../../../services/calculations/nutrition";
import { foodRepository, mealRepository } from "../../../services/storage";
import { formatDateGerman, getLocalDateKey, parseDateKey } from "../../../utils/dates";
import { newId } from "../../../utils/ids";
import { mealTypeLabels } from "../../../utils/labels";
import { formatGrams, formatKcal, parseDecimalInput, roundTo } from "../../../utils/numbers";

function parseMealTypeParam(raw: string | null): MealType {
  return raw && (MEAL_TYPES as readonly string[]).includes(raw)
    ? (raw as MealType)
    : "breakfast";
}

function parseDateParam(raw: string | null): string {
  // Round-trip check rejects calendar-impossible values like "2026-13-45"
  // that would otherwise be stored raw and never be reachable via day nav.
  const isValid =
    raw !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
    getLocalDateKey(parseDateKey(raw)) === raw;
  return isValid ? raw : getLocalDateKey();
}

/** Decimal for a text input: German comma, no thousands separator. */
function toInputValue(value: number): string {
  return String(value).replace(".", ",");
}

export default function AddMealPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const date = parseDateParam(searchParams.get("date"));
  const [mealType, setMealType] = useState<MealType>(() =>
    parseMealTypeParam(searchParams.get("mealType")),
  );
  // Scan flow can hand over an initial search text (?query=…, e.g. a barcode).
  const [query, setQuery] = useState(() => searchParams.get("query") ?? "");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amountInput, setAmountInput] = useState("100");
  const [estimateLevel, setEstimateLevel] = useState<EstimateLevel>("none");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const foods = useLiveQuery(() => foodRepository.search(query), [query]);
  const recentFoods = useLiveQuery(() => foodRepository.listRecent(6), []);

  const trimmedQuery = query.trim();
  const favorites = trimmedQuery === "" ? (foods ?? []).filter((f) => f.favorite) : [];
  const isToday = date === getLocalDateKey();

  const selectFood = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    setEstimateLevel("none");
    setAmountInput(toInputValue(food.servingSizeG && food.servingSizeG > 0 ? food.servingSizeG : 100));
    setAmountError(undefined);
  }, []);

  // Scan flow: preselect the scanned food (?foodId=…) and open the amount sheet.
  const foodIdParam = searchParams.get("foodId");
  useEffect(() => {
    if (!foodIdParam) return;
    let cancelled = false;
    foodRepository
      .get(foodIdParam)
      .then((food) => {
        if (!cancelled && food) selectFood(food);
      })
      .catch(() => {
        // Not fatal — the user can still search manually.
      });
    return () => {
      cancelled = true;
    };
  }, [foodIdParam, selectFood]);

  async function handleSave() {
    if (!selectedFood || saving) return;
    const value = parseDecimalInput(amountInput);
    if (value == null || value <= 0) {
      setAmountError("Bitte gib eine Menge über 0 g ein.");
      return;
    }
    setSaving(true);
    try {
      const amountG = roundTo(value, 1);
      // Snapshot principle: name + computed values are frozen on the entry.
      const nutrition = buildEntryNutrition(selectedFood, amountG);
      const entry: MealFoodEntry = {
        id: newId(),
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        amountG,
        estimateLevel,
        ...nutrition,
      };
      const existing = await mealRepository.findByDateAndType(date, mealType);
      if (existing) {
        await mealRepository.update(existing.id, { entries: [...existing.entries, entry] });
      } else {
        await mealRepository.create({ date, mealType, entries: [entry] });
      }
      // Touch updatedAt so the food surfaces under "Zuletzt verwendet".
      await foodRepository.update(selectedFood.id, {});
      showToast("Mahlzeit hinzugefügt.");
      // Return to the day the entry was saved for, not blindly to today.
      navigate(`/nutrition?date=${date}`);
    } catch {
      setSaving(false);
      setAmountError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  const hasAnyFood = (foods ?? []).length > 0;

  return (
    <>
      <PageHeader
        title="Mahlzeit hinzufügen"
        subtitle={isToday ? "Heute" : formatDateGerman(date)}
        back
      />

      <SectionHeader title="Mahlzeit" />
      <div className="chip-row" role="group" aria-label="Mahlzeit wählen">
        {MEAL_TYPES.map((type) => (
          <Chip
            key={type}
            label={mealTypeLabels[type]}
            selected={type === mealType}
            onClick={() => setMealType(type)}
          />
        ))}
      </div>

      <SectionHeader title="Lebensmittel wählen" />
      <Field label="Suche">
        {(id) => (
          <TextInput
            id={id}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, Marke oder Barcode"
          />
        )}
      </Field>

      {foods === undefined ? (
        <LoadingState rows={4} />
      ) : !hasAnyFood ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title={trimmedQuery === "" ? "Noch keine Lebensmittel" : "Kein Treffer"}
            text={
              trimmedQuery === ""
                ? "Lege dein erstes Lebensmittel an, um Mahlzeiten zu erfassen."
                : `Für „${trimmedQuery}“ wurde nichts gefunden.`
            }
            action={{
              label: "Lebensmittel erstellen",
              onClick: () => navigate("/nutrition/foods/new"),
            }}
          />
        </Card>
      ) : (
        <>
          {favorites.length > 0 ? (
            <>
              <SectionHeader title="Favoriten" />
              <Card>
                {favorites.map((food) => (
                  <FoodRow key={food.id} food={food} onClick={() => selectFood(food)} />
                ))}
              </Card>
            </>
          ) : null}

          {trimmedQuery === "" && (recentFoods ?? []).length > 0 ? (
            <>
              <SectionHeader title="Zuletzt verwendet" />
              <Card>
                {(recentFoods ?? []).map((food) => (
                  <FoodRow key={food.id} food={food} onClick={() => selectFood(food)} />
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title={trimmedQuery === "" ? "Alle" : "Ergebnisse"} />
          <Card>
            {foods.map((food) => (
              <FoodRow key={food.id} food={food} onClick={() => selectFood(food)} />
            ))}
          </Card>
        </>
      )}

      <BottomSheet
        open={selectedFood !== null}
        title={selectedFood?.name ?? "Menge wählen"}
        onClose={() => setSelectedFood(null)}
      >
        {selectedFood ? (
          <>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>
              {selectedFood.brand ? `${selectedFood.brand} · ` : ""}
              {formatKcal(selectedFood.kcalPer100g)} / 100 g · {mealTypeLabels[mealType]}
            </p>
            <Field label="Menge (g)" error={amountError}>
              {(id) => (
                <NumberInput
                  id={id}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="z. B. 150"
                />
              )}
            </Field>
            {/* Quick amounts: portion multiples when known, gram presets otherwise. */}
            <div className="chip-row" aria-label="Schnellmengen">
              {(selectedFood.servingSizeG && selectedFood.servingSizeG > 0
                ? [
                    { label: "½ Portion", grams: selectedFood.servingSizeG / 2 },
                    { label: "1 Portion", grams: selectedFood.servingSizeG },
                    { label: "2 Portionen", grams: selectedFood.servingSizeG * 2 },
                    { label: "100 g", grams: 100 },
                  ]
                : [
                    { label: "50 g", grams: 50 },
                    { label: "100 g", grams: 100 },
                    { label: "150 g", grams: 150 },
                    { label: "200 g", grams: 200 },
                  ]
              ).map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={parseDecimalInput(amountInput) === roundTo(preset.grams, 1)}
                  onClick={() => setAmountInput(toInputValue(roundTo(preset.grams, 1)))}
                />
              ))}
            </div>
            <Field label="Wie genau ist die Mengenangabe?">
              {(id) => (
                <select
                  id={id}
                  className="select"
                  value={estimateLevel}
                  onChange={(event) =>
                    setEstimateLevel(event.target.value as EstimateLevel)
                  }
                >
                  <option value="none">Genau abgewogen</option>
                  <option value="low">Leicht geschätzt</option>
                  <option value="medium">Portion grob geschätzt</option>
                  <option value="high">Sehr ungenau geschätzt</option>
                </select>
              )}
            </Field>
            <LiveNutrition food={selectedFood} amountInput={amountInput} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving ? "Wird gespeichert…" : "Hinzufügen"}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedFood(null)}>
                Abbrechen
              </Button>
            </div>
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}

function FoodRow({ food, onClick }: { food: FoodItem; onClick: () => void }) {
  return (
    <button type="button" className="list-row" onClick={onClick}>
      <span className="list-row__body" style={{ display: "block" }}>
        <span className="list-row__title" style={{ display: "block" }}>
          {food.name}
        </span>
        <span className="list-row__subtitle" style={{ display: "block" }}>
          {food.brand ? `${food.brand} · ` : ""}
          {formatKcal(food.kcalPer100g)} / 100 g
        </span>
      </span>
      <span className="list-row__trailing">
        <Plus size={18} aria-hidden="true" />
      </span>
    </button>
  );
}

/** Live line like "296 kcal · 10,4 g Protein · 48 g KH · 5,6 g Fett". */
function LiveNutrition({ food, amountInput }: { food: FoodItem; amountInput: string }) {
  const value = parseDecimalInput(amountInput);
  if (value == null || value <= 0) return null;
  const n = calculateFoodNutrition(food, value);
  return (
    <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
      {formatKcal(n.kcal)} · {formatGrams(n.protein)} Protein · {formatGrams(n.carbs)} KH ·{" "}
      {formatGrams(n.fat)} Fett
    </p>
  );
}
