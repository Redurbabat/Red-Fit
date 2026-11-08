/**
 * No-dependency regression checks for the shipped wger fixture.
 * Run: node --test tools/bundled-wger.selftest.mjs
 * These checks verify the reviewed SOURCE SNAPSHOT, not a native build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(root, "public/data/wger-verified-789.json");
const bytes = readFileSync(path);
const rows = JSON.parse(bytes.toString("utf8"));

const expectedSha256 = "5e9b9736afce37d62aaf15a1f3de8cf54ce0b725f5a404ba446192fd03966599";

test("bundled data is byte-identical to the audited source conversion", () => {
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedSha256);
});

test("the source has exactly 789 unique positive, sorted exercise IDs", () => {
  assert.equal(rows.length, 789);
  const ids = rows.map(row => row.sourceId);
  assert.equal(new Set(ids).size, rows.length);
  assert.ok(ids.every(Number.isSafeInteger));
  assert.ok(ids.every(id => id > 0));
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
});

test("every record contains a credited author and explicit CC licence", () => {
  for (const entry of rows) {
    assert.ok(entry.sourceAuthor?.trim(), `Missing author for ${entry.sourceId}`);
    assert.match(entry.sourceLicense, /^(CC-BY-SA 3|CC-BY-SA 4|CC0)/);
    assert.match(entry.sourceLicense, /creativecommons\.org\//);
  }
});

test("known quality-review counts have not silently changed", () => {
  assert.equal(rows.filter(row => row.muscleIds.length === 0).length, 120);
  assert.equal(rows.filter(row => row.categoryId === 8 && row.muscleIds.length === 0).length, 16);
  assert.equal(rows.filter(row => row.equipmentIds.includes(4)).length, 14);
});

test("records are limited to the reviewed text/taxonomy interchange fields", () => {
  const fields = [
    "sourceId", "name", "categoryId", "muscleIds",
    "secondaryMuscleIds", "equipmentIds", "sourceLicense", "sourceAuthor",
  ].sort();
  for (const entry of rows) {
    assert.deepEqual(Object.keys(entry).sort(), fields);
    assert.ok(entry.name.length > 0 && entry.name.length <= 160);
    assert.ok(entry.sourceAuthor.length <= 300);
    assert.ok(entry.sourceLicense.length <= 300);
    for (const key of ["muscleIds", "secondaryMuscleIds", "equipmentIds"]) {
      assert.ok(Array.isArray(entry[key]));
      assert.ok(entry[key].every(value => Number.isSafeInteger(value) && value >= 0));
      assert.ok(entry[key].length <= 30);
    }
  }
});

test("ships well below the size limits of the existing opt-in parser", () => {
  assert.ok(bytes.byteLength < 5_000_000);
  assert.ok(rows.length <= 3000);
});

test("PWA explicitly precaches JSON and the catalog is not automatically seeded", () => {
  const vite = readFileSync(resolve(root, "vite.config.ts"), "utf8");
  const catalogService = readFileSync(
    resolve(root, "src/services/import/bundledWgerCatalog.ts"), "utf8");
  const seedService = readFileSync(
    resolve(root, "src/services/demoData/seed.ts"), "utf8");
  assert.match(vite, /globPatterns:[\s\S]*webmanifest,json/);
  assert.match(catalogService, /parseWgerImportJson/);
  assert.doesNotMatch(catalogService, /db\.exercises|importAttributedExercises/);
  assert.doesNotMatch(seedService, /bundledWgerCatalog|wger-verified-789/);
});
