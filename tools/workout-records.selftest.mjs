/**
 * Dependency-free, source-backed check of RED Fit personal-record calculations.
 *
 * Loads the *real* workout.ts via Node's built-in TS type stripper. Only the
 * unrelated calendar utilities are replaced with throwing stubs; PR logic
 * runs unmodified and therefore catches drift from the Vitest expectations.
 *
 * Run: node --test tools/workout-records.selftest.mjs (Node >=22.16)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripTypeScriptTypes } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "src/services/calculations/workout.ts"), "utf8");
const calendarImport = 'import { getIsoWeekKey, getLocalDateKey } from "../../utils/dates";';
assert.ok(source.includes(calendarImport), "Calendar import changed: review this isolated harness");
const isolated = source.replace(calendarImport,
  'const getIsoWeekKey = () => { throw new Error("Calendar code is not part of record tests"); }; ' +
  'const getLocalDateKey = () => { throw new Error("Calendar code is not part of record tests"); };');
const js = stripTypeScriptTypes(isolated, { mode: "strip" });
const { findNewRecords } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

function workout(id, sets, status = "completed") {
  return {
    id, status,
    exerciseLogs: [
      { exerciseId: "exercise", name: "Testübung", setLogs: sets.map(([weightKg, reps, completed = true]) =>
        ({ weightKg, reps, completed })) },
    ],
  };
}

test("a heavier completed set is a new record", () => {
  const old = workout("old", [[70, 10]]);
  const current = workout("new", [[75, 8]]);
  assert.equal(findNewRecords(current, [old])[0]?.maxWeightKg, 75);
});

test("more repetitions at an unchanged top weight count as a record", () => {
  const old = workout("old", [[80, 8]]);
  const current = workout("new", [[80, 10]]);
  const records = findNewRecords(current, [old]);
  assert.equal(records.length, 1);
  assert.equal(records[0].maxRepsAtMaxWeight, 10);
});

test("an unchanged weight and rep count is not a record", () => {
  assert.deepEqual(findNewRecords(workout("new", [[80, 8]]),
    [workout("old", [[80, 8]])]), []);
});

test("bodyweight repetitions use zero kg but still register progression", () => {
  const old = workout("old", [[0, 8]]);
  const current = workout("new", [[0, 12]]);
  const records = findNewRecords(current, [old]);
  assert.equal(records.length, 1);
  assert.equal(records[0].maxWeightKg, 0);
  assert.equal(records[0].maxRepsAtMaxWeight, 12);
});

test("zero-repetition and unfinished sets do not create records", () => {
  assert.deepEqual(findNewRecords(workout("new", [[80, 0]]), []), []);
  assert.deepEqual(findNewRecords(workout("new", [[80, 12, false]]), []), []);
});

test("discarded or still-active workouts cannot create records", () => {
  for (const status of ["cancelled", "active", "planned"]) {
    assert.deepEqual(findNewRecords(workout("new", [[100, 12]], status), []), []);
  }
});

test("multiple blocks for one exercise create only one record card", () => {
  const current = workout("new", [[90, 6], [90, 10]]);
  const records = findNewRecords(current, [workout("old", [[90, 8]])]);
  assert.equal(records.length, 1);
  assert.equal(records[0].maxRepsAtMaxWeight, 10);
});
