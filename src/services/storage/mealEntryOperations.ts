import type { MealFoodEntry, MealLog } from "../../models/nutrition";

/**
 * Pure meal-log operations. Dexie calls wrap these in a read-write
 * transaction so different app tabs cannot overwrite one another.
 */
export function mergeMealSlotForAppend(
  logs: MealLog[],
  entry: MealFoodEntry,
): { keeper: MealLog; duplicateIds: string[] } {
  if (logs.length === 0) throw new Error("Cannot merge an empty meal slot");
  const ordered = [...logs].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const [first] = ordered;
  // Guard against invalid callers so unrelated dates/meals never merge.
  if (ordered.some((log) => log.date !== first.date || log.mealType !== first.mealType)) {
    throw new Error("Cannot merge meal logs from different slots");
  }
  const entries: MealFoodEntry[] = [];
  const known = new Set<string>();
  const notes: string[] = [];
  for (const log of ordered) {
    for (const current of log.entries) {
      if (known.has(current.id)) continue;
      known.add(current.id);
      entries.push(current);
    }
    if (log.notes && !notes.includes(log.notes)) notes.push(log.notes);
  }
  // Repeated submission of exactly the same entry is idempotent.
  if (!known.has(entry.id)) entries.push(entry);

  return {
    keeper: {
      ...first,
      entries,
      notes: notes.length ? notes.join("\n") : first.notes,
    },
    duplicateIds: ordered.slice(1).map((log) => log.id),
  };
}

/** Replace exactly one entry in a fresh log snapshot, not a stale UI array. */
export function replaceEntryInLog(
  log: MealLog,
  entryId: string,
  updated: MealFoodEntry,
): MealLog {
  if (updated.id !== entryId) throw new Error("Cannot change a meal entry ID");
  if (!log.entries.some((entry) => entry.id === entryId)) {
    throw new Error("Meal entry no longer exists");
  }
  return {
    ...log,
    entries: log.entries.map((entry) => entry.id === entryId ? updated : entry),
  };
}

/**
 * Deleting the last entry also deletes its empty container.
 * Throws on stale IDs instead of claiming that a deletion succeeded.
 */
export function removeEntryFromLog(log: MealLog, entryId: string): MealLog | null {
  if (!log.entries.some((entry) => entry.id === entryId)) {
    throw new Error("Meal entry no longer exists");
  }
  const entries = log.entries.filter((entry) => entry.id !== entryId);
  return entries.length ? { ...log, entries } : null;
}
