/**
 * Source-backed smoke tests of the owner's original openGym progression engine.
 *
 * The original hash manifest is retained; explicitly reviewed RED Fit derivatives are locked separately.
 * This checks the active original-based app and does not replace Vitest.
 *
 * Run: node --test tools/opengym-progression.selftest.mjs (Node 22+).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
      const base = resolve(dirname(path), match[1].split("?")[0]);
      const candidate = [base, base + ".js", base + ".jsx", base + ".json", base + ".mjs", resolve(base, "index.js")]
        .find(existsSync);
      assert.ok(candidate, `Missing import ${match[1]} in ${path}`);
      visit(candidate);
    }
  };
  for (const name of sourceRoots) visit(resolve(lib, name));
  assert.equal(seen.size, 71); // Original 70 modules plus the inline brand image.
});

test("original provenance and explicitly reviewed RED Fit derivative hashes match", () => {
  const lock = JSON.parse(readFileSync(
    resolve(root, "tools/opengym-progression-source.lock.json"), "utf8",
  ));
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.commit, "8fb98b16861a2728652302a7e6e30c50548493a0");
  const derived = JSON.parse(readFileSync(resolve(root, "tools/opengym-progression-derived.lock.json"), "utf8"));
  assert.equal(derived.upstreamCommit, lock.commit);
  for (const [name, entry] of Object.entries(derived.overrides)) {
    assert.equal(entry.upstreamSha, lock.files[name], `Unknown original source: ${name}`);
    assert.ok(entry.reason);
  }
  const entries = Object.entries(lock.files);
  assert.equal(entries.length, 70);
  let totalBytes = 0;
  for (const [name, sha] of entries) {
    const bytes = readFileSync(resolve(lib, name));
    totalBytes += bytes.length;
    const actual = createHash("sha1")
      .update(`blob ${bytes.length}`)
      .update(new Uint8Array([0]))
      .update(bytes)
      .digest("hex");
    assert.equal(actual, derived.overrides[name]?.derivedSha || sha, `Unreviewed source change: ${name}`);
  }
  assert.equal(totalBytes, derived.derivedTotalBytes);
});
