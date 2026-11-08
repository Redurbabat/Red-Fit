/**
 * Source-backed smoke tests of the owner's original openGym progression engine.
 *
 * The original modules remain byte-identical under vendor/opengym-upstream/;
 * this is not a production RED Fit entrypoint or a replacement for Vitest.
 *
 * Run: node --test tools/opengym-progression.selftest.mjs (Node 22+).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  POLICIES, POLICIES_FOR, epley1RM, policyFor, plannedOf, planChanged,
  readSession, snapWeight, addStep, deloadTo, selectDeloadCandidate,
  nextPrescription,
} from "../vendor/opengym-upstream/frontend/src/lib/progression.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lib = resolve(root, "vendor/opengym-upstream/frontend/src/lib");
const sourceRoots = [
  "progression.js", "progression-copy.js", "progression.test.js",
  "progression.triple.test.js", "progression.default.test.js",
  "progression.extra-sets.test.js", "progression-copy.test.js",
];

test("all six original progression policies are available", () => {
  assert.deepEqual(POLICIES, ["off", "linear", "greyskull", "double", "triple", "time"]);
  assert.deepEqual(POLICIES_FOR.time, ["off", "time"]);
  assert.deepEqual(POLICIES_FOR.cardio, ["off"]);
});

test("per-exercise, routine, mode and off rules resolve independently", () => {
  assert.equal(policyFor({ prog: "triple", sets: 3, setsMax: 5, reps: 10, repsMin: 8 }, null, "reps"), "triple");
  assert.equal(policyFor({}, { prog: "double" }, "reps"), "double");
  assert.equal(policyFor({ prog: "linear" }, null, "cardio"), "off");
  assert.equal(policyFor({ prog: "off" }, null, "reps"), "off");
});

test("missing and incomplete sets never count as a successful session", () => {
  const target = { sets: 3, reps: 10, weight: 80 };
  const short = readSession({ id: "bench", sets: [
    { w: 80, r: 10, done: true }, { w: 80, r: 6, done: true },
  ] }, target);
  assert.equal(short.ok, false);
  assert.equal(short.count, 2);
  const full = readSession({ id: "bench", sets: [
    { w: 80, r: 10, done: true }, { w: 80, r: 10, done: true },
    { w: 80, r: 10, done: true },
  ] }, target);
  assert.equal(full.ok, true);
});

test("estimated one-rep max and load-grid stepping use the upstream calculation", () => {
  assert.equal(epley1RM(80, 10), 106.7);
  assert.equal(epley1RM(0, 10), null);
  assert.equal(snapWeight(62.6, 2.5), 62.5);
  assert.equal(addStep(397, 10, 10), 407);
});

test("deload candidates remain bounded and use the real load grid", () => {
  assert.equal(deloadTo(100, 2.5), 90);
  const candidate = selectDeloadCandidate({
    currentWeight: 100, targetWeight: 100, targetReps: 10,
    step: 2.5, reps: 10, repsMin: 8,
  });
  assert.equal(candidate?.weight, 90);
  assert.equal(candidate?.target1RM, 120);
});

test("triple progression starts at the minimum reps and base set count", () => {
  const first = nextPrescription({ unit: "kg", workouts: [] }, {
    id: "bench", prog: "triple", sets: 3, setsMax: 5,
    reps: 10, repsMin: 8, weight: 80,
  }, {});
  assert.equal(first.policy, "triple");
  assert.equal(first.kind, "first");
  assert.equal(first.sets, 3);
  assert.deepEqual(first.rowReps, [8, 8, 8]);
});

test("manually disabled progression does not auto-adjust the load", () => {
  const first = nextPrescription({ unit: "kg", workouts: [] }, {
    id: "bench", prog: "off", sets: 3, reps: 8, weight: 80,
  }, {});
  assert.deepEqual(first, { policy: "off", kind: "off" });
});

test("changes to a prescribed rep range are detected without a saved counter", () => {
  const plan = { sets: 3, reps: 10, repsMin: 8, setsMax: 5, weight: 80 };
  assert.equal(planChanged(plannedOf(plan), plan), false);
  assert.equal(planChanged(plannedOf(plan), { ...plan, reps: 12 }), true);
});

test("the complete original module/test import closure is present in vendor", () => {
  const seen = new Set();
  const visit = (path) => {
    assert.ok(existsSync(path), `Missing staged openGym dependency: ${path}`);
    if (seen.has(path)) return;
    seen.add(path);
    const ext = extname(path);
    if (![".js", ".jsx", ".mjs"].includes(ext)) return;
    const code = readFileSync(path, "utf8");
    const expression = /(?:from\s+|import\s*\(|import\s+)["'](\.[^"']+)["']/g;
    for (const match of code.matchAll(expression)) {
      const base = resolve(dirname(path), match[1]);
      const candidate = [base, base + ".js", base + ".jsx", base + ".json", base + ".mjs", resolve(base, "index.js")]
        .find(existsSync);
      assert.ok(candidate, `Missing import ${match[1]} in ${path}`);
      visit(candidate);
    }
  };
  for (const name of sourceRoots) visit(resolve(lib, name));
  assert.equal(seen.size, 70);
});
