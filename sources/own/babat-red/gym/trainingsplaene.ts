/** EINE Übung im Plan mit Vorgaben (G1): Sätze × Wdh-Bereich × Pause. */
export interface PlanUebung {
  uebungId: string;
  saetze: number;
  wdhVon: number;
  wdhBis: number;
  pauseSek: number;
  /** true = wdhVon/wdhBis sind Sekunden (Plank, Seitplank) */
  zeitBasiert?: boolean;
}

export interface Trainingsplan {
  id: string;
  name: string;
  fokus: string;
  beschreibung: string;
  dauer: string;
  /** Alt-Format (nur IDs) — bleibt lesbar; Vorgaben kommen dann aus dem Fallback 3×8–12/90 s. */
  uebungIds?: string[];
  uebungen?: PlanUebung[];
}

/** Fallback für Alt-Pläne ohne Vorgaben — entspricht dem bisher fest verdrahteten Verhalten. */
export const PLAN_FALLBACK = { saetze: 3, wdhVon: 8, wdhBis: 12, pauseSek: 90 } as const;

/** Normalisiert alte (uebungIds) und neue (uebungen) Pläne auf EIN Format. */
export function planUebungen(plan: Trainingsplan): PlanUebung[] {
  if (plan.uebungen?.length) return plan.uebungen;
  return (plan.uebungIds ?? []).map((uebungId) => ({ uebungId, ...PLAN_FALLBACK }));
}

/** Nur die Übungs-IDs eines Plans, format-unabhängig. */
export function planUebungIds(plan: Trainingsplan): string[] {
  return planUebungen(plan).map((u) => u.uebungId);
}

