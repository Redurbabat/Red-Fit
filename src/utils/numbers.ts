/** German decimal formatting: 10.4 → "10,4". */
function deNumber(value: number, maxDecimals: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** kcal: no decimals for display. */
export function formatKcal(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

/** Macros: one decimal for display. */
export function formatGrams(grams: number, decimals = 1): string {
  return `${deNumber(roundTo(grams, decimals), decimals)} g`;
}

export function formatKg(kg: number): string {
  return `${deNumber(roundTo(kg, 1), 1)} kg`;
}

export function formatLiters(ml: number): string {
  return `${deNumber(roundTo(ml / 1000, 1), 1)} L`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Clamp helper used by steppers — never below `min`. */
export function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

/** Parse a user-typed decimal ("80,5" or "80.5"); returns null when invalid. */
export function parseDecimalInput(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
