import type { DB } from "./schema";
import { pruefeDbStruktur } from "./validate";

/**
 * Version des Datei-Umschlags, nicht der lokalen Datenbank. Dadurch können
 * App- und DB-Version unabhängig vom Backup-Format weiterentwickelt werden.
 */
export const BACKUP_FORMAT = "babat-red-backup" as const;
export const BACKUP_ENVELOPE_VERSION = 1 as const;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_ENVELOPE_VERSION;
  app: "BABAT RED";
  version: string;
  exportiert: string;
  daten: DB;
}

export type BackupQuelle =
  | "kanonisch"
  | "legacy-dashboard"
  | "legacy-datenkontrolle"
  | "nackte-db";

export interface GelesenesBackup {
  daten: DB;
  quelle: BackupQuelle;
  version?: string;
  exportiert?: string;
  formatVersion?: number;
  legacySchemaVersion?: number;
}

export type BackupLeseErgebnis =
  | { ok: true; backup: GelesenesBackup }
  | { ok: false; fehler: string };

const BEKANNTE_DB_FELDER = [
  "profil",
  "flashcards",
  "redOs",
  "ziele",
  "settings",
  "theme",
] as const;

type UnbekanntesObjekt = Record<string, unknown>;

function istObjekt(wert: unknown): wert is UnbekanntesObjekt {
  return wert !== null && typeof wert === "object" && !Array.isArray(wert);
}

function hatEigenesFeld(objekt: UnbekanntesObjekt, feld: string): boolean {
  return Object.prototype.hasOwnProperty.call(objekt, feld);
}

/**
 * JSON.parse schützt nicht vor allen problematischen Schlüsseln. Unser Merge
 * schreibt Schlüssel in neue Objekte; ein eigenes `__proto__` darf dabei nie
 * die Prototyp-Kette verändern. Gleichzeitig werden nicht-serialisierbare
 * Direktaufrufe der Service-API früh und ohne Teilmutation abgewiesen.
 */
function pruefeJsonBaum(wurzel: unknown): string | null {
  const stapel: { wert: unknown; pfad: string }[] = [{ wert: wurzel, pfad: "daten" }];
  const gesehen = new WeakSet<object>();

  while (stapel.length > 0) {
    const aktuell = stapel.pop()!;
    const wert = aktuell.wert;

    if (wert === null || typeof wert === "string" || typeof wert === "boolean") continue;
    if (typeof wert === "number") {
      if (!Number.isFinite(wert)) return `„${aktuell.pfad}“ enthält keine endliche Zahl.`;
      continue;
    }
    if (typeof wert !== "object") {
      return `„${aktuell.pfad}“ enthält einen nicht JSON-kompatiblen Wert.`;
    }
    if (gesehen.has(wert)) return `„${aktuell.pfad}“ enthält eine zyklische Referenz.`;
    gesehen.add(wert);

    if (Array.isArray(wert)) {
      for (let i = wert.length - 1; i >= 0; i -= 1) {
        stapel.push({ wert: wert[i], pfad: `${aktuell.pfad}[${i}]` });
      }
      continue;
    }

    const prototyp = Object.getPrototypeOf(wert);
    if (prototyp !== Object.prototype && prototyp !== null) {
      return `„${aktuell.pfad}“ ist kein einfaches JSON-Objekt.`;
    }
    for (const [schluessel, kind] of Object.entries(wert as UnbekanntesObjekt)) {
      if (schluessel === "__proto__") {
        return `„${aktuell.pfad}.__proto__“ ist aus Sicherheitsgründen nicht erlaubt.`;
      }
      stapel.push({ wert: kind, pfad: `${aktuell.pfad}.${schluessel}` });
    }
  }

  return null;
}

/** Prüft einen DB-Kandidaten, ohne ihn zu verändern. */
export function validiereBackupDaten(daten: unknown): string | null {
  if (!istObjekt(daten)) return "Keine Datenbank gefunden.";
  if (!BEKANNTE_DB_FELDER.some((feld) => hatEigenesFeld(daten, feld))) {
    return "Unbekanntes Format — keine RED-Felder erkannt.";
  }
  const strukturFehler = pruefeDbStruktur(daten);
  if (strukturFehler) return strukturFehler;
  const jsonFehler = pruefeJsonBaum(daten);
  if (jsonFehler) return `Backup-Struktur fehlerhaft — ${jsonFehler}`;
  return null;
}

export function erstelleBackupEnvelope(
  db: DB,
  metadaten: { version: string; exportiert: string },
): BackupEnvelope {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_ENVELOPE_VERSION,
    app: "BABAT RED",
    version: metadaten.version,
    exportiert: metadaten.exportiert,
    daten: db,
  };
}

export function serialisiereBackup(
  db: DB,
  metadaten: { version: string; exportiert: string },
): string {
  return JSON.stringify(erstelleBackupEnvelope(db, metadaten), null, 2);
}

