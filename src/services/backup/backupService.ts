import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupSchema,
  type BackupData,
  type RedFitBackup,
} from "../../models/backup";
import type { MealFoodEntry, MealLog } from "../../models/nutrition";
import type { UserSettings } from "../../models/settings";
import { getLocalDateKey, nowIso } from "../../utils/dates";
import { db, SETTINGS_ID } from "../storage/database";
import { settingsRepository } from "../storage/settingsRepository";
import { APP_VERSION } from "../appVersion";
import { assertRestorableBackupSize, MAX_STANDARD_BACKUP_BYTES } from "./backupExportPolicy";

/** Import files above this size are rejected outright (§107). */
export const MAX_IMPORT_BYTES = MAX_STANDARD_BACKUP_BYTES;

export async function collectBackupData(): Promise<BackupData> {
  // All tables and the settings singleton must be read within ONE IDB
  // read-only transaction. Otherwise concurrent edits across tabs can produce
  // a torn snapshot (e.g. a new meal entry without its food item).
  return db.transaction("r", [
    db.exercises, db.workoutPlans, db.workoutLogs, db.foodItems,
    db.mealLogs, db.nutritionGoals, db.waterLogs, db.bodyMeasurements,
    db.shoppingLists, db.mealPlans, db.recipes, db.userProfiles,
    db.recoveryLogs, db.settings,
  ], async () => {
    const settings = await settingsRepository.getSettings();
    const [
      exercises,
      workoutPlans,
      workoutLogs,
      foodItems,
      mealLogs,
      nutritionGoals,
      waterLogs,
      bodyMeasurements,
      shoppingLists,
      mealPlans,
      recipes,
      userProfiles,
      recoveryLogs,
    ] = await Promise.all([
      db.exercises.toArray(),
      db.workoutPlans.toArray(),
      db.workoutLogs.toArray(),
      db.foodItems.toArray(),
      db.mealLogs.toArray(),
      db.nutritionGoals.toArray(),
      db.waterLogs.toArray(),
      db.bodyMeasurements.toArray(),
      db.shoppingLists.toArray(),
      db.mealPlans.toArray(),
      db.recipes.toArray(),
      db.userProfiles.toArray(),
      db.recoveryLogs.toArray(),
    ]);
    return {
      exercises,
      workoutPlans,
      workoutLogs,
      foodItems,
      mealLogs,
      nutritionGoals,
      waterLogs,
      bodyMeasurements,
      shoppingLists,
      mealPlans,
      recipes,
      userProfiles,
      settings: [settings satisfies UserSettings],
      recoveryLogs,
    };
  });
}

export async function createBackup(): Promise<RedFitBackup> {
  const backup: RedFitBackup = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: nowIso(),
    data: await collectBackupData(),
  };
  // A locally malformed record must not produce a file that the importer
  // would later reject. Validate without stripping unknown local properties.
  if (!backupSchema.safeParse(backup).success) {
    throw new Error("Current local data cannot be restored from a valid backup");
  }
  return backup;
}

export function backupFileName(): string {
  return `red-fit-backup-${getLocalDateKey()}.json`;
}

/** Trigger a JSON download of the full backup. */
export async function exportBackupFile(): Promise<void> {
  const backup = await createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  // Browser Blob.size measures actual UTF-8 bytes, including Unicode names.
  // Never offer a file the normal RED Fit importer would refuse to restore.
  assertRestorableBackupSize(blob.size);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = backupFileName();
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Revoking immediately can abort downloads in embedded/native WebViews.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  // Only mark the backup as created after validation and download initiation.
  // Metadata failure is non-critical, unlike data or size validation.
  await settingsRepository.updateMetadata({ lastBackupAt: backup.exportedAt })
    .catch(() => undefined);
}

/**
 * JSON.parse does not protect against dangerous keys: an own "__proto__" or
 * "constructor" key must never reach a merge path. The whole import is
 * rejected early, without partial mutation.
 */
export function findDangerousKey(root: unknown): string | null {
  const stack: { value: unknown; path: string }[] = [{ value: root, path: "data" }];
  const seen = new WeakSet<object>();
  while (stack.length > 0) {
    const { value, path } = stack.pop()!;
    if (value === null || typeof value !== "object") continue;
    if (seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item, i) => stack.push({ value: item, path: `${path}[${i}]` }));
      continue;
    }
    for (const key of Object.getOwnPropertyNames(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return `${path}.${key}`;
      }
      stack.push({
        value: (value as Record<string, unknown>)[key],
        path: `${path}.${key}`,
      });
    }
  }
  return null;
}

