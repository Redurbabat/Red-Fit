import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertWorkoutWriteScope,
  isCurrentWorkoutRoute,
  WorkoutRouteMismatchError,
} from "../src/services/workout/workoutRouteScope.ts";

test("an unchanged workout route allows the matching snapshot", () => {
  assert.equal(isCurrentWorkoutRoute("workout-A", "workout-A"), true);
  assert.doesNotThrow(() => assertWorkoutWriteScope("workout-A", "workout-A"));
});

test("different workout IDs are never treated as interchangeable", () => {
  assert.equal(isCurrentWorkoutRoute("workout-A", "workout-B"), false);
  assert.throws(() => assertWorkoutWriteScope("workout-B", "workout-A"),
    WorkoutRouteMismatchError);
});

test("missing or empty route identities reject writes", () => {
  for (const value of [undefined, ""]) {
    assert.equal(isCurrentWorkoutRoute(value, "workout-A"), false);
    assert.equal(isCurrentWorkoutRoute("workout-A", value), false);
    assert.throws(() => assertWorkoutWriteScope(value, "workout-A"),
      WorkoutRouteMismatchError);
    assert.throws(() => assertWorkoutWriteScope("workout-A", value),
      WorkoutRouteMismatchError);
  }
});

test("a pending old-route save cannot be written using a new-route writer", async () => {
  const stored = new Map();
  const writerForB = async (snapshot) => {
    assertWorkoutWriteScope("workout-B", snapshot.id);
    stored.set(snapshot.id, snapshot);
  };
  await assert.rejects(writerForB({ id: "workout-A", reps: 12 }),
    WorkoutRouteMismatchError);
  assert.equal(stored.size, 0);
});

test("an old writer may safely finish its OWN workout after route change", async () => {
  const stored = new Map();
  const oldWriter = async (snapshot) => {
    assertWorkoutWriteScope("workout-A", snapshot.id);
    stored.set(snapshot.id, snapshot);
  };
  const newWriter = async (snapshot) => {
    assertWorkoutWriteScope("workout-B", snapshot.id);
    stored.set(snapshot.id, snapshot);
  };
  await Promise.all([
    oldWriter({ id: "workout-A", reps: 12 }),
    newWriter({ id: "workout-B", reps: 8 }),
  ]);
  assert.deepEqual([...stored.keys()].sort(), ["workout-A", "workout-B"]);
  assert.equal(stored.get("workout-A").reps, 12);
  assert.equal(stored.get("workout-B").reps, 8);
});

test("changing only the notes route prevents saving an earlier note to a new workout", () => {
  const currentRouteId = "workout-B";
  const pendingWriter = { workoutId: "workout-A", notes: "Great workout" };
  assert.equal(isCurrentWorkoutRoute(currentRouteId, pendingWriter.workoutId), false);
});

test("old writer completion must not modify the new route note cache", async () => {
  let currentWriter = { id: "workout-A" };
  let lastSavedNotes = "Before";
  const oldWriter = currentWriter;
  const oldPromise = Promise.resolve().then(() => {
    if (currentWriter === oldWriter) lastSavedNotes = "Old workout note";
  });
  currentWriter = { id: "workout-B" };
  lastSavedNotes = "New workout note";
  await oldPromise;
  assert.equal(lastSavedNotes, "New workout note");
});

test("a successful final note save permits navigation; a failure blocks it", async () => {
  let navigations = 0;
  async function finish(saveResult) {
    if (await saveResult) navigations++;
  }
  await finish(Promise.resolve(false));
  assert.equal(navigations, 0);
  await finish(Promise.resolve(true));
  assert.equal(navigations, 1);
});
