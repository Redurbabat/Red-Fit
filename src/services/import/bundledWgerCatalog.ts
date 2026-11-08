import { parseWgerImportJson, type WgerExercisePreview } from "./wgerExerciseAdapter";

/**
 * Offline-capable, source-reviewed wger exercise fixture.
 *
 * The JSON is shipped at public/data/wger-verified-789.json (not downloaded
 * from a third-party API). Import is ALWAYS opt-in; this module only builds
 * a preview. No writes to IndexedDB happen until the user confirms.
 *
 * The Vite PWA precaches .json assets, and native shells package /data/ in
 * their static dist, so the catalog remains available without a backend.
 */
export const BUNDLED_WGER_CATALOG_PATH = "data/wger-verified-789.json";
export const BUNDLED_WGER_CATALOG_SIZE = 789;

export async function loadBundledWgerCatalog(): Promise<WgerExercisePreview[]> {
  const url = import.meta.env.BASE_URL + BUNDLED_WGER_CATALOG_PATH;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Built-in wger catalog unavailable (HTTP ${response.status})`);
  }

  const preview = parseWgerImportJson(await response.text());
  if (preview.length !== BUNDLED_WGER_CATALOG_SIZE) {
    throw new Error(
      `Expected ${BUNDLED_WGER_CATALOG_SIZE} attributed wger exercises, found ${preview.length}`,
    );
  }
  return preview;
}
