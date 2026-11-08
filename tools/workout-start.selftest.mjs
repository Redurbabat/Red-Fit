/**
 * Dependency-free source-level regression tests for atomic workout start.
 * Tests the actual createOrResumeWorkout function body with a strictly
 * serializable in-memory transaction stub. NOT a Dexie/IndexedDB test.
 *
 * node --test tools/workout-start.selftest.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/services/workout/workoutService.ts", import.meta.url), "utf8");
const match = source.match(
  /export async function createOrResumeWorkout\(proposed: WorkoutLog\): Promise<WorkoutLog> \{([\s\S]*?)\n\}\n\n\/\*\*\n \* Start a workout/,
);
assert.ok(match, "Cannot extract actual production createOrResumeWorkout implementation");

function environment() {
  const stored = new Map();
  let tail = Promise.resolve();
  const copy = (value) => value === undefined ? undefined : structuredClone(value);
  const table = {
    where: (index) => {
      assert.equal(index, "status");
      return {
        equals: (value) => ({
          first: async () => {
            await Promise.resolve(); // force competing async reads
            return copy([...stored.values()].find((workout) => workout.status === value));
          },
        }),
      };
    },
    add: async (workout) => {
      if (stored.has(workout.id)) throw Error("Duplicate primary key");
      stored.set(workout.id, copy(workout));
    },
  };
  const db = {
    workoutLogs: table,
    transaction: (mode, target, callback) => {
      assert.equal(mode, "rw");
      assert.equal(target, table);
      const current = tail.then(callback);
      // A failed transaction must not deadlock the next start attempt.
      tail = current.then(() => undefined, () => undefined);
      return current;
    },
  };
  const create = new Function(
    "db",
    `return async function createOrResumeWorkout(proposed) {${match[1]}\n}`,
  )(db);
  return { create, stored };
}
const workout = (id, status = "active", saveRevision = 0) => ({
  id, status, saveRevision, name: id,
  exerciseLogs: [{ id: "e", setLogs: [{ id: "s", reps: 8 }] }],
});

test("first training starts once with revision 0", async () => {
  const { create, stored } = environment();
  const a = await create(workout("a"));
  assert.equal(a.id, "a");
  assert.equal(stored.size, 1);
  assert.equal(stored.get("a").saveRevision, 0);
});

test("a second attempt resumes existing ID without changing sets or revision", async () => {
  const { create, stored } = environment();
  stored.set("original", workout("original", "active", 7));
  const resumed = await create(workout("ignored"));
  assert.equal(resumed.id, "original");
  assert.equal(resumed.saveRevision, 7);
  assert.equal(resumed.exerciseLogs[0].setLogs[0].reps, 8);
  assert.equal(stored.has("ignored"), false);
});

test("32 simultaneous starts across competing tabs result in exactly one workout", async () => {
  const { create, stored } = environment();
  const result = await Promise.all(
    Array.from({ length: 32 }, (_, i) => create(workout("tab-" + i))),
  );
  assert.equal(stored.size, 1);
  assert.equal(new Set(result.map((w) => w.id)).size, 1);
  assert.equal(result[0].id, [...stored.keys()][0]);
});

test("completed and cancelled workouts do not block a new active one", async () => {
  const { create, stored } = environment();
  stored.set("done", workout("done", "completed", 3));
  stored.set("discarded", workout("discarded", "cancelled", 4));
  const created = await create(workout("new"));
  assert.equal(created.id, "new");
  assert.equal(stored.size, 3);
});

test("a colliding ID cannot overwrite a completed workout", async () => {
  const { create, stored } = environment();
  stored.set("taken", workout("taken", "completed", 6));
  await assert.rejects(create(workout("taken")), /Duplicate primary key/);
  assert.equal(stored.get("taken").saveRevision, 6);
  assert.equal(stored.get("taken").status, "completed");
});

test("invalid proposed statuses and nonzero initial revisions are rejected", async () => {
  const { create, stored } = environment();
  await assert.rejects(create(workout("completed", "completed")), /revision zero/);
  await assert.rejects(create(workout("stale", "active", 2)), /revision zero/);
  assert.equal(stored.size, 0);
});

test("a rejected transaction cannot block a later valid workout", async () => {
  const { create, stored } = environment();
  stored.set("taken", workout("taken", "completed", 2));
  await assert.rejects(create(workout("taken")), /Duplicate primary key/);
  const after = await create(workout("different"));
  assert.equal(after.id, "different");
  assert.equal(stored.size, 2);
});

test("both production start flows use the same atomic operation", () => {
  const calls = source.match(/return createOrResumeWorkout\(log\);/g) ?? [];
  assert.equal(calls.length, 2);
  assert.match(source, /export async function startPlannedWorkout/);
  assert.match(source, /export async function startManualWorkout/);
});
