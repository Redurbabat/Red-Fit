import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "../../../components/feedback/Modal";
import { EmptyState, LoadingState } from "../../../components/feedback/states";
import { useToast } from "../../../components/feedback/ToastProvider";
import { PageHeader, SectionHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import {
  Field,
  IntegerInput,
  NumberInput,
  SelectInput,
  TextInput,
} from "../../../components/ui/inputs";
import { FOOD_CATEGORIES, type FoodCategory, type FoodItem } from "../../../models";
import { foodRepository } from "../../../services/storage";
import { foodCategoryLabels } from "../../../utils/labels";
import { parseDecimalInput } from "../../../utils/numbers";

interface FormValues {
  name: string;
  brand: string;
  barcode: string;
  category: FoodCategory;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  sugar: string;
  fiber: string;
  salt: string;
  servingSize: string;
}

type FieldKey = keyof FormValues;
type FormErrors = Partial<Record<FieldKey, string>>;

/** What gets persisted — nutrient truth is always per 100 g. */
interface ParsedFood {
  name: string;
  brand?: string;
  barcode?: string;
  category: FoodCategory;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  sugarPer100g?: number;
  fiberPer100g?: number;
  saltPer100g?: number;
  servingSizeG?: number;
}

const EMPTY_VALUES: FormValues = {
  name: "",
  brand: "",
  barcode: "",
  category: "other",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
  sugar: "",
  fiber: "",
  salt: "",
  servingSize: "",
};

/** Number → text-input value with German comma. */
function toInputValue(value: number | undefined): string {
  return value == null ? "" : String(value).replace(".", ",");
}

function toFormValues(food: FoodItem): FormValues {
  return {
    name: food.name,
    brand: food.brand ?? "",
    barcode: food.barcode ?? "",
    category: food.category,
    kcal: toInputValue(food.kcalPer100g),
    protein: toInputValue(food.proteinPer100g),
    carbs: toInputValue(food.carbsPer100g),
    fat: toInputValue(food.fatPer100g),
    sugar: toInputValue(food.sugarPer100g),
    fiber: toInputValue(food.fiberPer100g),
    salt: toInputValue(food.saltPer100g),
    servingSize: toInputValue(food.servingSizeG),
  };
}

function validateForm(values: FormValues): { data: ParsedFood | null; errors: FormErrors } {
  const errors: FormErrors = {};

  const name = values.name.trim();
  if (name === "") errors.name = "Bitte gib einen Namen ein.";

  const required = (raw: string, key: FieldKey): number => {
    const value = parseDecimalInput(raw);
    if (value == null || value < 0) {
      errors[key] = "Bitte gib einen Wert ab 0 ein.";
      return 0;
    }
    return value;
  };

  const optional = (raw: string, key: FieldKey): number | undefined => {
    if (raw.trim() === "") return undefined;
    const value = parseDecimalInput(raw);
    if (value == null || value < 0) {
      errors[key] = "Bitte gib einen Wert ab 0 ein oder lasse das Feld leer.";
      return undefined;
    }
    return value;
  };

  const brand = values.brand.trim();
  // Barcode stays a STRING so leading zeros survive.
  const barcode = values.barcode.trim();

  const data: ParsedFood = {
    name,
    brand: brand === "" ? undefined : brand,
    barcode: barcode === "" ? undefined : barcode,
    category: values.category,
    kcalPer100g: required(values.kcal, "kcal"),
    proteinPer100g: required(values.protein, "protein"),
    carbsPer100g: required(values.carbs, "carbs"),
    fatPer100g: required(values.fat, "fat"),
    sugarPer100g: optional(values.sugar, "sugar"),
    fiberPer100g: optional(values.fiber, "fiber"),
    saltPer100g: optional(values.salt, "salt"),
    servingSizeG: optional(values.servingSize, "servingSize"),
  };

  return Object.keys(errors).length > 0 ? { data: null, errors } : { data, errors };
}

export default function FoodFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { foodId } = useParams<{ foodId: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = foodId !== undefined;

  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    isEdit ? "loading" : "ready",
  );
  const [values, setValues] = useState<FormValues>(() => ({
    ...EMPTY_VALUES,
    // Prefill from the scanner: /nutrition/foods/new?barcode=…
    barcode: isEdit ? "" : (searchParams.get("barcode") ?? "").trim(),
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!foodId) return;
    let cancelled = false;
    foodRepository
      .get(foodId)
      .then((food) => {
        if (cancelled) return;
        if (!food) {
          setStatus("missing");
          return;
        }
        setValues(toFormValues(food));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [foodId]);

  /**
   * Leave the form after save/delete. navigate(-1) is a dead end on a deep
   * link (fresh tab has no previous entry) — fall back to the food list then.
   */
  function goBack() {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) {
      navigate(-1);
    } else {
      navigate("/nutrition/foods", { replace: true });
    }
  }

  function setField(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    if (saving) return;
    const { data, errors: nextErrors } = validateForm(values);
    setErrors(nextErrors);
    if (!data) {
      showToast(
        "Lebensmittel konnte nicht gespeichert werden. Bitte prüfe die Werte und versuche es erneut.",
      );
      return;
    }
    setSaving(true);
    try {
      if (isEdit && foodId) {
        await foodRepository.update(foodId, data);
      } else {
        await foodRepository.create({ ...data, source: "manual" });
      }
      showToast("Lebensmittel gespeichert.");
      goBack();
    } catch {
      setSaving(false);
      showToast(
        "Lebensmittel konnte nicht gespeichert werden. Bitte prüfe die Werte und versuche es erneut.",
      );
    }
  }

  async function handleDelete() {
    if (!foodId) return;
    setConfirmOpen(false);
    try {
      await foodRepository.delete(foodId);
      showToast("Lebensmittel gelöscht.");
      goBack();
    } catch {
      showToast("Löschen fehlgeschlagen. Bitte versuche es erneut.");
    }
  }

  if (status === "loading") {
    return (
      <>
        <PageHeader title="Lebensmittel bearbeiten" back />
        <LoadingState rows={5} />
      </>
    );
  }

  if (status === "missing") {
    return (
      <>
        <PageHeader title="Lebensmittel" back />
        <EmptyState
          title="Lebensmittel nicht gefunden."
          text="Der Eintrag existiert nicht mehr."
          action={{ label: "Zur Liste", onClick: () => navigate("/nutrition/foods") }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={isEdit ? "Lebensmittel bearbeiten" : "Neues Lebensmittel"}
        back
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name *" error={errors.name}>
          {(id) => (
            <TextInput
              id={id}
              value={values.name}
              placeholder="z. B. Haferflocken"
              onChange={(e) => setField("name", e.target.value)}
            />
          )}
        </Field>

        <Field label="Marke" error={errors.brand}>
          {(id) => (
            <TextInput
              id={id}
              value={values.brand}
              placeholder="z. B. Kölln"
              onChange={(e) => setField("brand", e.target.value)}
            />
          )}
        </Field>

        <Field label="Barcode" error={errors.barcode}>
          {(id) => (
            <IntegerInput
              id={id}
              value={values.barcode}
              placeholder="z. B. 4000521006112"
              onChange={(e) => setField("barcode", e.target.value)}
            />
          )}
        </Field>

        <Field label="Kategorie" error={errors.category}>
          {(id) => (
            <SelectInput
              id={id}
              value={values.category}
              onChange={(e) => setField("category", e.target.value)}
            >
              {FOOD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {foodCategoryLabels[category]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <SectionHeader title="Nährwerte pro 100 g" />

        <Field label="Kalorien (kcal) *" error={errors.kcal}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.kcal}
              placeholder="z. B. 370"
              onChange={(e) => setField("kcal", e.target.value)}
            />
          )}
        </Field>

        <Field label="Protein (g) *" error={errors.protein}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.protein}
              placeholder="z. B. 13"
              onChange={(e) => setField("protein", e.target.value)}
            />
          )}
        </Field>

        <Field label="Kohlenhydrate (g) *" error={errors.carbs}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.carbs}
              placeholder="z. B. 60"
              onChange={(e) => setField("carbs", e.target.value)}
            />
          )}
        </Field>

        <Field label="Fett (g) *" error={errors.fat}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.fat}
              placeholder="z. B. 7"
              onChange={(e) => setField("fat", e.target.value)}
            />
          )}
        </Field>

        <SectionHeader title="Optionale Angaben" />

        <Field label="Zucker (g)" error={errors.sugar}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.sugar}
              onChange={(e) => setField("sugar", e.target.value)}
            />
          )}
        </Field>

        <Field label="Ballaststoffe (g)" error={errors.fiber}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.fiber}
              onChange={(e) => setField("fiber", e.target.value)}
            />
          )}
        </Field>

        <Field label="Salz (g)" error={errors.salt}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.salt}
              onChange={(e) => setField("salt", e.target.value)}
            />
          )}
        </Field>

        <Field label="Portionsgröße (g)" error={errors.servingSize}>
          {(id) => (
            <NumberInput
              id={id}
              value={values.servingSize}
              placeholder="z. B. 50"
              onChange={(e) => setField("servingSize", e.target.value)}
            />
          )}
        </Field>

        <Button disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Wird gespeichert…" : "Lebensmittel speichern"}
        </Button>

        {isEdit ? (
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={18} aria-hidden="true" style={{ marginRight: 6 }} />
            Lebensmittel löschen
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Lebensmittel löschen?"
        text={`„${values.name.trim() || "Dieses Lebensmittel"}“ wird dauerhaft gelöscht. Bereits erfasste Mahlzeiten-Einträge behalten ihre Werte.`}
        confirmLabel="Löschen"
        danger
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
