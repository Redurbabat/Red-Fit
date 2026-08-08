import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Copy, Plus, ShoppingCart, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet, ConfirmDialog } from "../../../components/feedback/Modal";
import { LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  Chip,
  Field,
  NumberInput,
  SegmentedControl,
  TextInput,
} from "../../../components/ui/inputs";
import type {
  FoodItem,
  LocalDateKey,
  MealPlanDay,
  MealPlanEntry,
  MealType,
  Recipe,
  ShoppingItem,
  ShoppingList,
} from "../../../models";
import { calculateFoodNutrition } from "../../../services/calculations/nutrition";
import { buildShoppingItems } from "../../../services/planning/shoppingFromPlan";
import {
  db,
  foodRepository,
  mealPlanRepository,
  shoppingRepository,
} from "../../../services/storage";
import {
  addDays,
  formatDateShortGerman,
  getDayIndex,
  getLocalDateKey,
  getWeekStart,
  parseDateKey,
  weekdayNameDe,
} from "../../../utils/dates";
import { newId } from "../../../utils/ids";
import { mealTypeLabels } from "../../../utils/labels";
import { formatGrams, formatKcal, parseDecimalInput, roundTo } from "../../../utils/numbers";

/** The four planable slots shown per day (MVP). */
const PLAN_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

type EntryMode = "food" | "note";

function buildWeekDays(weekStart: LocalDateKey): MealPlanDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    entries: [],
  }));
}