export type BackupReadResult =
  | { ok: true; backup: RedFitBackup }
  | { ok: false; error: string };

/** Placeholder for future backup migrations (schemaVersion 1 needs none). */
export function migrateBackupToCurrentVersion(backup: RedFitBackup): RedFitBackup {
  return backup;
}

export function parseBackupJson(text: string): BackupReadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Die Datei ist kein gültiges JSON." };
  }
  const dangerous = findDangerousKey(raw);
  if (dangerous) {
    return { ok: false, error: `Unzulässiger Schlüssel im Backup (${dangerous}).` };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Die Datei passt nicht zum RED-Fit-Backup-Format." };
  }
  if (parsed.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: "Das Backup stammt aus einer neueren RED-Fit-Version.",
    };
  }
  return { ok: true, backup: migrateBackupToCurrentVersion(parsed.data) };
}

export interface BackupPreview {
  exercises: number;
  workoutPlans: number;
  workoutLogs: number;
  foodItems: number;
  mealLogs: number;
  nutritionGoals: number;
  waterLogs: number;
  bodyMeasurements: number;
  shoppingLists: number;
  mealPlans: number;
  recipes: number;
  recoveryLogs: number;
}

export function buildPreview(backup: RedFitBackup): BackupPreview {
  const d = backup.data;
  return {
    exercises: d.exercises.length,
    workoutPlans: d.workoutPlans.length,
    workoutLogs: d.workoutLogs.length,
    foodItems: d.foodItems.length,
    mealLogs: d.mealLogs.length,
    nutritionGoals: d.nutritionGoals.length,
    waterLogs: d.waterLogs.length,
    bodyMeasurements: d.bodyMeasurements.length,
    shoppingLists: d.shoppingLists.length,
    mealPlans: d.mealPlans.length,
    recipes: d.recipes.length,
    recoveryLogs: d.recoveryLogs?.length ?? 0,
  };
}

export type ImportStrategy = "keepExisting" | "replaceWithBackup";

export interface ImportResult {
  added: number;
  replaced: number;
  skipped: number;
}

/**
 * A merge can leave the DB with two plans/workouts marked active or two meal
 * logs for the same (date, mealType) slot — states the app assumes impossible.
 * These helpers restore the invariants inside the import transaction.
 * `preferIds` are the ids that existed locally BEFORE the merge (local wins).
 */
async function normalizeActivePlans(preferIds: Set<string>): Promise<void> {
  const activePlans = (await db.workoutPlans.toArray()).filter((p) => p.active);
  if (activePlans.length <= 1) return;
  const keep =
    activePlans.find((p) => preferIds.has(p.id)) ??
    activePlans.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
  for (const plan of activePlans) {
    if (plan.id === keep.id) continue;
    await db.workoutPlans.update(plan.id, { active: false, updatedAt: nowIso() });
  }
}

async function normalizeActiveWorkouts(preferIds: Set<string>): Promise<void> {
  const active = await db.workoutLogs.where("status").equals("active").toArray();
  if (active.length <= 1) return;
  const keep =
    active.find((w) => preferIds.has(w.id)) ??
    active.reduce((a, b) => (b.startedAt > a.startedAt ? b : a));
  for (const workout of active) {
    if (workout.id === keep.id) continue;
    await db.workoutLogs.update(workout.id, {
      status: "cancelled",
      updatedAt: nowIso(),
    });
  }
}

/**
 * Exactly one meal log per (date, mealType): duplicates are merged into the
 * kept log (entries concatenated, deduplicated by entry id, notes joined) —
 * no user data is lost, only the redundant container rows are removed.
 */