export const TRAININGSPLAENE: Trainingsplan[] = [
  {
    id: "push",
    name: "Push",
    fokus: "Brust, Schulter, Trizeps",
    beschreibung: "Ein klarer Oberkörper-Tag für drückende Bewegungen.",
    dauer: "45-60 Min.",
    uebungIds: ["bankdruecken", "schulterdruecken", "brustpresse", "seitheben", "trizepsdruecken"],
  },
  {
    id: "pull",
    name: "Pull",
    fokus: "Rücken, Bizeps, hintere Schulter",
    beschreibung: "Zugbewegungen, Rückenbreite und kontrollierte Arm-Arbeit.",
    dauer: "45-60 Min.",
    uebungIds: ["klimmzug", "kabelrudern", "rudern_lh", "reverse_fly", "preacher_curl"],
  },
  {
    id: "legs",
    name: "Legs",
    fokus: "Beine, Gesäß, Rumpf",
    beschreibung: "Stabiler Unterkörper mit Kniebeuge, Hüfte und Core.",
    dauer: "50-65 Min.",
    uebungIds: ["kniebeuge", "ausfallschritt", "beincurl", "huftheben", "dead_bug"],
  },
  {
    id: "full-body",
    name: "Ganzkörper",
    fokus: "Kraftbasis und Bewegung",
    beschreibung: "Eine ausgewogene Einheit fuer drei Trainingstage pro Woche.",
    dauer: "40-55 Min.",
    uebungIds: ["kniebeuge", "bankdruecken", "kabelrudern", "schulterdruecken", "plank"],
  },
  /* ===== Inhalts-Welle L16 (2026-07-19): 3 weitere Pläne ===== */
  {
    id: "home",
    name: "Home-Workout",
    fokus: "Ganzkörper ohne Geräte",
    beschreibung: "Nur Körpergewicht — für Zuhause, Ferien oder wenn das Studio zu ist.",
    dauer: "25-35 Min.",
    uebungIds: ["liegestuetz", "kniebeuge", "ausfallschritt", "plank", "superman", "burpees"],
  },
  {
    id: "ruecken-ausgleich",
    name: "Baustellen-Ausgleich",
    fokus: "Rücken, Haltung, Rumpf",
    beschreibung: "Gegenprogramm zu Heben, Bücken und Über-Kopf-Arbeit — Prävention statt Hexenschuss.",
    dauer: "30-40 Min.",
    uebungIds: ["facepull", "reverse_fly", "hyperextension", "dead_bug", "seitplank"],
  },
  {
    id: "anfaenger",
    name: "Maschinen-Einstieg",
    fokus: "Sicherer Start im Studio",
    beschreibung: "Geführte Maschinen für die ersten Wochen — Technik lernen ohne Balance-Risiko.",
    dauer: "35-45 Min.",
    uebungIds: ["beinpresse", "brustpresse", "latzug", "kabelrudern", "plank"],
  },
  /* ===== Welle G3 (2026-07-26): Redurs 5-Tage-Rotation — Aufbau, 68-kg-Ziel.
   * Erste Pläne im neuen Format mit Vorgaben (Sätze × Wdh-Bereich × Pause). */
  {
    id: "red-pull-a", name: "Pull A", fokus: "Rücken breit, Bizeps",
    beschreibung: "Zugbewegungen mit Fokus auf Rückenbreite.",
    dauer: "60-70 Min.",
    uebungen: [
      { uebungId: "klimmzug",     saetze: 4, wdhVon: 6,  wdhBis: 10, pauseSek: 150 },
      { uebungId: "rudern_lh",    saetze: 3, wdhVon: 8,  wdhBis: 10, pauseSek: 120 },
      { uebungId: "latzug",       saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  90 },
      { uebungId: "facepull",     saetze: 3, wdhVon: 12, wdhBis: 15, pauseSek:  60 },
      { uebungId: "bizepscurl",   saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  60 },
      { uebungId: "hammercurl",   saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  60 },
    ],
  },
  {
    id: "red-push-a", name: "Push A", fokus: "Brust schwer, Schulter, Trizeps",
    beschreibung: "Schwere Drückeinheit im unteren Wiederholungsbereich.",
    dauer: "60-70 Min.",
    uebungen: [
      { uebungId: "schraegbank",       saetze: 4, wdhVon: 6,  wdhBis: 8,  pauseSek: 180 },
      { uebungId: "brustpresse",       saetze: 3, wdhVon: 8,  wdhBis: 10, pauseSek: 120 },
      { uebungId: "schulterdruecken",  saetze: 3, wdhVon: 8,  wdhBis: 10, pauseSek: 120 },
      { uebungId: "seitheben",         saetze: 4, wdhVon: 12, wdhBis: 15, pauseSek:  60 },
      { uebungId: "trizepsdruecken",   saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  60 },
      { uebungId: "ueberkopf_trizeps", saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  60 },
    ],
  },
  {
    id: "red-legs", name: "Legs", fokus: "Beine, Gesäß, Rumpf",
    beschreibung: "Kniebeuge als Anker, dazu Hüfte, Waden und Core.",
    dauer: "65-75 Min.",
    uebungen: [
      { uebungId: "kniebeuge",    saetze: 4, wdhVon: 6,  wdhBis: 8,  pauseSek: 180 },
      { uebungId: "rdl",          saetze: 3, wdhVon: 8,  wdhBis: 10, pauseSek: 150 },
      { uebungId: "beinpresse",   saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek: 120 },
      { uebungId: "beincurl",     saetze: 3, wdhVon: 10, wdhBis: 15, pauseSek:  90 },
      { uebungId: "beinstrecker", saetze: 3, wdhVon: 10, wdhBis: 15, pauseSek:  90 },
      { uebungId: "wadenheben",   saetze: 4, wdhVon: 12, wdhBis: 20, pauseSek:  60 },
      { uebungId: "plank",        saetze: 3, wdhVon: 30, wdhBis: 60, pauseSek: 60, zeitBasiert: true },
    ],
  },
  {
    id: "red-pull-b", name: "Pull B", fokus: "Rücken dick, Bizeps",
    beschreibung: "Rudervarianten für Rückendicke, höheres Volumen.",
    dauer: "60-70 Min.",
    uebungen: [
      { uebungId: "brustgest_rudern", saetze: 4, wdhVon: 8,  wdhBis: 12, pauseSek: 120 },
      { uebungId: "klimmzug",         saetze: 3, wdhVon: 8,  wdhBis: 10, pauseSek: 150 },
      { uebungId: "kabelrudern",      saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  90 },
      { uebungId: "reverse_fly",      saetze: 3, wdhVon: 12, wdhBis: 15, pauseSek:  60 },
      { uebungId: "bizepscurl",       saetze: 3, wdhVon: 8,  wdhBis: 10, pauseSek:  90 },
      { uebungId: "hammercurl",       saetze: 3, wdhVon: 12, wdhBis: 15, pauseSek:  60 },
    ],
  },
  {
    id: "red-push-b", name: "Push B", fokus: "Brust Volumen, Schulter, Trizeps",
    beschreibung: "Höhere Wiederholungen, Kurzhantel- und Kabelarbeit.",
    dauer: "60-70 Min.",
    uebungen: [
      { uebungId: "schraegbank",      saetze: 4, wdhVon: 8,  wdhBis: 12, pauseSek: 150 },
      { uebungId: "butterfly",        saetze: 3, wdhVon: 12, wdhBis: 15, pauseSek:  90 },
      { uebungId: "schulterdruecken", saetze: 3, wdhVon: 10, wdhBis: 12, pauseSek:  90 },
      { uebungId: "seitheben",        saetze: 4, wdhVon: 15, wdhBis: 20, pauseSek:  60 },
      { uebungId: "dips",             saetze: 3, wdhVon: 8,  wdhBis: 12, pauseSek: 120 },
      { uebungId: "trizepsdruecken",  saetze: 3, wdhVon: 12, wdhBis: 15, pauseSek:  60 },
    ],
  },
];
