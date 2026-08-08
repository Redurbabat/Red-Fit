import { z } from "zod";
import { createDefaultDB } from "./schema";

/* ============================================================
 * Laufzeit-Validierung an der Import-Grenze (Scout TOP 5 #5).
 * Bekannte Bereiche müssen rekursiv ihren Grundtyp behalten (Liste bleibt
 * Liste, Objekt bleibt Objekt); unbekannte Felder bleiben vorwärtskompatibel.
 * So bekommen kaputte Backups eine präzise Fehlermeldung, statt später
 * irgendwo eine View zu crashen.
 * ============================================================ */

z.config(z.locales.de());

const liste = z.array(z.unknown()).optional();
const objekt = z.looseObject({}).optional();
const nullableString = z.string().nullable().optional();

/**
 * Alle bekannten Top-Level-Bereiche werden bewusst nur auf ihren Grundtyp
 * geprüft. So bleiben Teil-Backups und zukünftige Zusatzfelder kompatibel,
 * während ein vorhandener Pflichtbereich niemals durch `null`, eine Liste
 * oder einen Skalar zerstört werden kann.
 *
 * `looseObject` ist hier wichtig: Die Prüfung liefert keinen transformierten
 * Kandidaten zurück und unbekannte Felder bleiben im Original vollständig
 * erhalten.
 */
const dbStrukturSchema = z.looseObject({
  schemaVersion: z.number().finite().int().nonnegative().optional(),
  migrationLog: liste,
  pwHash: nullableString,
  pinHash: nullableString,

  profil: objekt,
  theme: objekt,
  settings: objekt,
  tresor: objekt,
  finanzen: objekt,
  gesundheit: objekt,
  nutzungsStats: objekt,
  urlaubsTage: objekt,
  finanzenExtra: objekt,
  autoTracking: objekt,
  globalTimer: objekt,
  sprachen: objekt,
  elektriker: objekt,
  notfallInfo: objekt,
  atlas: objekt,
  auto: objekt,
  redOs: z.looseObject({
    fitness: objekt,
  }).optional(),

  zitatVerlauf: liste,
  kalender: liste,
  kategorien: liste,
  semester: liste,
  faecher: liste,
  stundenplan: liste,
  hausaufgaben: liste,
  todos: liste,
  baustellen: liste,
  baustelle: liste,
  baustellenMaterial: liste,
  notfallKontakte: liste,
  passwoerter: liste,
  tagebuch: liste,
  gewohnheiten: liste,
  rezepte: liste,
  einkaufsliste: liste,
  flashcards: liste,
  pruefungen: liste,
  buecher: liste,
  ziele: liste,
  letzteAktionen: liste,
  lieblingsZitate: liste,
  kollegen: liste,
  materialien: liste,
  kontakte: liste,
  erinnerungen: liste,
  dokumente: liste,

  schnellNotiz: z.string().optional(),
});

type JsonObjekt = Record<string, unknown>;

function istObjekt(wert: unknown): wert is JsonObjekt {
  return wert !== null && typeof wert === "object" && !Array.isArray(wert);
}

function grundtypName(wert: unknown): string {
  if (wert === null) return "null";
  if (Array.isArray(wert)) return "Liste";
  if (typeof wert === "object") return "Objekt";
  return typeof wert;
}

/**
 * Rekursive Shape-Prüfung gegen die heute bekannten Defaults. Es werden nur
 * Keys geprüft, die im Default tatsächlich existieren; zukünftige Keys werden
 * weder abgewiesen noch entfernt. Default-null bleibt absichtlich tolerant,
 * weil diese Felder nullable oder historisch polymorph sein können.
 */
function pruefeBekannteDefaultStruktur(
  kandidat: unknown,
  standard: unknown,
  pfad: string,
  probleme: string[],
): void {
  if (probleme.length >= 3 || standard === null || standard === undefined) return;

  if (Array.isArray(standard)) {
    if (!Array.isArray(kandidat)) {
      probleme.push(`„${pfad}": Erwartet Liste, erhalten ${grundtypName(kandidat)}.`);
    }
    return;
  }

  if (istObjekt(standard)) {
    if (!istObjekt(kandidat)) {
      probleme.push(`„${pfad}": Erwartet Objekt, erhalten ${grundtypName(kandidat)}.`);
      return;
    }
    for (const [key, wert] of Object.entries(kandidat)) {
      if (!Object.prototype.hasOwnProperty.call(standard, key)) continue;
      pruefeBekannteDefaultStruktur(
        wert,
        standard[key],
        pfad ? `${pfad}.${key}` : key,
        probleme,
      );
      if (probleme.length >= 3) return;
    }
    return;
  }

  if (typeof kandidat !== typeof standard || kandidat === null) {
    probleme.push(
      `„${pfad}": Erwartet ${grundtypName(standard)}, erhalten ${grundtypName(kandidat)}.`,
    );
  }
}

/** Prüft die Grundstruktur eines Import-Kandidaten.
 *  Liefert `null` wenn ok, sonst eine deutsche Fehlermeldung mit den
 *  ersten konkreten Problemfeldern. */
export function pruefeDbStruktur(daten: unknown): string | null {
  const ergebnis = dbStrukturSchema.safeParse(daten);
  if (!ergebnis.success) {
    const probleme = ergebnis.error.issues
      .slice(0, 3)
      .map((i) => `„${i.path.join(".") || "Wurzel"}": ${i.message}`)
      .join(" · ");
    return `Backup-Struktur fehlerhaft — ${probleme}`;
  }

  const probleme: string[] = [];
  pruefeBekannteDefaultStruktur(daten, createDefaultDB(), "", probleme);
  return probleme.length > 0
    ? `Backup-Struktur fehlerhaft — ${probleme.join(" · ")}`
    : null;
}
