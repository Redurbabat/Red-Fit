import { useLiveQuery } from "dexie-react-hooks";
import { CookingPot, Plus, Utensils, X } from "lucide-react";
import { useMemo, useState } from "react";
import { BottomSheet, ConfirmDialog } from "../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../components/feedback/states";
import { useToast } from "../../components/feedback/ToastProvider";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button, IconButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip, Field, IntegerInput, NumberInput, TextInput } from "../../components/ui/inputs";
import { Stepper } from "../../components/ui/Stepper";
import type {
  FoodItem,
  MealFoodEntry,
  MealType,
  Recipe,
  RecipeIngredient,
} from "../../models";
import { MEAL_TYPES } from "../../models";
import {
  calculateFoodNutrition,
  type NutrientTotals,
} from "../../services/calculations/nutrition";
import { db, foodRepository, mealRepository, recipeRepository } from "../../services/storage";
import { getLocalDateKey } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { mealTypeLabels } from "../../utils/labels";
import { formatGrams, formatKcal, parseDecimalInput, roundTo } from "../../utils/numbers";

/** Sum of all ingredient nutrients + grams for a recipe (whole recipe, all servings). */
function recipeTotals(
  ingredients: RecipeIngredient[],
  foodById: Map<string, FoodItem>,
): { totals: NutrientTotals; totalGrams: number } {
  const totals: NutrientTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let totalGrams = 0;
  for (const ingredient of ingredients) {
    const food = foodById.get(ingredient.foodId);
    if (!food) continue;
    const n = calculateFoodNutrition(food, ingredient.amountG);
    totals.kcal += n.kcal;
    totals.protein += n.protein;
    totals.carbs += n.carbs;
    totals.fat += n.fat;
    totalGrams += ingredient.amountG;
  }
  return { totals, totalGrams };
}

