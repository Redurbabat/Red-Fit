import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeImportedMealSlot } from "../src/services/backup/mealImportMerge.ts";

const date = "2026-11-08";
function entry(id, foodId = "food", kcal = 100, extras = {}) {
  return { id, foodId, foodName: foodId, amountG: 100,
    kcal, protein: 8, carbs: 12, fat: 2, ...extras };
}
function log(id, entries, notes = undefined, mealType = "lunch") {
  return {
    id, entries, notes, mealType, date,
    createdAt: "2026-11-08T12:00:00Z",
    updatedAt: "2026-11-08T12:00:00Z",
  };
}

test("distinct IDs merge without losing any entries", () => {
  const result = mergeImportedMealSlot(
    [log("local", [entry("a")]), log("imported", [entry("b")])],
    new Set(["local"]),
  );
  assert.deepEqual(result.keeper.entries.map(x => x.id), ["a", "b"]);
  assert.deepEqual(result.duplicateIds, ["imported"]);
});

test("same ID and identical nutrition is one legitimate duplicate", () => {
  const result = mergeImportedMealSlot(
    [log("local", [entry("same")]), log("imported", [entry("same")])],
    new Set(["local"]),
  );
  assert.equal(result.keeper.entries.length, 1);
});

test("same entry ID with DIFFERENT nutritional snapshots preserves both", () => {
  const result = mergeImportedMealSlot([
    log("local", [entry("shared", "rice", 360)]),
    log("imported", [entry("shared", "pasta", 410)]),
  ], new Set(["local"]));
  assert.equal(result.keeper.entries.length, 2);
  assert.deepEqual(result.keeper.entries.map(x => x.kcal), [360, 410]);
  assert.notEqual(result.keeper.entries[0].id, result.keeper.entries[1].id);
  assert.match(result.keeper.entries[1].id, /^restored:/);
});

test("re-importing the same source file does NOT duplicate a recovered entry", () => {
  const original = log("local", [entry("shared", "rice", 360)]);
  const donor = log("imported", [entry("shared", "pasta", 410)]);
  const first = mergeImportedMealSlot([original, donor], new Set(["local"]));
  const repeated = mergeImportedMealSlot([first.keeper, donor], new Set(["local"]));
  assert.deepEqual(repeated.keeper.entries, first.keeper.entries);
});

test("two conflicting records under the same donor entry ID get unique suffixes", () => {
  const original = log("local", [entry("shared", "rice", 360)]);
  const donor = log("imported", [
    entry("shared", "pasta", 410),
    entry("shared", "quinoa", 320),
  ]);
  const result = mergeImportedMealSlot([original, donor], new Set(["local"]));
  assert.equal(result.keeper.entries.length, 3);
  assert.equal(new Set(result.keeper.entries.map(x => x.id)).size, 3);
  assert.deepEqual(result.keeper.entries.map(x => x.kcal), [360, 410, 320]);
  const repeated = mergeImportedMealSlot([result.keeper, donor], new Set(["local"]));
  assert.deepEqual(repeated.keeper.entries, result.keeper.entries);
});

test("cooked weight and yield differences count as distinct meal snapshots", () => {
  const raw = entry("same", "rice", 360);
  const cooked = entry("same", "rice", 360, {
    weighedAs: "cooked", weighedAmountG: 260, cookingYieldFactor: 2.6,
  });
  const result = mergeImportedMealSlot(
    [log("local", [raw]), log("imported", [cooked])], new Set(["local"]),
  );
  assert.equal(result.keeper.entries.length, 2);
  assert.equal(result.keeper.entries[1].weighedAmountG, 260);
});

test("the local container wins and distinct notes are preserved", () => {
  const result = mergeImportedMealSlot([
    log("other", [entry("one")], "Backup note"),
    log("local", [entry("two")], "Local note"),
  ], new Set(["local"]));
  assert.equal(result.keeper.id, "local");
  assert.deepEqual(result.keeper.entries.map(e => e.id), ["two", "one"]);
  assert.equal(result.keeper.notes, "Local note\nBackup note");
});

test("empty, mixed meal or mixed date groups are rejected before mutation", () => {
  assert.throws(() => mergeImportedMealSlot([], new Set()), /empty/);
  assert.throws(() => mergeImportedMealSlot(
    [log("a", []), log("b", [], undefined, "dinner")], new Set()), /different/);
  assert.throws(() => mergeImportedMealSlot(
    [log("a", []), { ...log("b", []), date: "2026-11-07" }], new Set()), /different/);
});

test("input logs and entries remain untouched", () => {
  const first = log("local", [entry("same", "rice", 350)]);
  const second = log("imported", [entry("same", "pasta", 400)]);
  mergeImportedMealSlot([first, second], new Set(["local"]));
  assert.equal(first.entries[0].id, "same");
  assert.equal(second.entries[0].id, "same");
  assert.equal(first.entries.length, 1);
  assert.equal(second.entries.length, 1);
});

test("generated IDs include source container identity to prevent aliasing", () => {
  const keep = log("local", [entry("shared", "rice", 350)]);
  const result = mergeImportedMealSlot([
    keep,
    log("source-A", [entry("shared", "pasta", 400)]),
    log("source-B", [entry("shared", "lentils", 300)]),
  ], new Set(["local"]));
  assert.equal(result.keeper.entries.length, 3);
  assert.equal(new Set(result.keeper.entries.map(e => e.id)).size, 3);
  assert.equal(result.keeper.entries[1].foodId, "pasta");
  assert.equal(result.keeper.entries[2].foodId, "lentils");
});
