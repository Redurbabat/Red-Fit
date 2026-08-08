import type { DB, GymLog, GymState } from "../../../../database/schema";
import { uid } from "../../../../database/store";
import { iso } from "../../../../utils/date";
import { leseRedOs, ros } from "../../../brain/wissen/services/WissenService";

/* 🏋️ RED Gym — Trainings-Log (Nachtschicht Block 5). Rein lokal in
 * DB.redOs.gym (additiv, selbstheilend). Lesen über leseRedOs-KOPIE,
 * Schreiben über ros(db) in-place — Muster ChallengeService. */

export function leseGymLogs(db: DB): GymLog[] {
  const r = leseRedOs(db);
  return Array.isArray(r.gym?.logs) ? r.gym.logs : [];
}

/** Ganzer Gym-Zustand als KOPIE (nur lesen) — heilt fehlende/kaputte logs. */
export function leseGym(db: DB): GymState {
  const r = leseRedOs(db);
  const gym = r.gym ?? { logs: [] };
  return { ...gym, logs: Array.isArray(gym.logs) ? gym.logs : [] };
}

/** In-place-Zugriff für Mutatoren — heilt logs, ohne rotation/wochenZiel zu verwerfen. */
export function gymInPlace(db: DB): GymState {
  const r = ros(db);
  if (!r.gym) r.gym = { logs: [] };
  if (!Array.isArray(r.gym.logs)) r.gym.logs = [];
  return r.gym;
}

function logsInPlace(db: DB): GymLog[] {
  return gymInPlace(db).logs;
}

export function addGymLog(
  uebungId: string,
  gewicht: number,
  wdh: number,
  saetze: number,
  kontext?: { sessionId?: string; planId?: string },
) {
  return (db: DB) => {
    logsInPlace(db).push({
      id: uid(),
      datum: iso(new Date()),
      uebungId,
      gewicht: Math.max(0, gewicht),
      wdh: Math.max(1, Math.round(wdh)),
      saetze: Math.max(1, Math.round(saetze)),
      ...(kontext?.sessionId ? { sessionId: kontext.sessionId } : {}),
      ...(kontext?.planId ? { planId: kontext.planId } : {}),
    });
  };
}

export function loescheGymLog(id: string) {
  return (db: DB) => {
    const arr = logsInPlace(db);
    const i = arr.findIndex((l) => l.id === id);
    if (i >= 0) arr.splice(i, 1);
  };
}

/** Verlauf je Übung (neueste zuerst) — für die Fortschritts-Anzeige. */
export function verlaufFuer(db: DB, uebungId: string): GymLog[] {
  return leseGymLogs(db)
    .filter((l) => l.uebungId === uebungId)
    .sort((a, b) => b.datum.localeCompare(a.datum));
}

/** Bestleistung je Übung: höchster Epley-1RM (Gewicht × (1 + Wdh/30)).
 * ⚠️ Körpergewichts-Übungen (alle Logs mit 0 kg) haben Epley-Score 0 für
 * JEDEN Log — dort gewinnt stattdessen die höchste Wiederholungszahl
 * (sonst käme wegen der Neueste-zuerst-Sortierung einfach der letzte Log). */
export function bestwert(db: DB, uebungId: string): GymLog | null {
  const logs = verlaufFuer(db, uebungId);
  if (!logs.length) return null;
  if (logs.every((l) => l.gewicht <= 0)) {
    return logs.reduce((best, l) => (l.wdh > best.wdh ? l : best));
  }
  return logs.reduce((best, l) =>
    l.gewicht * (1 + l.wdh / 30) > best.gewicht * (1 + best.wdh / 30) ? l : best,
  );
}

/** Aktuelles Körpergewicht (jüngste Messung in db.gesundheit) — 0 ohne Messung. */
export function aktuellesKoerpergewicht(db: DB): number {
  const messungen = db.gesundheit.gewicht ?? [];
  if (!messungen.length) return 0;
  return messungen.reduce((best, m) => (m.date > best.date ? m : best)).kg || 0;
}

export function gymWochenStatistik(db: DB) {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const ab = iso(start);
  const logs = leseGymLogs(db).filter((log) => log.datum >= ab);
  const einheiten = new Set(logs.map((log) => log.datum)).size;
  const saetze = logs.reduce((sum, log) => sum + log.saetze, 0);
  // G10.1: Körpergewichts-Sätze (0 kg) zählen mit dem aktuellen Körpergewicht —
  // sonst stehen Klimmzüge und Dips mit null Arbeitsvolumen da.
  const koerperKg = aktuellesKoerpergewicht(db);
  const volumen = logs.reduce((sum, log) => sum + (log.gewicht > 0 ? log.gewicht : koerperKg) * log.wdh * log.saetze, 0);

  return { einheiten, saetze, volumen: Math.round(volumen) };
}