function liesMetadaten(roh: UnbekanntesObjekt): Pick<GelesenesBackup, "version" | "exportiert"> {
  return {
    version: typeof roh.version === "string" ? roh.version : undefined,
    exportiert: typeof roh.exportiert === "string" ? roh.exportiert : undefined,
  };
}

/** Normalisiert kanonische und alle bisher ausgelieferten Backup-Varianten. */
export function leseBackupWert(roh: unknown): BackupLeseErgebnis {
  if (!istObjekt(roh)) return { ok: false, fehler: "Datei enthält kein Objekt." };

  let daten: unknown;
  let backup: Omit<GelesenesBackup, "daten">;

  if (hatEigenesFeld(roh, "format")) {
    if (roh.format !== BACKUP_FORMAT) {
      return { ok: false, fehler: "Unbekanntes Backup-Format." };
    }
    if (roh.formatVersion !== BACKUP_ENVELOPE_VERSION) {
      return {
        ok: false,
        fehler: `Backup-Format v${String(roh.formatVersion ?? "?")} wird nicht unterstützt.`,
      };
    }
    if (roh.app !== "BABAT RED") {
      return { ok: false, fehler: "Das Backup gehört nicht zu BABAT RED." };
    }
    if (typeof roh.version !== "string" || !roh.version.trim()) {
      return { ok: false, fehler: "Im Backup fehlt die App-Version." };
    }
    if (typeof roh.exportiert !== "string" || !Number.isFinite(Date.parse(roh.exportiert))) {
      return { ok: false, fehler: "Im Backup fehlt ein gültiger Export-Zeitpunkt." };
    }
    daten = roh.daten;
    backup = {
      quelle: "kanonisch",
      formatVersion: BACKUP_ENVELOPE_VERSION,
      ...liesMetadaten(roh),
    };
  } else if (hatEigenesFeld(roh, "daten")) {
    if (hatEigenesFeld(roh, "app") && roh.app !== "BABAT RED") {
      return { ok: false, fehler: "Das Backup gehört nicht zu BABAT RED." };
    }
    daten = roh.daten;
    backup = { quelle: "legacy-datenkontrolle", ...liesMetadaten(roh) };
  } else if (hatEigenesFeld(roh, "db")) {
    daten = roh.db;
    backup = {
      quelle: "legacy-dashboard",
      exportiert: typeof roh.exportiert === "string" ? roh.exportiert : undefined,
      legacySchemaVersion:
        typeof roh.schemaVersion === "number" && Number.isFinite(roh.schemaVersion)
          ? roh.schemaVersion
          : undefined,
    };
  } else {
    daten = roh;
    backup = { quelle: "nackte-db" };
  }

  const fehler = validiereBackupDaten(daten);
  if (fehler) return { ok: false, fehler };
  return { ok: true, backup: { ...backup, daten: daten as DB } };
}

export function leseBackupText(text: string): BackupLeseErgebnis {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    return { ok: false, fehler: "Kein gültiges JSON." };
  }
  return leseBackupWert(roh);
}