export default function RecipesPage() {
  const { showToast } = useToast();

  const recipes = useLiveQuery(() => recipeRepository.listSorted(), []);
  const foods = useLiveQuery(() => db.foodItems.toArray(), []);
  const foodById = useMemo(
    () => new Map((foods ?? []).map((food) => [food.id, food])),
    [foods],
  );

  // ---- Editor state ----
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [draftName, setDraftName] = useState("");
  const [servingsInput, setServingsInput] = useState("2");
  const [draftIngredients, setDraftIngredients] = useState<RecipeIngredient[]>([]);
  const [instructionsText, setInstructionsText] = useState("");
  const [editorError, setEditorError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  // Ingredient picker inside the editor.
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [ingredientFood, setIngredientFood] = useState<FoodItem | null>(null);
  const [ingredientAmount, setIngredientAmount] = useState("100");
  const [ingredientError, setIngredientError] = useState<string | undefined>(undefined);

  const ingredientResults = useLiveQuery(
    () => foodRepository.search(ingredientQuery),
    [ingredientQuery],
  );

  // ---- "Als Mahlzeit eintragen" state ----
  const [logRecipe, setLogRecipe] = useState<Recipe | null>(null);
  const [logMealType, setLogMealType] = useState<MealType>("lunch");
  const [logPortions, setLogPortions] = useState(1);
  const [logging, setLogging] = useState(false);

  function openEditor(recipe: Recipe | null) {
    setEditingRecipe(recipe);
    setDraftName(recipe?.name ?? "");
    setServingsInput(String(recipe?.servings ?? 2));
    setDraftIngredients(recipe?.ingredients ?? []);
    setInstructionsText((recipe?.instructions ?? []).join("\n"));
    setIngredientQuery("");
    setIngredientFood(null);
    setIngredientAmount("100");
    setIngredientError(undefined);
    setEditorError(undefined);
    setEditorOpen(true);
  }

  function addIngredient() {
    if (!ingredientFood) {
      setIngredientError("Bitte wähle zuerst ein Lebensmittel aus.");
      return;
    }
    const amount = parseDecimalInput(ingredientAmount);
    if (amount == null || amount <= 0) {
      setIngredientError("Bitte gib eine Menge über 0 g ein.");
      return;
    }
    setDraftIngredients([
      ...draftIngredients,
      { id: newId(), foodId: ingredientFood.id, amountG: roundTo(amount, 1) },
    ]);
    setIngredientFood(null);
    setIngredientQuery("");
    setIngredientAmount("100");
    setIngredientError(undefined);
  }

  async function handleSaveRecipe() {
    if (saving) return;
    const name = draftName.trim();
    if (name === "") {
      setEditorError("Bitte gib einen Namen ein.");
      return;
    }
    const servings = Number(servingsInput.trim());
    if (!Number.isInteger(servings) || servings < 1) {
      setEditorError("Bitte gib mindestens 1 Portion an.");
      return;
    }
    const instructions = instructionsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    setSaving(true);
    try {
      if (editingRecipe) {
        await recipeRepository.update(editingRecipe.id, {
          name,
          servings,
          ingredients: draftIngredients,
          instructions,
        });
      } else {
        await recipeRepository.create({
          name,
          servings,
          ingredients: draftIngredients,
          instructions,
        });
      }
      setEditorOpen(false);
      showToast("Rezept gespeichert.");
    } catch {
      setEditorError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecipe() {
    if (!deleteTarget) return;
    try {
      await recipeRepository.delete(deleteTarget.id);
      setDeleteTarget(null);
      setEditorOpen(false);
      showToast("Rezept gelöscht.");
    } catch {
      showToast("Rezept konnte nicht gelöscht werden. Bitte versuche es erneut.");
    }
  }

  function openLogSheet(recipe: Recipe) {
    setLogRecipe(recipe);
    setLogMealType("lunch");
    setLogPortions(1);
  }

  /**
   * Logs the recipe for today as ONE snapshot entry: per-portion values × count.
   * amountG = total ingredient grams × (portions / servings), so the entry
   * carries a real weight instead of an ugly 0.
   */
  async function handleLogMeal() {
    if (!logRecipe || logging) return;
    setLogging(true);
    try {
      const { totals, totalGrams } = recipeTotals(logRecipe.ingredients, foodById);
      const factor = logPortions / logRecipe.servings;
      const entry: MealFoodEntry = {
        id: newId(),
        foodId: logRecipe.id,
        foodName: `${logRecipe.name} (Rezept)`,
        amountG: roundTo(totalGrams * factor, 1),
        kcal: roundTo(totals.kcal * factor, 1),
        protein: roundTo(totals.protein * factor, 2),
        carbs: roundTo(totals.carbs * factor, 2),
        fat: roundTo(totals.fat * factor, 2),
      };
      const today = getLocalDateKey();
      const existing = await mealRepository.findByDateAndType(today, logMealType);
      if (existing) {
        await mealRepository.update(existing.id, { entries: [...existing.entries, entry] });
      } else {
        await mealRepository.create({ date: today, mealType: logMealType, entries: [entry] });
      }
      setLogRecipe(null);
      showToast("Mahlzeit hinzugefügt.");
    } catch {
      showToast("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setLogging(false);
    }
  }

  const draft = recipeTotals(draftIngredients, foodById);
  const draftServings = Number(servingsInput.trim());
  const draftPerPortionOk = Number.isInteger(draftServings) && draftServings >= 1;

  const logTotals = logRecipe ? recipeTotals(logRecipe.ingredients, foodById) : null;
  const logFactor = logRecipe ? logPortions / logRecipe.servings : 0;

  const trimmedIngredientQuery = ingredientQuery.trim();
  const visibleIngredientResults = (ingredientResults ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Rezepte"
        subtitle={recipes ? `${recipes.length} Rezepte` : undefined}
        trailing={
          <IconButton label="Rezept erstellen" onClick={() => openEditor(null)}>
            <Plus size={22} />
          </IconButton>
        }
      />

      {recipes === undefined || foods === undefined ? (
        <LoadingState rows={4} />
      ) : recipes.length === 0 ? (
        <Card>
          <EmptyState
            icon={CookingPot}
            title="Noch keine Rezepte"
            text="Lege dein erstes Rezept mit Zutaten an — die Nährwerte pro Portion werden automatisch berechnet."
            action={{ label: "Rezept erstellen", onClick: () => openEditor(null) }}
          />
        </Card>
      ) : (
        <Card>
          {recipes.map((recipe) => {
            const { totals } = recipeTotals(recipe.ingredients, foodById);
            const perPortionKcal = totals.kcal / recipe.servings;
            return (
              <div className="list-row" key={recipe.id}>
                <button
                  type="button"
                  className="list-row__body"
                  style={{ textAlign: "left", minHeight: 44 }}
                  onClick={() => openEditor(recipe)}
                >
                  <span className="list-row__title" style={{ display: "block" }}>
                    {recipe.name}
                  </span>
                  <span className="list-row__subtitle" style={{ display: "block" }}>
                    {recipe.servings === 1 ? "1 Portion" : `${recipe.servings} Portionen`} ·{" "}
                    {formatKcal(perPortionKcal)}/Portion
                  </span>
                </button>
                <span className="list-row__trailing">
                  <IconButton
                    label={`${recipe.name} als Mahlzeit eintragen`}
                    onClick={() => openLogSheet(recipe)}
                  >
                    <Utensils size={20} />
                  </IconButton>
                </span>
              </div>
            );
          })}
        </Card>
      )}

      <BottomSheet
        open={editorOpen}
        title={editingRecipe ? "Rezept bearbeiten" : "Neues Rezept"}
        onClose={() => setEditorOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name" error={editorError}>
            {(id) => (
              <TextInput
                id={id}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="z. B. Reispfanne mit Hähnchen"
              />
            )}
          </Field>

          <Field label="Portionen">
            {(id) => (
              <IntegerInput
                id={id}
                value={servingsInput}
                onChange={(e) => setServingsInput(e.target.value)}
                placeholder="z. B. 2"
              />
            )}
          </Field>

          <div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Zutaten</p>
            {draftIngredients.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-soft)" }}>Noch keine Zutaten.</p>
            ) : (
              <Card flat>
                {draftIngredients.map((ingredient) => {
                  const food = foodById.get(ingredient.foodId);
                  const foodName = food ? food.name : "Gelöschtes Lebensmittel";
                  return (
                    <div className="list-row" key={ingredient.id}>
                      <span className="list-row__body" style={{ display: "block" }}>
                        <span className="list-row__title" style={{ display: "block", fontSize: 15 }}>
                          {foodName}
                        </span>
                        <span className="list-row__subtitle" style={{ display: "block" }}>
                          {formatGrams(ingredient.amountG, 0)}
                        </span>
                      </span>
                      <span className="list-row__trailing">
                        <IconButton
                          label={`Zutat ${foodName} entfernen`}
                          onClick={() =>
                            setDraftIngredients(
                              draftIngredients.filter((i) => i.id !== ingredient.id),
                            )
                          }
                        >
                          <X size={18} />
                        </IconButton>
                      </span>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>

          <Field label="Zutat suchen" error={ingredientError}>
            {(id) => (
              <TextInput
                id={id}
                value={ingredientQuery}
                onChange={(e) => setIngredientQuery(e.target.value)}
                placeholder="Name, Marke oder Barcode"
                enterKeyHint="search"
              />
            )}
          </Field>

          {ingredientFood === null ? (
            visibleIngredientResults.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {trimmedIngredientQuery === ""
                  ? "Noch keine Lebensmittel vorhanden."
                  : `Für „${trimmedIngredientQuery}“ wurde nichts gefunden.`}
              </p>
            ) : (
              <Card flat>
                {visibleIngredientResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    className="list-row"
                    onClick={() => {
                      setIngredientFood(food);
                      setIngredientAmount(
                        String(
                          food.servingSizeG && food.servingSizeG > 0 ? food.servingSizeG : 100,
                        ).replace(".", ","),
                      );
                      setIngredientError(undefined);
                    }}
                  >
                    <span className="list-row__body" style={{ display: "block", textAlign: "left" }}>
                      <span className="list-row__title" style={{ display: "block", fontSize: 15 }}>
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
                ))}
              </Card>
            )
          ) : (
            <>
              <Field label={`Menge (g) — ${ingredientFood.name}`}>
                {(id) => (
                  <NumberInput
                    id={id}
                    value={ingredientAmount}
                    onChange={(e) => setIngredientAmount(e.target.value)}
                    placeholder="z. B. 150"
                  />
                )}
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Button small autoWidth onClick={addIngredient}>
                  Zutat hinzufügen
                </Button>
                <Button small autoWidth variant="ghost" onClick={() => setIngredientFood(null)}>
                  Andere wählen
                </Button>
              </div>
            </>
          )}

          <Field label="Zubereitung (ein Schritt pro Zeile)">
            {(id) => (
              <textarea
                id={id}
                className="input"
                rows={4}
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                placeholder={"Reis kochen\nHähnchen anbraten\nAlles vermengen"}
                style={{ paddingTop: 12, paddingBottom: 12, resize: "vertical" }}
              />
            )}
          </Field>

          {draftIngredients.length > 0 && draftPerPortionOk ? (
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Pro Portion: {formatKcal(draft.totals.kcal / draftServings)} ·{" "}
              {formatGrams(draft.totals.protein / draftServings)} Protein ·{" "}
              {formatGrams(draft.totals.carbs / draftServings)} KH ·{" "}
              {formatGrams(draft.totals.fat / draftServings)} Fett
            </p>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button disabled={saving} onClick={() => void handleSaveRecipe()}>
              {saving ? "Wird gespeichert…" : "Rezept speichern"}
            </Button>
            {editingRecipe ? (
              <Button variant="danger" onClick={() => setDeleteTarget(editingRecipe)}>
                Rezept löschen
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={logRecipe !== null}
        title={logRecipe ? `${logRecipe.name} eintragen` : undefined}
        onClose={() => setLogRecipe(null)}
      >
        {logRecipe && logTotals ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="chip-row" role="group" aria-label="Mahlzeit wählen">
              {MEAL_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={mealTypeLabels[type]}
                  selected={type === logMealType}
                  onClick={() => setLogMealType(type)}
                />
              ))}
            </div>

            <Stepper
              value={logPortions}
              step={1}
              min={1}
              decimals={0}
              inputMode="numeric"
              unit={logPortions === 1 ? "Portion" : "Portionen"}
              label="Portionen"
              onChange={setLogPortions}
            />

            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {formatKcal(logTotals.totals.kcal * logFactor)} ·{" "}
              {formatGrams(logTotals.totals.protein * logFactor)} Protein ·{" "}
              {formatGrams(logTotals.totals.carbs * logFactor)} KH ·{" "}
              {formatGrams(logTotals.totals.fat * logFactor)} Fett
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button disabled={logging} onClick={() => void handleLogMeal()}>
                {logging ? "Wird gespeichert…" : "Für heute eintragen"}
              </Button>
              <Button variant="ghost" onClick={() => setLogRecipe(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Rezept löschen?"
        text={
          deleteTarget
            ? `Das Rezept „${deleteTarget.name}“ wird dauerhaft gelöscht. Bereits eingetragene Mahlzeiten bleiben erhalten.`
            : ""
        }
        confirmLabel="Löschen"
        danger
        onConfirm={() => void handleDeleteRecipe()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
