/* ============================================================
 * 📦 FitnessMengenService — Verpackungsrundung & Einheiten-Umrechnung.
 *
 * Reine Funktionen, kein Speicher. Modell (DATA-MODEL §14/§15):
 *   verfügbar     = max(0, vorhanden − reserviert)   // Reserviertes ist gebunden
 *   nochZuKaufen  = max(0, benötigt − verfügbar)
 *   packungen     = ceil(nochZuKaufen / packungsgröße)
 *   gekauft       = packungen · packungsgröße
 *   überschuss    = gekauft − nochZuKaufen
 * Ungültige Packungsgröße (≤ 0) → gueltig:false, keine erfundenen Werte.
 * ============================================================ */

export interface PackungsErgebnis {
  gueltig: boolean;
  /** Menge, die tatsächlich noch fehlt (nach Vorrat/Reservierung). */
  nochZuKaufenMenge: number;
  /** Zu kaufende Packungen (aufgerundet). */
  packungen: number;
  /** Tatsächlich gekaufte Menge (Packungen × Packungsgröße). */
  gekaufteMenge: number;
  /** Überschuss = gekaufte Menge − wirklich benötigte Menge. */
  ueberschuss: number;
}

/** Verpackungsrundung mit Vorrats-/Reservierungs-Abzug. */
export function packungen(
  benoetigt: number,
  packungsgroesse: number,
  vorhanden = 0,
  reserviert = 0,
): PackungsErgebnis {
  const bed = Math.max(0, benoetigt);
  const verfuegbar = Math.max(0, vorhanden - reserviert);
  const nochZuKaufenMenge = Math.max(0, bed - verfuegbar);

  if (!(packungsgroesse > 0)) {
    return { gueltig: false, nochZuKaufenMenge, packungen: 0, gekaufteMenge: 0, ueberschuss: 0 };
  }
  const anzahl = Math.ceil(nochZuKaufenMenge / packungsgroesse);
  const gekaufteMenge = anzahl * packungsgroesse;
  const ueberschuss = gekaufteMenge - nochZuKaufenMenge;
  return { gueltig: true, nochZuKaufenMenge, packungen: anzahl, gekaufteMenge, ueberschuss };
}

/* ---------- Einheiten-Umrechnung (nur eindeutige Fälle) ---------- */

// Basiseinheit je Dimension: Masse = g, Volumen = ml, Stück = stk.
const FAKTOR: Record<string, { dim: "masse" | "volumen" | "stueck"; zuBasis: number }> = {
  mg: { dim: "masse", zuBasis: 0.001 },
  g: { dim: "masse", zuBasis: 1 },
  kg: { dim: "masse", zuBasis: 1000 },
  ml: { dim: "volumen", zuBasis: 1 },
  cl: { dim: "volumen", zuBasis: 10 },
  dl: { dim: "volumen", zuBasis: 100 },
  l: { dim: "volumen", zuBasis: 1000 },
  stk: { dim: "stueck", zuBasis: 1 },
  stück: { dim: "stueck", zuBasis: 1 },
};

function norm(einheit: string): string {
  return einheit.trim().toLowerCase();
}

/** Menge in eine andere Einheit umrechnen; `null` bei inkompatiblen Einheiten
 * (statt einen falschen Wert zu erfinden — DATA-MODEL: Warnung statt Fehlwert). */
export function umrechne(menge: number, von: string, nach: string): number | null {
  const a = FAKTOR[norm(von)];
  const b = FAKTOR[norm(nach)];
  if (!a || !b || a.dim !== b.dim) return null;
  return (menge * a.zuBasis) / b.zuBasis;
}

/** Bequemer Zugriff: Masse in Gramm (null bei Nicht-Masse-Einheit). */
export function zuGramm(menge: number, einheit: string): number | null {
  return umrechne(menge, einheit, "g");
}

/** Bequemer Zugriff: Volumen in Milliliter (null bei Nicht-Volumen-Einheit). */
export function zuMl(menge: number, einheit: string): number | null {
  return umrechne(menge, einheit, "ml");
}

/** Sind zwei Einheiten überhaupt umrechenbar (gleiche Dimension)? */
export function kompatibel(a: string, b: string): boolean {
  const x = FAKTOR[norm(a)];
  const y = FAKTOR[norm(b)];
  return !!x && !!y && x.dim === y.dim;
}
