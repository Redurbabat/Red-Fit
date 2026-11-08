import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeMealSlotForAppend, replaceEntryInLog, removeEntryFromLog,
} from "../src/services/storage/mealEntryOperations.ts";

const mealType = "lunch";
const day = "2026-11-08";
function entry(id, kcal = 100) {
  return {
    id, foodId: "food-" + id, foodName: "Test " + id,
    amountG: 100, kcal, protein: 10, carbs: 10, fat: 2,
  };
}
function log(id, entries, notes, createdAt = "2026-11-08T12:00:00Z") {
  return { id, date: day, mealType, entries, notes, createdAt, updatedAt: createdAt };
}

test("merges two legacy containers without losing entries or notes", () => {
  const original = log("a", [entry("a")], "A");
  const second = log("b", [entry("b")], "B");
  const result = mergeMealSlotForAppend([original, second], entry("c"));
  assert.equal(result.keeper.id, "a");
  assert.deepEqual(result.keeper.entries.map(e => e.id), ["a", "b", "c"]);
  assert.equal(result.keeper.notes, "A\nB");
  assert.deepEqual(result.duplicateIds, ["b"]);
});

test("appending the same entry ID twice is idempotent", () => {
  const original = log("a", [entry("a")]);
  const result = mergeMealSlotForAppend([original], entry("a"));
  assert.deepEqual(result.keeper.entries.map(e => e.id), ["a"]);
  assert.deepEqual(result.duplicateIds, []);
});

test("merging duplicate entry IDs keeps the first original snapshot", () => {
  const result = mergeMealSlotForAppend(
    [log("a", [entry("same", 100)]), log("b", [entry("same", 200)])],
    entry("new"),
  );
  assert.deepEqual(result.keeper.entries.map(e => e.id), ["same", "new"]);
  assert.equal(result.keeper.entries[0].kcal, 100);
});

test("keeper selection is deterministic and does not mutate arguments", () => {
  const later = log("z", [entry("z")], undefined, "2026-11-08T20:00:00Z");
  const earlier = log("b", [entry("b")], undefined, "2026-11-08T08:00:00Z");
  const originals = [later, earlier];
  const result = mergeMealSlotForAppend(originals, entry("new"));
  assert.equal(result.keeper.id, "b");
  assert.deepEqual(originals.map(l => l.id), ["z", "b"]);
  assert.equal(later.entries.length, 1);
});

test("rejects empty slots and mixed date or meal types", () => {
  assert.throws(() => mergeMealSlotForAppend([], entry("x")), /empty meal slot/);
  assert.throws(() => mergeMealSlotForAppend([
    log("a", [entry("a")]),
    { ...log("b", [entry("b")]), date: "2026-11-07" },
  ], entry("c")), /different slots/);
  assert.throws(() => mergeMealSlotForAppend([
    log("a", [entry("a")]),
    { ...log("b", [entry("b")]), mealType: "dinner" },
  ], entry("c")), /different slots/);
});

test("single entry updates do not overwrite an unrelated entry or metadata", () => {
  const cooked = { ...entry("rice"), weighedAs: "cooked",
    weighedAmountG: 260, cookingYieldFactor: 2.6, estimateLevel: "low" };
  const original = log("a", [cooked, entry("noodles")], "Keep notes");
  const updated = replaceEntryInLog(original, cooked.id, {
    ...cooked, weighedAmountG: 390, amountG: 150, kcal: 547.5,
  });
  assert.equal(updated.notes, "Keep notes");
  assert.equal(updated.entries[0].cookingYieldFactor, 2.6);
  assert.equal(updated.entries[0].weighedAmountG, 390);
  assert.equal(updated.entries[1].id, "noodles");
  assert.equal(original.entries[0].weighedAmountG, 260);
});

test("stale or mismatched entry edits are rejected", () => {
  const current = log("a", [entry("a")]);
  assert.throws(() => replaceEntryInLog(current, "missing", entry("missing")), /no longer exists/);
  assert.throws(() => replaceEntryInLog(current, "a", entry("different")), /Cannot change/);
});

test("deleting one meal entry leaves other entries unchanged", () => {
  const current = log("a", [entry("a"), entry("b")], "Keep me");
  const updated = removeEntryFromLog(current, "a");
  assert.deepEqual(updated?.entries.map(e => e.id), ["b"]);
  assert.equal(updated?.notes, "Keep me");
  assert.equal(current.entries.length, 2);
});

test("deleting the final entry removes its empty meal container", () => {
  assert.equal(removeEntryFromLog(log("a", [entry("a")]), "a"), null);
});

test("attempting to remove an already deleted entry fails explicitly", () => {
  assert.throws(() => removeEntryFromLog(log("a", [entry("a")]), "ghost"), /no longer exists/);
});
