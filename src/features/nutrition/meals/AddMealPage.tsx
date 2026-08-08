import { useLiveQuery } from "dexie-react-hooks";
import { Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BottomSheet } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Chip, Field, NumberInput, TextInput } from "../../../components/ui/inputs";
import type { FoodItem, MealFoodEntry, MealType } from "../../../models";
import { MEAL_TYPES } from "../../../models";
import {
  buildEntryNutrition,
  calculateFoodNutrition,
} from "../../../services/calculations/nutrition";
import { foodRepository, mealRepository } from "../../../services/storage";
import { formatDateGerman, getLocalDateKey } from "../../../utils/dates";
import { newId } from "../../../utils/ids";
import { mealTypeLabels } from "../../../utils/labels";
import { formatGrams, formatKcal, parseDecimalInput, roundTo } from "../../../utils/numbers";

function parseMealTypeParam(raw: string | null): MealType {
  return raw && (MEAL_TYPES as readonly string[]).includes(raw)
    ? (raw as MealType)
    : "breakfast";
}

function parseDateParam(raw: string | null): string {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : getLocalDateKey();
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
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amountInput, setAmountInput] = useState("100");
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const foods = useLiveQuery(() => foodRepository.search(query), [query]);
  const recentFoods = useLiveQuery(() => foodRepository.listRecent(6), []);

  const trimmedQuery = query.trim();
  const favorites = trimmedQuery === "" ? (foods ?? []).filter((f) => f.favorite) : [];
  const isToday = date === getLocalDateKey();

  function selectFood(food: FoodItem) {
    setSelectedFood(food);
    setAmountInput(toInputValue(food.servingSizeG && food.servingSizeG > 0 ? food.servingSizeG : 100));
    setAmountError(undefined);
  }

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
      navigate("/nutrition");
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
