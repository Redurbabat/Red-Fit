import type { FoodItem } from "../../models";
import { parseDecimalInput, roundTo } from "../../utils/numbers";

/**
 * Parse a pasted ingredient list ("200 g Haferflocken", "1 Banane", …) and
 * match each line against the local food library. No network involved —
 * works with any copied recipe text.
 */

export interface ParsedIngredientLine {
  raw: string;
  /** Detected amount in grams (ml counts as g; kitchen units approximated). */
  amountG?: number;
  /** Ingredient name as written (amount/unit stripped). */
  name: string;
  /** Matched library food, if any. */
  food?: FoodItem;
  /** True when the gram amount is a kitchen-unit approximation (EL/TL/Tasse). */
  approximate?: boolean;
}

/** Kitchen units → grams (water-density approximation, flagged as such). */
const UNIT_TO_GRAMS: Record<string, { grams: number; approximate: boolean }> = {
  g: { grams: 1, approximate: false },
  gramm: { grams: 1, approximate: false },
  kg: { grams: 1000, approximate: false },
  ml: { grams: 1, approximate: true },
  l: { grams: 1000, approximate: true },
  el: { grams: 15, approximate: true },
  tl: { grams: 5, approximate: true },
  tasse: { grams: 240, approximate: true },
  tassen: { grams: 240, approximate: true },
  becher: { grams: 250, approximate: true },
  prise: { grams: 1, approximate: true },
  prisen: { grams: 1, approximate: true },
};

/** "1/2" and common unicode fractions in amounts. */
function parseAmountToken(token: string): number | null {
  const unicode: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
  if (token in unicode) return unicode[token];
  const fraction = token.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator > 0 ? Number(fraction[1]) / denominator : null;
  }
  return parseDecimalInput(token);
}

/** Piece-count lines ("2 Bananen") carry their count here. */
interface ParsedWithPieces {
  amountG?: number;
  name: string;
  approximate?: boolean;
  pieces?: number;
}

/** One line → {amount?, unit?, name}. Handles "200 g Name" and "Name 200 g". */
function parseLine(raw: string): ParsedWithPieces {
  // Normalize bullets and whitespace: "- 200g Haferflocken" → "200g Haferflocken".
  const line = raw.replace(/^[-*•·\s]+/, "").trim();

  // Leading amount: "200 g Name", "200g Name", "1/2 Tasse Name", "1 Banane".
  const leading = line.match(/^([\d.,]+\s*\/\s*\d+|[\d.,]+|[½¼¾⅓⅔])\s*([a-zA-ZäöüÄÖÜ]*)\.?\s+(.+)$/);
  if (leading) {
    const amount = parseAmountToken(leading[1].replace(/\s/g, ""));
    const unitToken = leading[2].toLowerCase();
    const rest = leading[3].trim();
    if (amount != null) {
      const unit = UNIT_TO_GRAMS[unitToken];
      if (unit) {
        return { amountG: roundTo(amount * unit.grams, 1), name: rest, approximate: unit.approximate };
      }
      // No recognized unit → treat token as part of the name ("1 große Banane")
      // and keep the count as "pieces" (resolved against servingSizeG later).
      const name = unitToken ? `${unitToken} ${rest}`.trim() : rest;
      return { name, approximate: true, pieces: amount };
    }
  }

  // Trailing amount: "Haferflocken 200 g" / "Haferflocken, 200g".
  const trailing = line.match(/^(.+?)[,:]?\s+([\d.,]+)\s*(g|gramm|kg|ml|l|el|tl)\.?$/i);
  if (trailing) {
    const amount = parseAmountToken(trailing[2]);
    const unit = UNIT_TO_GRAMS[trailing[3].toLowerCase()];
    if (amount != null && unit) {
      return {
        amountG: roundTo(amount * unit.grams, 1),
        name: trailing[1].trim(),
        approximate: unit.approximate,
      };
    }
  }

  return { name: line };
}

/** Best library match: substring both ways, shortest food name wins. */
export function matchFood(name: string, foods: FoodItem[]): FoodItem | undefined {
  const query = name
    .toLowerCase()
    .replace(/\b(frisch|frische|frischer|groß|große|großer|klein|kleine|kleiner|reif|reife|gehackt|gehackte|getrocknet|getrocknete|rot|rote|roter|grün|grüne|grüner)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (query.length < 3) return undefined;
  const candidates = foods.filter((food) => {
    const foodName = food.name.toLowerCase();
    return foodName.includes(query) || query.includes(foodName.split(" (")[0]);
  });
  return candidates.sort((a, b) => a.name.length - b.name.length)[0];
}

export function parseRecipeText(text: string, foods: FoodItem[]): ParsedIngredientLine[] {
  return text
    .split("\n")
    .map((raw) => raw.trim())
    .filter((raw) => raw !== "")
    .map((raw) => {
      const parsed = parseLine(raw);
      const food = matchFood(parsed.name, foods);
      let amountG = parsed.amountG;
      let approximate = parsed.approximate;
      // Piece counts ("2 Bananen") resolve via the food's serving size.
      if (amountG == null && parsed.pieces != null && food?.servingSizeG) {
        amountG = roundTo(parsed.pieces * food.servingSizeG, 1);
        approximate = true;
      }
      return { raw, name: parsed.name, amountG, food, approximate };
    });
}
