import type { DB } from "../../../../database/schema";
import { uid } from "../../../../database/store";
import type { FitnessState } from "../models/fitness";
import type { EinkaufPos } from "../../ernaehrung/data/ernaehrungsplan";
import { fitnessState } from "./FitnessState";
import { verfuegbarInEinheit, addVorrat, findeVorrat } from "./FitnessVorratService";
import { packungen } from "../calculations/FitnessMengenService";

/* ============================================================
 * 🛒 FitnessEinkaufService — „Das fehlt noch" (Phase 5).
 *
 * Aus dem Wochen-Einkauf (EinkaufPos aus dem Ernährungsplan) minus dem
 * vorhandenen Vorrat (einheiten-bewusst) ergibt sich, was wirklich noch
 * gekauft werden muss. Brücken: fehlende Positionen auf die RED-Einkaufsliste
 * (db.einkaufsliste, dedup) und gekaufte Positionen in den Vorrat.
 * ============================================================ */

const KAT = "🏋️ Fitness";

export interface FehltPos {
  name: string;
  benoetigt: number;
  einheit: string;
  vorhanden: number;
  fehlt: number;
  hinweis?: string;
  /** Verpackungsrundung (Welle 8): nur wenn der Vorrats-Eintrag eine Packungsgröße kennt. */
  packAnzahl?: number;
  packGroesse?: number;
}

/** Mengen-Anzeige: ganze Zahlen ab 1, sonst bis 2 Nachkommastellen — eine
 * positive Menge wird NIE als „0" dargestellt (sonst wäre die Liste irreführend). */
export function fmtMenge(n: number): string {
  return n >= 1 ? String(Math.round(n)) : String(Math.round(n * 100) / 100);
}

/** Für jede Einkaufsposition: Bedarf, vorhandener Vorrat und Fehlmenge.
 * Fehlmenge wird auf 2 Nachkommastellen gesnappt (Gleitkomma-Rest aus der
 * Einheiten-Umrechnung < 0,005 gilt als gedeckt → keine Schein-Fehlmengen). */
export function fehltNoch(f: FitnessState, positionen: EinkaufPos[]): FehltPos[] {
  return positionen.map((p) => {
    const vorhanden = verfuegbarInEinheit(f, p.name, p.einheit); // abzüglich aktiver Reservierungen (Welle 8.2)
    const fehlt = Math.max(0, Math.round((p.menge - vorhanden) * 100) / 100);
    const item = findeVorrat(f, p.name, p.einheit);
    const groesse = item?.packungsGroesse;
    const pack = fehlt > 0 && groesse && groesse > 0 ? packungen(fehlt, groesse) : null;
    return {
      name: p.name, benoetigt: p.menge, einheit: p.einheit, vorhanden, fehlt, hinweis: p.hinweis || undefined,
      packAnzahl: pack?.gueltig ? pack.packungen : undefined,
      packGroesse: pack?.gueltig ? groesse : undefined,
    };
  });
}

/** Nur die Positionen, die tatsächlich noch fehlen (fehlt > 0). */
export function nurFehlend(liste: FehltPos[]): FehltPos[] {
  return liste.filter((x) => x.fehlt > 0);
}

/** Fehlende Positionen (fehlt > 0) auf die RED-Einkaufsliste übernehmen (dedup by Name). Mutator. */
export function fehlendeAufEinkaufsliste(positionen: EinkaufPos[]) {
  return (db: DB) => {
    const f = fitnessState(db);
    const fehl = nurFehlend(fehltNoch(f, positionen));
    const drin = new Set(db.einkaufsliste.map((e) => e.name.trim().toLowerCase()));
    for (const p of fehl) {
      const key = p.name.trim().toLowerCase();
      if (drin.has(key)) continue;
      db.einkaufsliste.push({
        id: uid(),
        name: p.name,
        menge: `${fmtMenge(p.fehlt)} ${p.einheit}`.trim(),
        kat: KAT,
        done: false,
      });
      drin.add(key);
    }
  };
}

/** Anzahl der auf die Einkaufsliste übernehmbaren (fehlenden, noch nicht gelisteten) Positionen. */
export function offeneFehlmenge(db: DB, f: FitnessState, positionen: EinkaufPos[]): number {
  const drin = new Set(db.einkaufsliste.map((e) => e.name.trim().toLowerCase()));
  return nurFehlend(fehltNoch(f, positionen)).filter((p) => !drin.has(p.name.trim().toLowerCase())).length;
}

/** Alle Positionen einer Woche in den Vorrat übernehmen (nach dem Einkauf). Mutator. */
export function einkaufInVorrat(positionen: EinkaufPos[], jetzt?: string) {
  return (db: DB) => {
    for (const p of positionen) {
      addVorrat({ name: p.name, menge: p.menge, einheit: p.einheit }, jetzt)(db);
    }
  };
}
