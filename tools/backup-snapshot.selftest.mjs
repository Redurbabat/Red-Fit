/**
 * Dependency-free structural and simulated snapshot tests.
 * Extracts the ACTUAL collectBackupData() body from the checked-out source.
 * The IDB stub simulates one transaction-wide snapshot; real Dexie tests
 * live in backupSnapshot.test.ts and remain mandatory for release.
 *
 * node --test tools/backup-snapshot.selftest.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/services/backup/backupService.ts", import.meta.url), "utf8",
);
const match = source.match(
  /export async function collectBackupData\(\): Promise<BackupData> \{([\s\S]*?)\n\}\n\nexport async function createBackup/,
);
assert.ok(match, "Production snapshot method could not be extracted");
const body = match[1].replace("settings satisfies UserSettings", "settings");

const names = [
  "exercises", "workoutPlans", "workoutLogs", "foodItems", "mealLogs",
  "nutritionGoals", "waterLogs", "bodyMeasurements", "shoppingLists",
  "mealPlans", "recipes", "userProfiles", "recoveryLogs", "settings",
];

function environment() {
  let revision = 0;
  let active = null;
  const scopes = [];
  const copy = (item) => structuredClone(item);
  const tables = Object.fromEntries(names.map((name) => [
    name, { name, toArray: async () => {
      assert.ok(active, `Unprotected read of ${name}`);
      assert.ok(active.scope.has(name), `Missing transaction table: ${name}`);
      await Promise.resolve();
      return name === "foodItems"
        ? [{ id: `food-${active.revision}`, version: active.revision }]
        : name === "mealLogs"
        ? [{ id: `meal-${active.revision}`, version: active.revision }]
        : [];
    } },
  ]));
  const db = {
    ...tables,
    transaction: async (mode, selected, run) => {
      assert.equal(mode, "r");
      assert.equal(active, null);
      active = { revision, scope: new Set(selected.map(t => t.name)) };
      scopes.push(active.scope);
      try { return await run(); }
      finally { active = null; }
    },
  };
  const settingsRepository = {
    getSettings: async () => {
      assert.ok(active, "Settings must be read inside the transaction");
      assert.ok(active.scope.has("settings"));
      return { theme: "dark", snapshotVersion: active.revision };
    },
  };
  const collect = new Function(
    "db", "settingsRepository",
    `return async function collectBackupData() {${body}\n}`,
  )(db, settingsRepository);
  return { collect, scopes, update: () => { revision++; } };
}

test("the backup reads every included table in one read-only transaction", async () => {
  const { collect, scopes } = environment();
  const result = await collect();
  assert.equal(scopes.length, 1);
  assert.deepEqual([...scopes[0]].sort(), [...names].sort());
  assert.equal(result.settings[0].snapshotVersion, 0);
});

test("concurrent writes cannot produce a torn food/meal snapshot", async () => {
  const { collect, update } = environment();
  const pending = collect();
  update(); // another tab changes food and meal after the snapshot begins
  const snapshot = await pending;
  assert.equal(snapshot.foodItems[0].version, 0);
  assert.equal(snapshot.mealLogs[0].version, 0);
  assert.equal(snapshot.settings[0].snapshotVersion, 0);
  const newer = await collect();
  assert.equal(newer.foodItems[0].version, 1);
  assert.equal(newer.mealLogs[0].version, 1);
});

test("the snapshot includes optional recovery logs and user settings", async () => {
  const { collect } = environment();
  const snapshot = await collect();
  assert.ok(Array.isArray(snapshot.recoveryLogs));
  assert.equal(snapshot.settings.length, 1);
  assert.deepEqual(snapshot.settings[0].theme, "dark");
});

test("backup generation validates records before offering the file", () => {
  const createStart = source.indexOf("export async function createBackup()");
  const exportStart = source.indexOf("export function backupFileName()", createStart);
  assert.ok(createStart >= 0 && exportStart > createStart);
  const body = source.slice(createStart, exportStart);
  assert.match(body, /backupSchema\.safeParse\(backup\)/);
});

test("export validates UTF-8 file size before scheduling the download", () => {
  const from = source.indexOf("export async function exportBackupFile()");
  const to = source.indexOf("/**\n * JSON.parse", from);
  const body = source.slice(from, to);
  const checkedAt = body.indexOf("assertRestorableBackupSize(blob.size)");
  const downloadAt = body.indexOf("anchor.click()");
  assert.ok(checkedAt > 0 && downloadAt > checkedAt);
  assert.match(source, /export const MAX_IMPORT_BYTES = MAX_STANDARD_BACKUP_BYTES/);
});

test("a refused export does not mark the last backup as successful", () => {
  const from = source.indexOf("export async function exportBackupFile()");
  const to = source.indexOf("/**\n * JSON.parse", from);
  const body = source.slice(from, to);
  assert.ok(body.indexOf("assertRestorableBackupSize") <
    body.indexOf("updateMetadata({ lastBackupAt:"));
});