function setzeEigenesFeld(ziel: UnbekanntesObjekt, schluessel: string, wert: unknown): void {
  Object.defineProperty(ziel, schluessel, {
    value: wert,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function kopiereJsonWert<T>(wert: T): T {
  if (Array.isArray(wert)) return wert.map((eintrag) => kopiereJsonWert(eintrag)) as T;
  if (!istObjekt(wert)) return wert;
  const kopie: UnbekanntesObjekt = {};
  for (const [schluessel, kind] of Object.entries(wert)) {
    setzeEigenesFeld(kopie, schluessel, kopiereJsonWert(kind));
  }
  return kopie as T;
}

function stabileId(wert: unknown): string | null {
  if (!istObjekt(wert) || !hatEigenesFeld(wert, "id")) return null;
  const id = wert.id;
  if (typeof id === "string" && id.trim()) return `string:${id}`;
  if (typeof id === "number" && Number.isFinite(id)) return `number:${id}`;
  return null;
}

function kanonischerJsonSchluessel(wert: unknown): string {
  if (Array.isArray(wert)) {
    return `[${wert.map(kanonischerJsonSchluessel).join(",")}]`;
  }
  if (istObjekt(wert)) {
    return `{${Object.keys(wert)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${kanonischerJsonSchluessel(wert[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(wert);
}

function mergeArrays(basis: unknown[], importiert: unknown[]): unknown[] {
  const ergebnis = basis.map((eintrag) => kopiereJsonWert(eintrag));
  const indexNachId = new Map<string, number>();
  const idLoseSchluessel = new Set<string>();

  ergebnis.forEach((eintrag, index) => {
    const id = stabileId(eintrag);
    // Bereits vorhandene doppelte IDs bleiben unangetastet; der erste Eintrag
    // ist der deterministische Merge-Anker.
    if (id && !indexNachId.has(id)) indexNachId.set(id, index);
    if (!id) idLoseSchluessel.add(kanonischerJsonSchluessel(eintrag));
  });

  for (const eintrag of importiert) {
    const id = stabileId(eintrag);
    const vorhandenerIndex = id ? indexNachId.get(id) : undefined;
    if (vorhandenerIndex !== undefined) {
      ergebnis[vorhandenerIndex] = mergeJsonWert(ergebnis[vorhandenerIndex], eintrag);
      continue;
    }
    // Einträge ohne stabile ID werden nur bei exakter Gleichheit dedupliziert.
    // Unterschiedliche Messungen/Logs bleiben so vollständig erhalten.
    const idLoserSchluessel = id ? null : kanonischerJsonSchluessel(eintrag);
    if (idLoserSchluessel && idLoseSchluessel.has(idLoserSchluessel)) continue;
    const neuerEintrag = kopiereJsonWert(eintrag);
    ergebnis.push(neuerEintrag);
    if (id) indexNachId.set(id, ergebnis.length - 1);
    if (idLoserSchluessel) idLoseSchluessel.add(idLoserSchluessel);
  }

  return ergebnis;
}

function mergeJsonWert(basis: unknown, importiert: unknown): unknown {
  if (Array.isArray(importiert)) {
    return Array.isArray(basis)
      ? mergeArrays(basis, importiert)
      : kopiereJsonWert(importiert);
  }
  if (!istObjekt(importiert)) return kopiereJsonWert(importiert);

  const ergebnis: UnbekanntesObjekt = {};
  if (istObjekt(basis)) {
    for (const [schluessel, wert] of Object.entries(basis)) {
      setzeEigenesFeld(ergebnis, schluessel, kopiereJsonWert(wert));
    }
  }
  for (const [schluessel, wert] of Object.entries(importiert)) {
    const vorher = hatEigenesFeld(ergebnis, schluessel) ? ergebnis[schluessel] : undefined;
    setzeEigenesFeld(ergebnis, schluessel, mergeJsonWert(vorher, wert));
  }
  return ergebnis;
}

function ueberlagereJsonWert(basis: unknown, importiert: unknown): unknown {
  if (Array.isArray(importiert)) return kopiereJsonWert(importiert);
  if (!istObjekt(importiert)) return kopiereJsonWert(importiert);

  const ergebnis: UnbekanntesObjekt = {};
  if (istObjekt(basis)) {
    for (const [schluessel, wert] of Object.entries(basis)) {
      setzeEigenesFeld(ergebnis, schluessel, kopiereJsonWert(wert));
    }
  }
  for (const [schluessel, wert] of Object.entries(importiert)) {
    const vorher = hatEigenesFeld(ergebnis, schluessel) ? ergebnis[schluessel] : undefined;
    setzeEigenesFeld(ergebnis, schluessel, ueberlagereJsonWert(vorher, wert));
  }
  return ergebnis;
}

/**
 * Verlustarmer, reiner Merge:
 * - Objektfelder werden rekursiv kombiniert.
 * - Arrays mit `id` werden nach ID zusammengeführt.
 * - ID-lose Arrays behalten beide Seiten; nur exakt gleiche Werte entfallen.
 * - Bei einem skalaren Konflikt gewinnt der bewusst importierte Wert.
 */
export function mergeBackupDaten(basis: DB, importiert: DB): DB {
  const basisFehler = validiereBackupDaten(basis);
  if (basisFehler) throw new Error(basisFehler);
  const importFehler = validiereBackupDaten(importiert);
  if (importFehler) throw new Error(importFehler);
  return mergeJsonWert(basis, importiert) as DB;
}

/**
 * Baut einen vollständigen Replace-Kandidaten: neue Pflichtfelder kommen aus
 * den Defaults, vorhandene Import-Arrays ersetzen die Default-Arrays jedoch
 * vollständig. Das ist Restore-Semantik, nicht Zusammenführen.
 */
export function vervollstaendigeBackupDaten(defaults: DB, importiert: DB): DB {
  const defaultsFehler = validiereBackupDaten(defaults);
  if (defaultsFehler) throw new Error(defaultsFehler);
  const importFehler = validiereBackupDaten(importiert);
  if (importFehler) throw new Error(importFehler);
  const kandidat = ueberlagereJsonWert(defaults, importiert) as DB;
  const kandidatFehler = validiereBackupDaten(kandidat);
  if (kandidatFehler) throw new Error(kandidatFehler);
  return kandidat;
}

/** Tiefe, referenzunabhängige Kopie für einen atomar vorbereiteten Replace. */
export function kopiereBackupDaten(daten: DB): DB {
  const fehler = validiereBackupDaten(daten);
  if (fehler) throw new Error(fehler);
  return kopiereJsonWert(daten);
}
