import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextImportedWorkoutRevision } from "../src/services/backup/workoutImportRevision.ts";
import {
  nextWorkoutRevision, WorkoutRevisionConflictError,
} from "../src/services/workout/workoutRevision.ts";

test("legacy local and imported workouts start at revision 1 after replacement", () => {
  assert.equal(nextImportedWorkoutRevision(undefined, undefined), 1);
  assert.equal(nextImportedWorkoutRevision(0, 0), 1);
});

test("the newer local revision wins when restoring an older snapshot", () => {
  assert.equal(nextImportedWorkoutRevision(15, 2), 16);
});

test("the higher imported revision is also respected", () => {
  assert.equal(nextImportedWorkoutRevision(3, 30), 31);
});

test("identical revisions are always incremented after replacement", () => {
  assert.equal(nextImportedWorkoutRevision(6, 6), 7);
});

test("normalizing a duplicate active workout advances its own revision", () => {
  assert.equal(nextImportedWorkoutRevision(7), 8);
});

test("an already-open tab cannot save using a pre-restore revision", () => {
  const oldTabRevision = 6;
  const newStoredRevision = nextImportedWorkoutRevision(6, 6);
  assert.throws(() => nextWorkoutRevision(oldTabRevision, newStoredRevision),
    WorkoutRevisionConflictError);
});

test("older backup revisions cannot become a matching stale token", () => {
  const oldTabRevision = 9;
  const newStoredRevision = nextImportedWorkoutRevision(9, 2);
  assert.notEqual(oldTabRevision, newStoredRevision);
  assert.throws(() => nextWorkoutRevision(oldTabRevision, newStoredRevision),
    WorkoutRevisionConflictError);
});

test("rejects negative, fractional, NaN and infinite revisions", () => {
  for (const invalid of [-1, -0.1, 2.1, NaN, Infinity, -Infinity]) {
    assert.throws(() => nextImportedWorkoutRevision(invalid, 0), RangeError);
    assert.throws(() => nextImportedWorkoutRevision(0, invalid), RangeError);
  }
});

test("refuses revision overflow instead of losing compare-and-swap accuracy", () => {
  assert.throws(() => nextImportedWorkoutRevision(Number.MAX_SAFE_INTEGER, 0),
    RangeError);
  assert.throws(() => nextImportedWorkoutRevision(0, Number.MAX_SAFE_INTEGER),
    RangeError);
});

test("the actual importer wires the helper into replacement AND active normalization", () => {
  const src = readFileSync(
    new URL("../src/services/backup/backupService.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /mergeTable\(db\.workoutLogs, d\.workoutLogs, \(local, imported\) =>/);
  assert.match(src, /saveRevision: nextImportedWorkoutRevision\(\s*local\.saveRevision,\s*imported\.saveRevision/);
  assert.match(src, /saveRevision: nextImportedWorkoutRevision\(workout\.saveRevision\)/);
  assert.match(src, /await normalizeActiveWorkouts\(localActiveWorkoutIds\)/);
});
