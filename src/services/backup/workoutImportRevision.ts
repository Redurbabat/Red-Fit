/**
 * Every successful backup import mutation of an EXISTING workout must advance
 * its revision. Otherwise an open tab holding an old snapshot could silently
 * save over a restored workout if the imported revision matches its token.
 *
 * Legacy workouts without saveRevision are revision zero. New IDs preserve
 * their imported revision as-is; only collisions and import normalization
 * require incrementing.
 */
export function nextImportedWorkoutRevision(
  localRevision: number | undefined,
  importedRevision?: number,
): number {
  const local = localRevision ?? 0;
  const imported = importedRevision ?? 0;
  if (!Number.isSafeInteger(local) || local < 0 ||
      !Number.isSafeInteger(imported) || imported < 0) {
    throw new RangeError("Invalid workout revision in backup");
  }
  const highest = Math.max(local, imported);
  if (highest >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Workout revision exhausted during backup import");
  }
  return highest + 1;
}
