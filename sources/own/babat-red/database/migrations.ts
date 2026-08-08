import { sanitizeFitnessState } from "../apps/health/fitness/persistence/sanitizeFitnessState";

export const CURRENT_DB_VERSION = 2;
export const MIGRATION_BACKUP_PREFIX = "babatred.migration-backup";
export const FITNESS_V2_MIGRATION_ID = "db-v2-fitness-foundation";

type PersistedDb = Record<string, unknown> & {
  schemaVersion?: unknown;
  migrationLog?: unknown;
  redOs?: unknown;
};

export interface MigrationResult {
  data: PersistedDb;
  fromVersion: number;
  toVersion: number;
  changed: boolean;
}

function readVersion(data: PersistedDb): number {
  const value = data.schemaVersion;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function migrateToV1(data: PersistedDb): PersistedDb {
  return { ...data, schemaVersion: 1 };
}

function istObjekt(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function migrateToV2(data: PersistedDb): PersistedDb {
  const redOs: Record<string, unknown> = istObjekt(data.redOs)
    ? { ...data.redOs }
    : {};
  redOs.fitness = sanitizeFitnessState(redOs.fitness);

  const vorhandeneLogs = Array.isArray(data.migrationLog)
    ? data.migrationLog.slice()
    : [];
  const hatLog = vorhandeneLogs.some(
    (entry) => istObjekt(entry) && entry.id === FITNESS_V2_MIGRATION_ID,
  );
  if (!hatLog) {
    vorhandeneLogs.push({
      id: FITNESS_V2_MIGRATION_ID,
      fromVersion: 1,
      toVersion: 2,
      status: "ok",
    });
  }

  return {
    ...data,
    redOs,
    migrationLog: vorhandeneLogs,
    schemaVersion: 2,
  };
}

const MIGRATIONS: Record<number, (data: PersistedDb) => PersistedDb> = {
  1: migrateToV1,
  2: migrateToV2,
};

/**
 * Applies every known migration without removing unknown legacy fields.
 * A database from a newer RED version is kept intact and never downgraded.
 */
export function migratePersistedDb(value: unknown): MigrationResult {
  const istPersistierteDb = !!value && typeof value === "object" && !Array.isArray(value);
  const original = istPersistierteDb ? value as PersistedDb : {};
  const fromVersion = readVersion(original);
  if (fromVersion > CURRENT_DB_VERSION) {
    return { data: original, fromVersion, toVersion: fromVersion, changed: false };
  }

  let data = original;
  for (let version = fromVersion + 1; version <= CURRENT_DB_VERSION; version += 1) {
    data = MIGRATIONS[version]?.(data) ?? { ...data, schemaVersion: version };
  }

  return {
    data,
    fromVersion,
    toVersion: readVersion(data),
    changed: !istPersistierteDb || fromVersion !== readVersion(data),
  };
}

export function migrationBackupKey(fromVersion: number, toVersion: number): string {
  return `${MIGRATION_BACKUP_PREFIX}.v${fromVersion}-to-v${toVersion}`;
}

/** Saves the pre-migration payload once. Existing backups are never overwritten. */
export function preserveMigrationBackup(
  storage: Pick<Storage, "getItem" | "setItem">,
  raw: string,
  fromVersion: number,
  toVersion: number,
): string | null {
  if (fromVersion >= toVersion) return null;
  // Größen-Guard: das Backup verdoppelt den kompletten DB-Payload in localStorage
  // (~5-MB-Quota geteilt mit der Live-DB). Große Bestände würden die Quota sprengen
  // bzw. dauerhaft belegen — dann ehrlich überspringen. Der tägliche IndexedDB-
  // Snapshot läuft beim Erststart erst NACH der Migration und ist deshalb kein
  // Vorab-Backup. Bei einem Fehler bleibt der unveränderte Rohwert in STORAGE_KEY.
  if (raw.length > 1_500_000) {
    console.warn(`Migrations-Backup übersprungen (${Math.round(raw.length / 1024)} KB > 1.5 MB) — Original bleibt bis zum erfolgreichen Speichern erhalten.`);
    return null;
  }
  const key = migrationBackupKey(fromVersion, toVersion);
  try {
    if (storage.getItem(key) === null) storage.setItem(key, raw);
  } catch (e) {
    console.warn("Migrations-Backup fehlgeschlagen (Speicher voll?)", e);
    return null;
  }
  return key;
}
