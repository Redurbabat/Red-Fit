import type { MealFoodEntry, MealLog } from "../../models/nutrition";

/**
 * Consolidate meal containers for the same (date, mealType) after a backup
 * import. Unlike a Set of entry IDs, this does NOT discard distinct food
 * snapshots that happen to share an ID across devices.
 *
 * The recovered ID is deterministic for (source container ID, original
 * entry ID), making repeated imports idempotent. A numeric suffix covers
 * collisions with an existing recovered ID containing different nutrients.
 */
export function mergeImportedMealSlot(
  group: MealLog[],
  preferredIds: ReadonlySet<string>,
): { keeper: MealLog; duplicateIds: string[] } {
  if (group.length === 0) throw new Error("Cannot merge an empty meal slot");

  const ordered = [...group].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const first = ordered[0];
  if (ordered.some((log) => log.date !== first.date || log.mealType !== first.mealType)) {
    throw new Error("Cannot merge meals from different date/type slots");
  }
  const keep = ordered.find((log) => preferredIds.has(log.id)) ?? first;
  const all = [keep, ...ordered.filter((log) => log.id !== keep.id)];

  const entries: MealFoodEntry[] = [];
  const byId = new Map<string, MealFoodEntry>();
  const notes: string[] = [];

  for (const log of all) {
    for (const entry of log.entries) {
      const existing = byId.get(entry.id);
      if (!existing) {
        entries.push(entry);
        byId.set(entry.id, entry);
        continue;
      }
      if (sameMealPayload(existing, entry)) continue;

      // Different foods/macros with the same entry ID: keep BOTH instead of
      // silently throwing the later one away. The source log ID namespaces
      // the recovered entry, and repeat restores find the same ID.
      const base = `restored:${log.id.length}:${log.id}:${entry.id.length}:${entry.id}`;
      let recoveredId = base;
      let suffix = 0;
      while (true) {
        const occupant = byId.get(recoveredId);
        if (!occupant) {
          const recovered = { ...entry, id: recoveredId };
          entries.push(recovered);
          byId.set(recoveredId, recovered);
          break;
        }
        if (sameMealPayload(occupant, entry)) break;
        suffix += 1;
        recoveredId = `${base}:${suffix}`;
      }
    }
    // A previous import may already have joined this note with another
    // note. Match whole line-delimited blocks, not arbitrary substrings,
    // so re-import does not keep appending the same note again.
    if (log.notes && !notes.some((block) =>
      (`\n${block}\n`).includes(`\n${log.notes}\n`)
    )) {
      notes.push(log.notes);
    }
  }

  return {
    keeper: {
      ...keep,
      entries,
      notes: notes.length ? notes.join("\n") : undefined,
    },
    duplicateIds: ordered.filter((log) => log.id !== keep.id).map((log) => log.id),
  };
}

/** Only schema fields: optional fields absent and undefined are equivalent. */
function sameMealPayload(a: MealFoodEntry, b: MealFoodEntry): boolean {
  return a.foodId === b.foodId &&
    a.foodName === b.foodName &&
    a.amountG === b.amountG &&
    a.weighedAs === b.weighedAs &&
    a.weighedAmountG === b.weighedAmountG &&
    a.cookingYieldFactor === b.cookingYieldFactor &&
    a.estimateLevel === b.estimateLevel &&
    a.kcal === b.kcal &&
    a.protein === b.protein &&
    a.carbs === b.carbs &&
    a.fat === b.fat;
}
