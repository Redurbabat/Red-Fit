/**
 * Barbell plate math: which plates go on each side for a target weight.
 * Greedy over the available plate sizes (largest first), pairs only —
 * the classic gym loading scheme.
 */

export const DEFAULT_BAR_KG = 20;

/** Common kg plate sizes available per side (gym standard set). */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export interface PlateBreakdown {
  /** Plates on ONE side, largest first (e.g. [25, 10, 2.5]). */
  perSide: number[];
  /** Weight actually achievable with bar + paired plates. */
  achievableKg: number;
  /** target − achievable (0 when the target is loadable exactly). */
  missingKg: number;
  barKg: number;
}

export function calculatePlates(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG,
  availablePlatesKg: readonly number[] = DEFAULT_PLATES_KG,
): PlateBreakdown {
  const perSide: number[] = [];
  const sorted = [...availablePlatesKg].sort((a, b) => b - a);

  // Weight the plates must cover on each side.
  let remaining = Math.max(0, (targetKg - barKg) / 2);
  for (const plate of sorted) {
    // Greedy: put on as many of this size as still fit (per side).
    while (remaining >= plate - 1e-9) {
      perSide.push(plate);
      remaining -= plate;
    }
  }

  const perSideSum = perSide.reduce((sum, p) => sum + p, 0);
  const achievableKg = barKg + perSideSum * 2;
  return {
    perSide,
    achievableKg,
    missingKg: Math.round(Math.max(0, targetKg - achievableKg) * 100) / 100,
    barKg,
  };
}
