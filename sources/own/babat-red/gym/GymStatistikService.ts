import type { DB } from "../../../../database/schema";
import { iso } from "../../../../utils/date";
import { GYM_UEBUNGEN } from "../data/uebungen";
import { leseGymLogs } from "./GymService";

/* 📊 RED Gym — Statistik-Aggregationen (Welle G8). Alles REINE Ableitung
 * aus Logs + db.gesundheit — kein eigener Speicher. */

const GRUPPEN_LABEL: Record<string, string> = {
  chest: "Brust", back: "Rücken", legs: "Beine", shoulders: "Schultern",
  arms: "Arme", core: "Core", fullbody: "Ganzkörper",
};

function tagAb(basis: Date, offset: number): string {
  const d = new Date(basis);
  d.setDate(d.getDate() + offset);
  return iso(d);
}

/** Montag der Woche eines Datums (lokal). */
function wochenStart(d: Date): Date {
  const kopie = new Date(d);
  kopie.setHours(12, 0, 0, 0);
  kopie.setDate(kopie.getDate() - ((kopie.getDay() + 6) % 7));
  return kopie;
}

export interface WochenBalken { label: string; einheiten: number }

/** G8.1 — Einheiten pro Kalenderwoche (Mo–So), älteste zuerst.
 * Einheit = eindeutige sessionId; Alt-Logs ohne sessionId zählen je Datum 1×. */
export function einheitenProWoche(db: DB, wochen = 12, heute = new Date()): WochenBalken[] {
  const logs = leseGymLogs(db);
  const start = wochenStart(heute);
  const balken: WochenBalken[] = [];
  for (let w = wochen - 1; w >= 0; w--) {
    const von = tagAb(start, -7 * w);
    const bis = tagAb(start, -7 * w + 6);
    const imFenster = logs.filter((l) => l.datum >= von && l.datum <= bis);
    const einheiten = new Set(imFenster.map((l) => l.sessionId ?? l.datum)).size;
    const [, monat, tag] = von.split("-");
    balken.push({ label: `${Number(tag)}.${Number(monat)}.`, einheiten });
  }
  return balken;
}

export interface GruppenVolumen { gruppe: string; volumen: number }

/** G8.2 — Arbeitsvolumen (kg) je Muskelgruppe der letzten `tage` Tage.
 * Körpergewichts-Sätze (0 kg) zählen mit `koerperKg` (aktuelles Gewicht),
 * sonst ehrlich mit 0. Zeigt, ob die Rotation gleichmäßig verteilt. */
export function volumenProGruppe(db: DB, tage = 7, koerperKg = 0, heute = new Date()): GruppenVolumen[] {
  const ab = tagAb(heute, -(tage - 1));
  const summen = new Map<string, number>();
  for (const log of leseGymLogs(db)) {
    if (log.datum < ab) continue;
    const uebung = GYM_UEBUNGEN.find((u) => u.id === log.uebungId);
    const gruppe = (uebung?.gruppe && GRUPPEN_LABEL[uebung.gruppe]) ?? uebung?.muskeln[0] ?? "Sonstige";
    const kg = log.gewicht > 0 ? log.gewicht : koerperKg;
    summen.set(gruppe, (summen.get(gruppe) ?? 0) + kg * log.wdh * log.saetze);
  }
  return [...summen.entries()]
    .map(([gruppe, volumen]) => ({ gruppe, volumen: Math.round(volumen) }))
    .sort((a, b) => b.volumen - a.volumen);
}

export interface GewichtPunkt { datum: string; kg: number | null; mittel: number | null }

/** G8.3 — Körpergewichts-Verlauf mit gleitendem 7-Tage-Mittel (Tageswerte
 * schwanken zu stark, um daraus etwas zu lesen). Nur Tage mit Messung. */
export function gewichtVerlauf(db: DB, tage = 90, heute = new Date()): GewichtPunkt[] {
  const ab = tagAb(heute, -(tage - 1));
  const messungen = (db.gesundheit.gewicht ?? [])
    .filter((m) => m.date >= ab && Number.isFinite(m.kg))
    .sort((a, b) => a.date.localeCompare(b.date));
  return messungen.map((m) => {
    const fensterAb = tagAb(new Date(`${m.date}T12:00:00`), -6);
    const fenster = messungen.filter((x) => x.date >= fensterAb && x.date <= m.date);
    const mittel = fenster.reduce((s, x) => s + x.kg, 0) / fenster.length;
    return { datum: m.date, kg: m.kg, mittel: Math.round(mittel * 10) / 10 };
  });
}

export interface HeatmapTag { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }

/** G8.4 — Trainings-Heatmap (Sätze je Tag), `tage` rückwärts inkl. heute. */
export function trainingsHeatmap(db: DB, tage = 84, heute = new Date()): HeatmapTag[] {
  const proTag = new Map<string, number>();
  for (const log of leseGymLogs(db)) proTag.set(log.datum, (proTag.get(log.datum) ?? 0) + log.saetze);
  const liste: HeatmapTag[] = [];
  for (let n = tage - 1; n >= 0; n--) {
    const date = tagAb(heute, -n);
    const count = proTag.get(date) ?? 0;
    const level = count === 0 ? 0 : count <= 5 ? 1 : count <= 11 ? 2 : count <= 17 ? 3 : 4;
    liste.push({ date, count, level });
  }
  return liste;
}

/** G10.3 — Gewicht × Ernährung: liegt das 7-Tage-Mittel seit zwei Wochen
 * flach (±0,3 kg) und das Ziel ist Aufbau, ist ESSEN der Hebel — nicht mehr
 * Training. Braucht Messungen in beiden Fenstern, sonst null (kein Raten). */
export function gewichtPlateauHinweis(db: DB, heute = new Date()): string | null {
  const ziel = db.gesundheit.gewichtZiel;
  if (!ziel) return null;
  const punkte = gewichtVerlauf(db, 90, heute);
  if (punkte.length < 4) return null;
  const juengster = punkte[punkte.length - 1];
  if (juengster.datum < tagAb(heute, -6)) return null; // keine frische Messung
  const vergleichsTag = tagAb(heute, -14);
  const aeltere = punkte.filter((p) => p.datum <= vergleichsTag);
  const vergleich = aeltere[aeltere.length - 1];
  if (!vergleich || vergleich.datum < tagAb(heute, -28)) return null;
  const delta = (juengster.mittel ?? 0) - (vergleich.mittel ?? 0);
  if (Math.abs(delta) >= 0.3) return null;
  if (ziel > (juengster.mittel ?? 0)) {
    return `7-Tage-Mittel seit zwei Wochen flach (${juengster.mittel} kg) — für das ${ziel}-kg-Ziel ist Essen der Hebel: Kalorien erhöhen (siehe Ernährungsplan), nicht mehr trainieren.`;
  }
  return null;
}
