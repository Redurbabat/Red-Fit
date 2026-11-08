import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextWorkoutRevision,
  WorkoutRevisionConflictError,
} from "../src/services/workout/workoutRevision.ts";
import { createSerializedWorkoutWriter } from "../src/services/workout/serializedWorkoutWriter.ts";

test("first save of a legacy workout starts at revision 1", () => {
  assert.equal(nextWorkoutRevision(undefined, undefined), 1);
  assert.equal(nextWorkoutRevision(0, undefined), 1);
});

test("one tab may continue saving when its expected revision is fresh", () => {
  assert.equal(nextWorkoutRevision(0, 0), 1);
  assert.equal(nextWorkoutRevision(1, 1), 2);
  assert.equal(nextWorkoutRevision(3, 3), 4);
});

test("a second active tab cannot overwrite the first tab's updated sets", () => {
  const tabA = { saveRevision: 0, reps: 8 };
  const tabB = { saveRevision: 0, reps: 5 };
  const stored = { ...tabA, saveRevision: nextWorkoutRevision(tabA.saveRevision, 0) };
  assert.equal(stored.reps, 8);
  assert.throws(
    () => nextWorkoutRevision(tabB.saveRevision, stored.saveRevision),
    WorkoutRevisionConflictError,
  );
  assert.equal(stored.reps, 8);
});

test("simultaneous writes based on the same revision accept only one", async () => {
  let persisted = { saveRevision: 0, value: "original" };
  const write = async (snapshot) => {
    const revision = nextWorkoutRevision(snapshot.saveRevision, persisted.saveRevision);
    // In production this whole operation runs inside a Dexie rw transaction.
    persisted = { ...snapshot, saveRevision: revision };
    return persisted;
  };
  const first = await write({ saveRevision: 0, value: "from tab A" });
  await assert.rejects(
    async () => write({ saveRevision: 0, value: "from tab B" }),
    WorkoutRevisionConflictError,
  );
  assert.equal(persisted.value, "from tab A");
  assert.equal(persisted.saveRevision, first.saveRevision);
});

test("ordered writes within a single tab advance the revision between saves", async () => {
  const history = [];
  let persistedRevision = 0;
  let localRevision = 0;
  const writer = createSerializedWorkoutWriter(async (snapshot) => {
    const saved = nextWorkoutRevision(localRevision, persistedRevision);
    persistedRevision = saved;
    localRevision = saved;
    history.push({ ...snapshot, saveRevision: saved });
  });
  await Promise.all([writer({ reps: 7 }), writer({ reps: 8 }), writer({ reps: 9 })]);
  assert.deepEqual(history.map(v => v.saveRevision), [1, 2, 3]);
  assert.deepEqual(history.map(v => v.reps), [7, 8, 9]);
});

test("a stale read does not automatically adopt the new revision", () => {
  assert.throws(() => nextWorkoutRevision(undefined, 1), WorkoutRevisionConflictError);
  assert.throws(() => nextWorkoutRevision(1, 2), WorkoutRevisionConflictError);
  assert.throws(() => nextWorkoutRevision(5, 2), WorkoutRevisionConflictError);
});

test("malformed revisions and negative values are rejected", () => {
  for (const value of [-1, -0.5, NaN, Infinity, 1.5]) {
    assert.throws(() => nextWorkoutRevision(value, 0), RangeError);
    assert.throws(() => nextWorkoutRevision(0, value), RangeError);
  }
});

test("revision overflow is rejected instead of losing compare-and-swap precision", () => {
  assert.throws(() => nextWorkoutRevision(Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER), RangeError);
});
