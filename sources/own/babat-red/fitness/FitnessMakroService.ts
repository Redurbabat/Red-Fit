import type { MakroSumme, NutritionGoal } from "../models/fitness";

/* ============================================================
 * 🧮 FitnessMakroService — die EINE kanonische Makro-/Kalorien-Logik.
 *
 * Reine Funktionen, kein Speicher. Interne Werte bleiben EXAKT (keine
 * Rundung) — Rundung ausschließlich in der Anzeige. Kanonische Formel:
 *   kcal = Protein·4 + Kohlenhydrate·4 + Fett·9
 * Gegenprobe Seed: 200·4 + 518,75·4 + 125·9 = 4000 kcal.
 *
 * Makroberechnung NIE in UI-Komponenten duplizieren — immer hierüber.
 * ============================================================ */

/** Kanonische Kalorienformel (Atwater, vereinfacht). */
export function kcalAus(proteinG: number, khG: number, fettG: number): number {
  return proteinG * 4 + khG * 4 + fettG * 9;
}

/** Aus Ziel-Kalorien + Protein + Fett die verbleibenden Kohlenhydrate (g).
 * Kann negativ werden (Protein+Fett übersteigen bereits das Kalorienziel). */
export function restKhG(kcal: number, proteinG: number, fettG: number): number {
  return (kcal - proteinG * 4 - fettG * 9) / 4;
}

/** Exakte Summe einer Makro-Liste; kcal wird kanonisch aus der Summe abgeleitet
 * (kein Aufsummieren gerundeter Positions-kcal → keine Drift). */
export function makroSumme(
  posten: ReadonlyArray<{ proteinG: number; khG: number; fettG: number; obstGemuese?: number }>,
): MakroSumme {
  let proteinG = 0;
  let khG = 0;
  let fettG = 0;
  let obstGemuese = 0;
  let hatObst = false;
  for (const p of posten) {
    proteinG += p.proteinG;
    khG += p.khG;
    fettG += p.fettG;
    if (typeof p.obstGemuese === "number") {
      obstGemuese += p.obstGemuese;
      hatObst = true;
    }
  }
  const s: MakroSumme = { proteinG, khG, fettG, kcal: kcalAus(proteinG, khG, fettG) };
  if (hatObst) s.obstGemuese = obstGemuese;
  return s;
}

/** Makros einer Portion um einen Faktor skalieren (kcal kanonisch neu). */
export function skaliereMakro(
  m: { proteinG: number; khG: number; fettG: number; obstGemuese?: number },
  faktor: number,
): MakroSumme {
  const proteinG = m.proteinG * faktor;
  const khG = m.khG * faktor;
  const fettG = m.fettG * faktor;
  const s: MakroSumme = { proteinG, khG, fettG, kcal: kcalAus(proteinG, khG, fettG) };
  if (typeof m.obstGemuese === "number") s.obstGemuese = m.obstGemuese * faktor;
  return s;
}

/** Liegt der Fettwert im (additiven) Zielband [min, max]? */
export function fettImBand(fettG: number, min?: number, max?: number): boolean {
  if (typeof min === "number" && fettG < min) return false;
  if (typeof max === "number" && fettG > max) return false;
  return true;
}

/** Verbleibende Makros gegenüber einem Ziel (kann negativ = Überschreitung). */
export function restMakros(ziel: NutritionGoal, ist: MakroSumme): MakroSumme {
  return {
    proteinG: ziel.proteinG - ist.proteinG,
    khG: ziel.khG - ist.khG,
    fettG: ziel.fettG - ist.fettG,
    kcal: ziel.kcal - ist.kcal,
  };
}

/** Fortschritt in Prozent (roh, ungerundet, nicht gekappt — Anzeige kappt). */
export function prozent(ist: number, ziel: number): number {
  if (!ziel) return 0;
  return (ist / ziel) * 100;
}