async function mergeDuplicateMealLogs(preferIds: Set<string>): Promise<void> {
  const all = await db.mealLogs.toArray();
  const bySlot = new Map<string, MealLog[]>();
  for (const log of all) {
    const slot = `${log.date}|${log.mealType}`;
    const group = bySlot.get(slot);
    if (group) group.push(log);
    else bySlot.set(slot, [log]);
  }
  for (const group of bySlot.values()) {
    if (group.length <= 1) continue;
    group.sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    const keep = group.find((l) => preferIds.has(l.id)) ?? group[0];
    const entries: MealFoodEntry[] = [];
    const seenEntryIds = new Set<string>();
    const notes: string[] = [];
    for (const log of [keep, ...group.filter((l) => l.id !== keep.id)]) {
      for (const entry of log.entries) {
        if (seenEntryIds.has(entry.id)) continue;
        seenEntryIds.add(entry.id);
        entries.push(entry);
      }
      if (log.notes && !notes.includes(log.notes)) notes.push(log.notes);
    }
    await db.mealLogs.put({
      ...keep,
      entries,
      notes: notes.length > 0 ? notes.join("\n") : undefined,
      updatedAt: nowIso(),
    });
    for (const log of group) {
      if (log.id !== keep.id) await db.mealLogs.delete(log.id);
    }
  }
}

/**
 * Merge import — never deletes user data.
 * New ids are added; existing ids follow the chosen strategy
 * (default: keep existing data untouched). Settings are restored via the
 * singleton row, and app invariants (one active plan, one active workout,
 * one meal log per slot) are re-established inside the same transaction.
 */
export async function importBackup(
  backup: RedFitBackup,
  strategy: ImportStrategy = "keepExisting",
): Promise<ImportResult> {
  const result: ImportResult = { added: 0, replaced: 0, skipped: 0 };

  async function mergeTable<T extends { id: string }>(
    table: import("dexie").EntityTable<T, "id">,
    items: T[],
  ): Promise<void> {
    for (const item of items) {
      const existing = await table.get(item.id as never);
      if (!existing) {
        await table.put(item as Parameters<typeof table.put>[0]);
        result.added++;
      } else if (strategy === "replaceWithBackup") {
        await table.put(item as Parameters<typeof table.put>[0]);
        result.replaced++;
      } else {
        result.skipped++;
      }
    }
  }

  const d = backup.data;
  await db.transaction(
    "rw",
    [
      db.exercises,
      db.workoutPlans,
      db.workoutLogs,
      db.foodItems,
      db.mealLogs,
      db.nutritionGoals,
      db.waterLogs,
      db.bodyMeasurements,
      db.shoppingLists,
      db.mealPlans,
      db.recipes,
      db.userProfiles,
      db.recoveryLogs,
      db.settings,
    ],
    async () => {
      // Remember what existed locally BEFORE the merge — normalization
      // prefers local rows over freshly imported ones.
      const localActivePlanIds = new Set(
        (await db.workoutPlans.toArray()).filter((p) => p.active).map((p) => p.id),
      );
      const localActiveWorkoutIds = new Set(
        (await db.workoutLogs.where("status").equals("active").toArray()).map(
          (w) => w.id,
        ),
      );
      const localMealLogIds = new Set(
        (await db.mealLogs.toArray()).map((m) => m.id),
      );

      await mergeTable(db.exercises, d.exercises);
      await mergeTable(db.workoutPlans, d.workoutPlans);
      await mergeTable(db.workoutLogs, d.workoutLogs);
      await mergeTable(db.foodItems, d.foodItems);
      await mergeTable(db.mealLogs, d.mealLogs);
      await mergeTable(db.nutritionGoals, d.nutritionGoals);
      await mergeTable(db.waterLogs, d.waterLogs);
      await mergeTable(db.bodyMeasurements, d.bodyMeasurements);
      await mergeTable(db.shoppingLists, d.shoppingLists);
      await mergeTable(db.mealPlans, d.mealPlans);
      await mergeTable(db.recipes, d.recipes);
      await mergeTable(db.userProfiles, d.userProfiles);
      // Optional in v1 backups — merge only when present.
      if (d.recoveryLogs) await mergeTable(db.recoveryLogs, d.recoveryLogs);

      // Settings are a singleton row (no id in the backup) — restore via the
      // repository path instead of mergeTable.
      const backupSettings = d.settings[0];
      if (backupSettings) {
        const existing = await db.settings.get(SETTINGS_ID);
        if (!existing) {
          await settingsRepository.saveSettings(backupSettings);
          result.added++;
        } else if (strategy === "replaceWithBackup") {
          await settingsRepository.saveSettings(backupSettings);
          result.replaced++;
        } else {
          result.skipped++;
        }
      }

      await normalizeActivePlans(localActivePlanIds);
      await normalizeActiveWorkouts(localActiveWorkoutIds);
      await mergeDuplicateMealLogs(localMealLogIds);
    },
  );
  return result;
}
