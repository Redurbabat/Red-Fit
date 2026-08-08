import type { DB } from "../../../../database/schema";
import { planUebungen, type Trainingsplan } from "../data/trainingsplaene";
import { verlaufFuer } from "./GymService";

/* 📈 RED Gym — Progressions-Vorschlag (Welle G6). Reine Ableitung aus den
 * Logs: doppelte Progression — erst den Wdh-Bereich füllen, dann Gewicht. */

export interface LastVorschlag {
  /** Vorgeschlagenes Gewicht in kg (0 = Körpergewicht). */
  gewicht: number;
  /** Bei Körpergewichts-Übungen: vorgeschlagene Wiederholungen (sonst null). */
  wdh: number | null;
  grund: string;
}

const SCHRITT_KG = 2.5;

/** Sätze der jüngsten Session einer Übung (sessionId, sonst Datum als Gruppe). */
function letzteSession(db: DB, uebungId: string) {
  const logs = verlaufFuer(db, uebungId);
  const kopf = logs[0];
  if (!kopf) return [];
  return logs.filter((l) => (kopf.sessionId ? l.sessionId === kopf.sessionId : l.datum === kopf.datum));
}

/** G6.1 — Vorschlag für die nächste Last dieser Übung im Plan-Kontext:
 * alle Sätze der letzten Session am oberen Ende (wdhBis) → +2,5 kg;
 * sonst gleiches Gewicht. Körpergewicht (0 kg) → +1 Wdh statt Gewicht. */
export function naechsteLast(db: DB, plan: Trainingsplan, uebungId: string): LastVorschlag {
  const vorgabe = planUebungen(plan).find((u) => u.uebungId === uebungId);
  const saetze = letzteSession(db, uebungId);
  if (!saetze.length) {
    return { gewicht: 0, wdh: null, grund: "Erste Session — Gewicht frei wählen und Technik prüfen." };
  }
  const gewicht = Math.max(...saetze.map((l) => l.gewicht));
  const ziel = vorgabe?.wdhBis ?? 12;
  const alleAmZiel = saetze.every((l) => l.wdh >= ziel);
  if (gewicht <= 0) {
    const beste = Math.max(...saetze.map((l) => l.wdh));
    return alleAmZiel
      ? { gewicht: 0, wdh: beste + 1, grund: `Alle Sätze ≥ ${ziel} — heute 1 Wiederholung mehr versuchen.` }
      : { gewicht: 0, wdh: beste, grund: "Körpergewicht — erst den Wdh-Bereich füllen." };
  }
  return alleAmZiel
    ? { gewicht: gewicht + SCHRITT_KG, wdh: null, grund: `Letztes Mal alle Sätze ≥ ${ziel} Wdh — +${SCHRITT_KG} kg.` }
    : { gewicht, wdh: null, grund: "Gleiches Gewicht — erst den Wdh-Bereich füllen." };
}