export default function MealPlanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [weekStart, setWeekStart] = useState<LocalDateKey>(() =>
    getWeekStart(getLocalDateKey()),
  );

  // undefined = loading, null = no plan stored for this week yet.
  const plan = useLiveQuery(
    async () => (await mealPlanRepository.findByWeekStart(weekStart)) ?? null,
    [weekStart],
  );
  const foods = useLiveQuery(() => db.foodItems.toArray(), []);
  const recipes = useLiveQuery(() => db.recipes.toArray(), []);

  const foodById = useMemo(
    () => new Map((foods ?? []).map((food) => [food.id, food])),
    [foods],
  );
  const recipeById = useMemo(
    () => new Map<string, Recipe>((recipes ?? []).map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

  // ---- Add-entry sheet state ----
  const [sheetDate, setSheetDate] = useState<LocalDateKey | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("food");
  const [entryMealType, setEntryMealType] = useState<MealType>("breakfast");
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amountInput, setAmountInput] = useState("100");
  const [labelInput, setLabelInput] = useState("");
  const [entryError, setEntryError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const searchResults = useLiveQuery(() => foodRepository.search(query), [query]);

  // ---- Shopping-list confirmation state ----
  const [pendingItems, setPendingItems] = useState<ShoppingItem[] | null>(null);
  const [latestList, setLatestList] = useState<ShoppingList | null>(null);

  // ---- Day-copy state ----
  const [copySourceDate, setCopySourceDate] = useState<LocalDateKey | null>(null);

  // Previous week's plan — offered as a template when this week is still empty.
  const previousPlan = useLiveQuery(
    async () => (await mealPlanRepository.findByWeekStart(addDays(weekStart, -7))) ?? null,
    [weekStart],
  );

  const days: MealPlanDay[] = useMemo(() => {
    const defaults = buildWeekDays(weekStart);
    if (!plan) return defaults;
    return defaults.map(
      (day) => plan.days.find((planDay) => planDay.date === day.date) ?? day,
    );
  }, [plan, weekStart]);

  const isCurrentWeek = weekStart === getWeekStart(getLocalDateKey());
  const weekTitle = `${formatDateShortGerman(weekStart)} – ${formatDateShortGerman(addDays(weekStart, 6))}`;

  function openSheet(date: LocalDateKey) {
    setSheetDate(date);
    setEntryMode("food");
    setEntryMealType("breakfast");
    setQuery("");
    setSelectedFood(null);
    setAmountInput("100");
    setLabelInput("");
    setEntryError(undefined);
  }

  function closeSheet() {
    setSheetDate(null);
  }

  function selectFood(food: FoodItem) {
    setSelectedFood(food);
    setAmountInput(
      String(food.servingSizeG && food.servingSizeG > 0 ? food.servingSizeG : 100).replace(".", ","),
    );
    setEntryError(undefined);
  }

  async function handleSaveEntry() {
    if (!sheetDate || saving) return;

    let entry: MealPlanEntry;
    if (entryMode === "food") {
      if (!selectedFood) {
        setEntryError("Bitte wähle ein Lebensmittel aus.");
        return;
      }
      const amount = parseDecimalInput(amountInput);
      if (amount == null || amount <= 0) {
        setEntryError("Bitte gib eine Menge über 0 g ein.");
        return;
      }
      entry = {
        id: newId(),
        mealType: entryMealType,
        foodId: selectedFood.id,
        amountG: roundTo(amount, 1),
      };
    } else {
      const label = labelInput.trim();
      if (label === "") {
        setEntryError("Bitte gib einen Text für die Notiz ein.");
        return;
      }
      entry = { id: newId(), mealType: entryMealType, label };
    }

    setSaving(true);
    try {
      // Read-modify-write on the fresh DB state inside one transaction so
      // quick consecutive edits never overwrite each other with stale state.
      await db.transaction("rw", db.mealPlans, async () => {
        // The plan is created on demand with the first entry of the week.
        let current = await mealPlanRepository.findByWeekStart(weekStart);
        if (!current) {
          current = await mealPlanRepository.create({
            name: `Woche ${weekStart}`,
            weekStart,
            days: buildWeekDays(weekStart),
          });
        }
        let matched = false;
        const nextDays = current.days.map((day) => {
          if (day.date !== sheetDate) return day;
          matched = true;
          return { ...day, entries: [...day.entries, entry] };
        });
        if (!matched) nextDays.push({ date: sheetDate, entries: [entry] });
        await mealPlanRepository.update(current.id, { days: nextDays });
      });
      closeSheet();
      showToast("Eintrag hinzugefügt.");
    } catch {
      setEntryError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(date: LocalDateKey, entryId: string) {
    if (!plan) return;
    const planId = plan.id;
    try {
      // Build nextDays from the fresh DB state (not the rendered liveQuery
      // plan) inside one transaction, so removing two entries back-to-back
      // never resurrects the first one from a stale snapshot.
      await db.transaction("rw", db.mealPlans, async () => {
        const current = await mealPlanRepository.get(planId);
        if (!current) return;
        const nextDays = current.days.map((day) =>
          day.date === date
            ? { ...day, entries: day.entries.filter((e) => e.id !== entryId) }
            : day,
        );
        await mealPlanRepository.update(planId, { days: nextDays });
      });
    } catch {
      showToast("Eintrag konnte nicht entfernt werden. Bitte versuche es erneut.");
    }
  }

  /** Copy all entries of one day onto another day (entries get fresh ids). */
  async function copyDayEntries(sourceDate: LocalDateKey, targetDate: LocalDateKey) {
    try {
      await db.transaction("rw", db.mealPlans, async () => {
        const current = await mealPlanRepository.findByWeekStart(weekStart);
        if (!current) return;
        const source = current.days.find((day) => day.date === sourceDate);
        if (!source || source.entries.length === 0) return;
        const copies: MealPlanEntry[] = source.entries.map((entry) => ({
          ...entry,
          id: newId(),
        }));
        let matched = false;
        const nextDays = current.days.map((day) => {
          if (day.date !== targetDate) return day;
          matched = true;
          return { ...day, entries: [...day.entries, ...copies] };
        });
        if (!matched) nextDays.push({ date: targetDate, entries: copies });
        await mealPlanRepository.update(current.id, { days: nextDays });
      });
      setCopySourceDate(null);
      showToast("Tag kopiert.");
    } catch {
      showToast("Kopieren fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  /** Adopt the previous week's plan as a template for this (empty) week. */
  async function adoptPreviousWeek() {
    if (!previousPlan) return;
    try {
      await db.transaction("rw", db.mealPlans, async () => {
        const source = await mealPlanRepository.get(previousPlan.id);
        if (!source) return;
        const shiftedDays: MealPlanDay[] = buildWeekDays(weekStart).map((day) => {
          const sourceDay = source.days.find(
            (d) => d.date === addDays(day.date, -7),
          );
          return {
            date: day.date,
            entries: (sourceDay?.entries ?? []).map((entry) => ({
              ...entry,
              id: newId(),
            })),
          };
        });
        const current = await mealPlanRepository.findByWeekStart(weekStart);
        if (current) {
          // Merge: only fill days that are still empty (never overwrite).
          const nextDays = buildWeekDays(weekStart).map((day) => {
            const existing = current.days.find((d) => d.date === day.date);
            if (existing && existing.entries.length > 0) return existing;
            return shiftedDays.find((d) => d.date === day.date) ?? day;
          });
          await mealPlanRepository.update(current.id, { days: nextDays });
        } else {
          await mealPlanRepository.create({
            name: `Woche ${weekStart}`,
            weekStart,
            days: shiftedDays,
          });
        }
      });
      showToast("Vorwoche übernommen.");
    } catch {
      showToast("Übernehmen fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  async function handleCreateShoppingList() {
    if (!plan) {
      showToast("Der Plan enthält noch keine Einträge.");
      return;
    }
    const items = buildShoppingItems(plan, foods ?? [], recipes ?? []);
    if (items.length === 0) {
      showToast("Der Plan enthält noch keine Einträge.");
      return;
    }
    try {
      const lists = await shoppingRepository.listNewestFirst();
      if (lists.length > 0) {
        setLatestList(lists[0]);
        setPendingItems(items);
      } else {
        await createNewList(items);
      }
    } catch {
      showToast("Einkaufsliste konnte nicht erstellt werden. Bitte versuche es erneut.");
    }
  }

  async function createNewList(items: ShoppingItem[]) {
    try {
      await shoppingRepository.create({
        title: `Einkauf ${formatDateShortGerman(weekStart)}`,
        weekStart,
        items,
      });
      setPendingItems(null);
      showToast("Einkaufsliste erstellt.");
      navigate("/shopping");
    } catch {
      showToast("Einkaufsliste konnte nicht erstellt werden. Bitte versuche es erneut.");
    }
  }

  async function appendToLatestList(items: ShoppingItem[]) {
    if (!latestList) return;
    try {
      await shoppingRepository.update(latestList.id, {
        items: [...latestList.items, ...items],
      });
      setPendingItems(null);
      showToast("Zur bestehenden Liste hinzugefügt.");
      navigate("/shopping");
    } catch {
      showToast("Einkaufsliste konnte nicht aktualisiert werden. Bitte versuche es erneut.");
    }
  }

  const trimmedQuery = query.trim();
  const visibleResults = (searchResults ?? []).slice(0, 6);

  return (
    <>
      <PageHeader title="Essensplan" subtitle={isCurrentWeek ? "Diese Woche" : undefined} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <IconButton label="Vorherige Woche" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft size={22} />
        </IconButton>
        <span style={{ fontWeight: 600 }}>{weekTitle}</span>
        <IconButton label="Nächste Woche" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight size={22} />
        </IconButton>
      </div>

      {plan === undefined || foods === undefined ? (
        <LoadingState rows={5} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {days.every((day) => day.entries.length === 0) &&
          (previousPlan?.days.some((day) => day.entries.length > 0) ?? false) ? (
            <Button variant="secondary" onClick={() => void adoptPreviousWeek()}>
              Vorwoche als Vorlage übernehmen
            </Button>
          ) : null}

          {days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              foodById={foodById}
              recipeById={recipeById}
              onAdd={() => openSheet(day.date)}
              onCopy={day.entries.length > 0 ? () => setCopySourceDate(day.date) : undefined}
              onRemoveEntry={(entryId) => void removeEntry(day.date, entryId)}
            />
          ))}

          <Button variant="secondary" onClick={() => void handleCreateShoppingList()}>
            <ShoppingCart size={18} aria-hidden="true" style={{ marginRight: 8 }} />
            Einkaufsliste erstellen
          </Button>
        </div>
      )}

      <BottomSheet
        open={sheetDate !== null}
        title={
          sheetDate
            ? `Eintrag für ${weekdayNameDe(getDayIndex(parseDateKey(sheetDate)))}, ${formatDateShortGerman(sheetDate)}`
            : undefined
        }
        onClose={closeSheet}
      >
        {sheetDate ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="chip-row" role="group" aria-label="Mahlzeit wählen">
              {PLAN_MEAL_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={mealTypeLabels[type]}
                  selected={type === entryMealType}
                  onClick={() => setEntryMealType(type)}
                />
              ))}
            </div>

            <SegmentedControl<EntryMode>
              options={[
                { value: "food", label: "Lebensmittel" },
                { value: "note", label: "Notiz" },
              ]}
              value={entryMode}
              onChange={(mode) => {
                setEntryMode(mode);
                setEntryError(undefined);
              }}
              ariaLabel="Art des Eintrags"
            />

            {entryMode === "food" ? (
              <>
                <Field label="Lebensmittel suchen">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Name, Marke oder Barcode"
                      enterKeyHint="search"
                    />
                  )}
                </Field>

                {visibleResults.length === 0 ? (
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                    {trimmedQuery === ""
                      ? "Noch keine Lebensmittel vorhanden."
                      : `Für „${trimmedQuery}“ wurde nichts gefunden.`}
                  </p>
                ) : (
                  <Card flat>
                    {visibleResults.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        className="list-row"
                        onClick={() => selectFood(food)}
                        aria-pressed={selectedFood?.id === food.id}
                      >
                        <span className="list-row__body" style={{ display: "block", textAlign: "left" }}>
                          <span
                            className="list-row__title"
                            style={{
                              display: "block",
                              color: selectedFood?.id === food.id ? "var(--accent)" : undefined,
                            }}
                          >
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
                )}

                {selectedFood ? (
                  <>
                    <Field label={`Menge (g) — ${selectedFood.name}`} error={entryError}>
                      {(id) => (
                        <NumberInput
                          id={id}
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          placeholder="z. B. 150"
                        />
                      )}
                    </Field>
                    <EntryLiveNutrition food={selectedFood} amountInput={amountInput} />
                  </>
                ) : entryError ? (
                  <p className="field__error">{entryError}</p>
                ) : null}
              </>
            ) : (
              <Field label="Notiz" error={entryError}>
                {(id) => (
                  <TextInput
                    id={id}
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="z. B. Auswärts essen"
                  />
                )}
              </Field>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <Button disabled={saving} onClick={() => void handleSaveEntry()}>
                {saving ? "Wird gespeichert…" : "Eintrag speichern"}
              </Button>
              <Button variant="ghost" onClick={closeSheet}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={copySourceDate !== null}
        title={
          copySourceDate
            ? `${weekdayNameDe(getDayIndex(parseDateKey(copySourceDate)))} kopieren nach …`
            : undefined
        }
        onClose={() => setCopySourceDate(null)}
      >
        {copySourceDate ? (
          <div>
            {days
              .filter((day) => day.date !== copySourceDate)
              .map((day) => (
                <button
                  key={day.date}
                  type="button"
                  className="list-row"
                  onClick={() => void copyDayEntries(copySourceDate, day.date)}
                >
                  <span className="list-row__body">
                    <span className="list-row__title">
                      {weekdayNameDe(getDayIndex(parseDateKey(day.date)))}
                    </span>
                    <span className="list-row__subtitle">
                      {formatDateShortGerman(day.date)}
                      {day.entries.length > 0
                        ? ` · ${day.entries.length === 1 ? "1 Eintrag" : `${day.entries.length} Einträge`} (wird ergänzt)`
                        : " · leer"}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={pendingItems !== null}
        title="Bestehende Liste gefunden"
        text="Es gibt bereits eine Einkaufsliste. Soll eine neue Liste erstellt werden oder sollen die Artikel zur bestehenden Liste hinzugefügt werden?"
        confirmLabel="Neue Liste erstellen"
        onConfirm={() => {
          if (pendingItems) void createNewList(pendingItems);
        }}
        extraAction={{
          label: "Zu bestehender hinzufügen",
          onClick: () => {
            if (pendingItems) void appendToLatestList(pendingItems);
          },
        }}
        onCancel={() => setPendingItems(null)}
      />
    </>
  );
}

interface DayCardProps {
  day: MealPlanDay;
  foodById: Map<string, FoodItem>;
  recipeById: Map<string, Recipe>;
  onAdd: () => void;
  onCopy?: () => void;
  onRemoveEntry: (entryId: string) => void;
}

function DayCard({ day, foodById, recipeById, onAdd, onCopy, onRemoveEntry }: DayCardProps) {
  const date = parseDateKey(day.date);
  const isToday = day.date === getLocalDateKey();

  // Day macros: sum over food entries only (notes and recipes carry no amount here).
  let kcal = 0;
  let protein = 0;
  for (const entry of day.entries) {
    if (!entry.foodId || !entry.amountG) continue;
    const food = foodById.get(entry.foodId);
    if (!food) continue;
    const n = calculateFoodNutrition(food, entry.amountG);
    kcal += n.kcal;
    protein += n.protein;
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, color: isToday ? "var(--accent)" : undefined }}>
            {weekdayNameDe(getDayIndex(date))}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              {" "}
              · {formatDateShortGerman(day.date)}
              {isToday ? " · Heute" : ""}
            </span>
          </p>
          {kcal > 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {formatKcal(kcal)} · {formatGrams(protein, 0)} P
            </p>
          ) : null}
        </div>
        {onCopy ? (
          <IconButton
            label={`${weekdayNameDe(getDayIndex(date))} auf anderen Tag kopieren`}
            onClick={onCopy}
          >
            <Copy size={18} />
          </IconButton>
        ) : null}
        <IconButton label={`Eintrag für ${weekdayNameDe(getDayIndex(date))} hinzufügen`} onClick={onAdd}>
          <Plus size={20} />
        </IconButton>
      </div>

      {PLAN_MEAL_TYPES.map((mealType) => {
        const entries = day.entries.filter((entry) => entry.mealType === mealType);
        return (
          <div key={mealType} style={{ marginTop: 10 }}>
            <p
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--text-soft)",
              }}
            >
              {mealTypeLabels[mealType]}
            </p>
            {entries.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-soft)" }}>–</p>
            ) : (
              entries.map((entry) => (
                <PlanEntryRow
                  key={entry.id}
                  entry={entry}
                  foodById={foodById}
                  recipeById={recipeById}
                  onRemove={() => onRemoveEntry(entry.id)}
                />
              ))
            )}
          </div>
        );
      })}
    </Card>
  );
}

interface PlanEntryRowProps {
  entry: MealPlanEntry;
  foodById: Map<string, FoodItem>;
  recipeById: Map<string, Recipe>;
  onRemove: () => void;
}

function PlanEntryRow({ entry, foodById, recipeById, onRemove }: PlanEntryRowProps) {
  let title = entry.label ?? "Eintrag";
  let subtitle: string | null = null;

  if (entry.foodId) {
    const food = foodById.get(entry.foodId);
    title = food ? food.name : "Gelöschtes Lebensmittel";
    subtitle = entry.amountG ? formatGrams(entry.amountG, 0) : null;
  } else if (entry.recipeId) {
    const recipe = recipeById.get(entry.recipeId);
    title = recipe ? `${recipe.name} (Rezept)` : "Gelöschtes Rezept";
  }

  return (
    <div className="list-row">
      <span className="list-row__body" style={{ display: "block" }}>
        <span className="list-row__title" style={{ display: "block", fontSize: 15 }}>
          {title}
        </span>
        {subtitle ? (
          <span className="list-row__subtitle" style={{ display: "block" }}>
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="list-row__trailing">
        <IconButton label={`${title} entfernen`} onClick={onRemove}>
          <X size={18} />
        </IconButton>
      </span>
    </div>
  );
}

/** Live line like "296 kcal · 10,4 g Protein" for the picked amount. */
function EntryLiveNutrition({ food, amountInput }: { food: FoodItem; amountInput: string }) {
  const value = parseDecimalInput(amountInput);
  if (value == null || value <= 0) return null;
  const n = calculateFoodNutrition(food, value);
  return (
    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
      {formatKcal(n.kcal)} · {formatGrams(n.protein)} Protein · {formatGrams(n.carbs)} KH ·{" "}
      {formatGrams(n.fat)} Fett
    </p>
  );
}
