/** Dependency-free regression checks for openGym-inspired per-set notes.
 * Run: node --experimental-strip-types --test tools/set-notes.selftest.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSetNote, SET_NOTE_MAX_LENGTH } from "../src/services/workout/setNotes.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("a short set note is trimmed and survives as its own value", () => {
  assert.equal(normalizeSetNote("  Griff verrutscht  "), "Griff verrutscht");
  assert.equal(normalizeSetNote("Knie stabil"), "Knie stabil");
});

test("empty and whitespace-only set notes are absent", () => {
  assert.equal(normalizeSetNote(""), undefined);
  assert.equal(normalizeSetNote(" \t\n "), undefined);
});

test("control characters are removed and notes are at most 140 characters", () => {
  assert.equal(normalizeSetNote("erste\nzweite"), "erste zweite");
  assert.equal(normalizeSetNote("ä".repeat(300))?.length, SET_NOTE_MAX_LENGTH);
  assert.equal(SET_NOTE_MAX_LENGTH, 140);
});

test("the existing SetLog field and workout/history UI are wired to the same notes", () => {
  const model = readFileSync(resolve(root, "src/models/workout.ts"), "utf8");
  const workoutPage = readFileSync(resolve(root, "src/features/training/workout/WorkoutPage.tsx"), "utf8");
  const history = readFileSync(resolve(root, "src/features/training/workout/WorkoutSummaryPage.tsx"), "utf8");
  assert.match(model, /notes: z\.string\(\)\.optional\(\)/);
  assert.match(workoutPage, /normalizeSetNote/);
  assert.match(workoutPage, /updateSet\(setIndex, \{ notes: event\.currentTarget\.value \}\)/);
  assert.match(workoutPage, /aria-label=\{`Notiz zu Satz \$\{setIndex \+ 1\}`\}/);
  assert.match(history, /Notiz: \{set\.notes\.trim\(\)\}/);
});
