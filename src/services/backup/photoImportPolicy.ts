/** Decisions for importing private photo backups without modifying local media. */

/**
 * A preexisting photo with a missing binary is corrupted local state. Do not
 * count it as a successfully skipped import: fail the transaction so the user
 * can explicitly resolve the issue without overwriting unrelated data.
 */
export function shouldSkipExistingPhoto(
  photoExists: boolean,
  mediaExists: boolean,
): boolean {
  if (!photoExists) return false;
  if (!mediaExists) {
    throw new Error("A local progress photo is missing its media asset");
  }
  return true;
}

/**
 * If the imported asset ID is occupied, choose a fresh ID. Recheck every
 * generated value: even an ID generator can collide. A hard retry bound
 * prevents an infinite transaction when the generator is broken.
 *
 * `exists` must be called inside the same Dexie read-write transaction as
 * the eventual asset insertion.
 */
export async function availablePhotoAssetId(
  originalId: string,
  exists: (id: string) => Promise<boolean>,
  generate: () => string,
  maxAttempts = 8,
): Promise<string> {
  let candidate = originalId;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!(await exists(candidate))) return candidate;
    candidate = generate();
  }
  throw new Error("Could not allocate an unused photo media ID");
}
