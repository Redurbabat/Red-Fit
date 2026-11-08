import { useLiveQuery } from "dexie-react-hooks";
import { Plus, SearchX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  combinedAmountUncertainty,
  getCookingYield,
  rawEquivalentGrams,
} from "../../../services/calculations/cookingYield";
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
  const [weightBasis, setWeightBasis] = useState<"raw" | "cooked">("raw");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  const foods = useLiveQuery(() => foodRepository.search(query), [query]);
  const recentFoods = useLiveQuery(() => foodRepository.listRecent(6), []);

  const trimmedQuery = query.trim();
  const favorites = trimmedQuery === "" ? (foods ?? []).filter((f) => f.favorite) : [];
  const isToday = date === getLocalDateKey();
  const cookingYield = selectedFood ? getCookingYield(selectedFood) : null;
  const cookingFactor = weightBasis === "cooked" && cookingYield
    ? cookingYield.factor : 1;
  const effectiveEstimateLevel = weightBasis === "cooked" && cookingYield
    ? combinedAmountUncertainty(estimateLevel, cookingYield.uncertainty)
    : estimateLevel;

  const selectFood = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    setEstimateLevel("none");
    setWeightBasis("raw");
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
    if (!selectedFood || saveInFlight.current) return;
    const value = parseDecimalInput(amountInput);
    if (value == null || value <= 0 || value > 1_000_000) {
      setAmountError("Bitte gib eine realistische Menge über 0 g ein.");
      return;
    }
    // A cooked amount is converted to the raw/dry label's unit BEFORE
    // applying /100 g. Keep the exact weighed amount for later editing.
    const weighedAmountG = roundTo(value, 1);
    if (weighedAmountG <= 0) {
      setAmountError("Bitte gib mindestens 0,1 g ein.");
      return;
    }
    const amountG = roundTo(rawEquivalentGrams(weighedAmountG, cookingFactor), 1);
    if (amountG <= 0) {
      setAmountError("Die umgerechnete Menge ist zu klein.");
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    try {
      // Snapshot principle: name + computed values are frozen on the entry.
      const nutrition = buildEntryNutrition(selectedFood, amountG);
      const entry: MealFoodEntry = {
        id: newId(),
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        amountG,
        ...(weightBasis === "cooked" && cookingYield
          ? {
              weighedAs: "cooked" as const,
              weighedAmountG,
              cookingYieldFactor: cookingYield.factor,
            }
          : {}),
        estimateLevel: effectiveEstimateLevel,
        ...nutrition,
      };
      await mealRepository.appendEntry(date, mealType, entry);
      // The meal is already committed: failure to update "recent foods"
      // must not claim the meal failed or invite a duplicate retry.
      void foodRepository.update(selectedFood.id, {}).catch(() => undefined);
      showToast("Mahlzeit hinzugefügt.");
      // Return to the day the entry was saved for, not blindly to today.
      navigate(`/nutrition?date=${date}`);
    } catch {
      saveInFlight.current = false;
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
            {cookingYield ? (
              <Field label="Welche Menge hast du gewogen?">
                {(id) => (
                  <select
                    id={id}
                    className="select"
                    value={weightBasis}
                    onChange={(event) =>
                      setWeightBasis(event.target.value as "raw" | "cooked")
                    }
                  >
                    <option value="raw">Roh / trocken (laut Nährwertangabe)</option>
                    <option value="cooked">Gekocht (Gewicht auf dem Teller)</option>
                  </select>
                )}
              </Field>
            ) : null}
            <Field label={weightBasis === "cooked" ? "Menge gekocht (g)" : "Menge (g)"} error={amountError}>
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
              {(weightBasis === "raw" && selectedFood.servingSizeG && selectedFood.servingSizeG > 0
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
            {weightBasis === "cooked" && cookingYield ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                Näherung für {cookingYield.label}: 1 g roh entspricht etwa{" "}
                {cookingYield.factor.toLocaleString("de-DE", { maximumFractionDigits: 2 })} g gekocht.
                {cookingYield.kind === "fatLoss"
                  ? " Beim Braten/Grillen gehen auch Nährstoffe verloren; die Umrechnung ist besonders ungenau."
                  : " Der Faktor hängt von der Zubereitung ab."}
                {" "}Die zusätzliche Unsicherheit wird im Tagebuch markiert.
              </p>
            ) : null}
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
            {weightBasis === "cooked" && cookingYield && effectiveEstimateLevel !== estimateLevel ? (
              <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 8 }}>
                Wegen der Umrechnung wird die Menge mindestens als{" "}
                {cookingYield.uncertainty === "medium" ? "grob" : "leicht"} geschätzt markiert.
              </p>
            ) : null}
            <LiveNutrition
              food={selectedFood}
              amountInput={amountInput}
              cookingFactor={cookingFactor}
            />
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
function LiveNutrition({
  food,
  amountInput,
  cookingFactor,
}: { food: FoodItem; amountInput: string; cookingFactor: number }) {
  const value = parseDecimalInput(amountInput);
  if (value == null || value <= 0 || value > 1_000_000) return null;
  const weighedAmountG = roundTo(value, 1);
  if (weighedAmountG <= 0) return null;
  const amountG = roundTo(rawEquivalentGrams(weighedAmountG, cookingFactor), 1);
  if (amountG <= 0) return null;
  const n = calculateFoodNutrition(food, amountG);
  return (
    <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
      {cookingFactor !== 1 ? `≈ ${formatGrams(amountG)} roh/trocken · ` : ""}
      {formatKcal(n.kcal)} · {formatGrams(n.protein)} Protein · {formatGrams(n.carbs)} KH ·{" "}
      {formatGrams(n.fat)} Fett
    </p>
  );
}
