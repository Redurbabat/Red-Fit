import type { EstimateLevel, FoodItem, MealFoodEntry } from "../../models";

/**
 * Dietry-inspired raw/cooked weight conversion.
 * Nutrient labels in RED Fit describe the food as stored (usually raw/dry).
 * These factors represent COOKED weight divided by RAW weight; they are only
 * presented as optional estimates, never applied silently.
 */
export type CookingYieldKind = "absorption" | "evaporation" | "fatLoss";
export interface CookingYieldInfo {
  factor: number;
  kind: CookingYieldKind;
  uncertainty: EstimateLevel;
  label: string;
}
type FoodName = Pick<FoodItem, "name">;
type Rule = CookingYieldInfo & { keywords: readonly string[]; match: "word" | "substring" };

function normalize(text: string): string {
  return text.toLocaleLowerCase("de").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const alreadyPrepared = [
  "gekocht", "gegart", "gebraten", "gedunstet", "geduenstet", "gegrillt",
  "gebacken", "zubereitet", "cooked", "boiled", "roasted", "grilled",
  "baked", "steamed", "fried", "cocido", "hervido", "asado", "cocinado",
  "vorgekocht", "precooked", "pre-cooked", "ready to eat", "verzehrfertig",
  "mikrowelle", "microwave", "instant",
];
const excluded = [
  "salat", "salad", "ensalada", "sauce", "sosse", "suppe", "soup",
  "sopa", "eintopf", "auflauf", "gratin", "pfanne", "curry",
  "risotto", "milchreis", "reisdrink", "rice pudding", "rice cake",
  "reiswaffel", "cracker", "porridge", "muesli", "musli", "muesli",
  "fertig", "gericht", "menu", "paniert", "breaded", "empanado",
  "dose", "canned", "konserve", "lata", "abgetropft", "tiefkuhl",
  "frozen meal", "sushi", "burger", "sandwich", "wrap", "pizza",
  "lasagne", "lasagna", "nugget", "schnitzel", "wurst", "sausage",
  "fischstabchen", "fish finger", "proteinriegel", "cereal bar",
];

const rules: readonly Rule[] = [
  { label: "Nudeln / Pasta", keywords: ["nudel", "pasta", "spaghetti", "makkaroni", "maccheroni", "penne", "fusilli", "farfalle", "rigatoni", "tagliatelle", "linguine", "spatzle", "fideo", "macarron", "espagueti", "tallarin"], match: "substring", factor: 2.2, kind: "absorption", uncertainty: "low" },
  { label: "Reis", keywords: ["reis", "rice", "arroz", "basmati", "jasminreis", "wildreis"], match: "word", factor: 2.6, kind: "absorption", uncertainty: "low" },
  { label: "Hülsenfrüchte", keywords: ["linsen", "lentil", "lenteja", "kichererbs", "chickpea", "garbanzo", "bohnen", "hulsenfruchte", "bean", "beans"], match: "substring", factor: 2.5, kind: "absorption", uncertainty: "low" },
  { label: "Getreide", keywords: ["couscous", "kuskus", "bulgur", "quinoa", "polenta", "griess", "hafer", "oats"], match: "substring", factor: 2.6, kind: "absorption", uncertainty: "low" },
  { label: "Geflügel", keywords: ["hahnchen", "chicken", "pollo", "truthahn", "huhn", "pute", "turkey"], match: "substring", factor: 0.73, kind: "fatLoss", uncertainty: "medium" },
  { label: "Fleisch", keywords: ["hackfleisch", "schwein", "cerdo", "rindfleisch", "beef", "pork", "lamm", "lamb"], match: "substring", factor: 0.72, kind: "fatLoss", uncertainty: "medium" },
  { label: "Fisch", keywords: ["lachs", "salmon", "thunfisch", "kabeljau", "forelle", "fisch", "fish", "pescado", "cod"], match: "substring", factor: 0.82, kind: "evaporation", uncertainty: "low" },
  { label: "Blattgemüse", keywords: ["spinat", "spinach", "espinaca", "mangold"], match: "substring", factor: 0.4, kind: "evaporation", uncertainty: "medium" },
  { label: "Pilze / Zwiebeln", keywords: ["champignon", "mushroom", "zwiebel", "cebolla", "pilze", "onion"], match: "substring", factor: 0.6, kind: "evaporation", uncertainty: "medium" },
  { label: "Kartoffeln", keywords: ["kartoffel", "potato", "patata"], match: "substring", factor: 0.82, kind: "evaporation", uncertainty: "low" },
];

export function getCookingYield(food: FoodName): CookingYieldInfo | null {
  const name = normalize(food.name);
  if (alreadyPrepared.some((word) => name.includes(normalize(word))) ||
      excluded.some((word) => name.includes(normalize(word)))) {
    return null;
  }
  for (const rule of rules) {
    const matched = rule.keywords.some((keyword) => {
      const term = normalize(keyword);
      if (rule.match === "substring") return name.includes(term);
      return new RegExp(`\\b${term}\\b`, "u").test(name);
    });
    if (matched) {
      const { factor, kind, uncertainty, label } = rule;
      return { factor, kind, uncertainty, label };
    }
  }
  return null;
}

/** Reject invalid values rather than introducing NaN or negative calories. */
export function rawEquivalentGrams(weighedGrams: number, factor = 1): number {
  if (!Number.isFinite(weighedGrams) || weighedGrams <= 0 ||
      !Number.isFinite(factor) || factor < 0.1 || factor > 10) {
    throw new RangeError("Invalid weighed amount or cooking yield");
  }
  const equivalent = weighedGrams / factor;
  if (!Number.isFinite(equivalent) || equivalent <= 0) {
    throw new RangeError("Cooking yield overflow");
  }
  return equivalent;
}

const rank: Record<EstimateLevel, number> = {
  none: 0, low: 1, medium: 2, high: 3,
};

export function combinedAmountUncertainty(
  manuallySelected: EstimateLevel,
  yieldUncertainty: EstimateLevel,
): EstimateLevel {
  return rank[manuallySelected] >= rank[yieldUncertainty]
    ? manuallySelected : yieldUncertainty;
}

/**
 * Backward-compatible metadata. amountG remains the raw/equivalent amount
 * used by the frozen nutrient snapshot; the displayed weighed grams are
 * recorded independently only for a cooked-weight entry.
 */
export function displayedMealWeight(
  entry: Pick<MealFoodEntry, "amountG" | "weighedAmountG" | "weighedAs">,
): number {
  return entry.weighedAs === "cooked" && entry.weighedAmountG != null
    ? entry.weighedAmountG : entry.amountG;
}
