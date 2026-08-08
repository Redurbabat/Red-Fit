import type { FoodItem } from "../../models/nutrition";
import { roundTo } from "../../utils/numbers";

/**
 * Optional online lookup for barcodes the local library doesn't know.
 * Strictly an enhancement: failures never block nutrition tracking, results
 * are shown as a preview and only stored locally after user confirmation.
 */

export interface FoodLookupResult {
  name: string;
  brand?: string;
  barcode: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  sugarPer100g?: number;
  fiberPer100g?: number;
  saltPer100g?: number;
  servingSizeG?: number;
}

interface RemoteNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  salt_100g?: number;
}

interface RemoteProduct {
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: RemoteNutriments;
}

interface RemoteResponse {
  status?: number;
  product?: RemoteProduct;
}

const LOOKUP_TIMEOUT_MS = 8000;

function asNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Look up a barcode online. Returns null when offline, not found, or the
 * data is too incomplete to be trustworthy (never adopt blind partial data).
 */
export async function lookupBarcodeOnline(
  barcode: string,
): Promise<FoodLookupResult | null> {
  const code = barcode.trim();
  if (!code) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_quantity,nutriments`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as RemoteResponse;
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const n = p.nutriments ?? {};
    const kcal = asNumber(n["energy-kcal_100g"]);
    const protein = asNumber(n.proteins_100g);
    const carbs = asNumber(n.carbohydrates_100g);
    const fat = asNumber(n.fat_100g);
    const name = p.product_name?.trim();

    // Minimum viable data: name + all four core values, else reject.
    if (!name || kcal == null || protein == null || carbs == null || fat == null) {
      return null;
    }

    return {
      name,
      brand: p.brands?.split(",")[0]?.trim() || undefined,
      barcode: code,
      kcalPer100g: roundTo(kcal, 1),
      proteinPer100g: roundTo(protein, 1),
      carbsPer100g: roundTo(carbs, 1),
      fatPer100g: roundTo(fat, 1),
      sugarPer100g: asNumber(n.sugars_100g),
      fiberPer100g: asNumber(n.fiber_100g),
      saltPer100g: asNumber(n.salt_100g),
      servingSizeG: asNumber(p.serving_quantity),
    };
  } catch {
    // Offline, timeout, CORS, malformed JSON — all equal: no result, no error UI.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Convert a confirmed lookup into a FoodItem draft for the repository. */
export function lookupToFoodDraft(
  result: FoodLookupResult,
): Omit<FoodItem, "id" | "createdAt" | "updatedAt"> {
  return {
    barcode: result.barcode,
    name: result.name,
    brand: result.brand,
    category: "other",
    kcalPer100g: result.kcalPer100g,
    proteinPer100g: result.proteinPer100g,
    carbsPer100g: result.carbsPer100g,
    fatPer100g: result.fatPer100g,
    sugarPer100g: result.sugarPer100g,
    fiberPer100g: result.fiberPer100g,
    saltPer100g: result.saltPer100g,
    servingSizeG: result.servingSizeG,
    source: "openFoodFacts",
  };
}
