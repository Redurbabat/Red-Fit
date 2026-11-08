/**
 * No-dependency regression test for Dietry-inspired cooked weight conversion.
 * Node 22.16+: node --experimental-strip-types --test tools/cooking-yield.selftest.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getCookingYield, rawEquivalentGrams, combinedAmountUncertainty,
  displayedMealWeight,
} from "../src/services/calculations/cookingYield.ts";

test("260 g cooked rice is equivalent to 100 g raw label", () => {
  const info = getCookingYield({ name: "Basmati Reis (trocken)" });
  assert.equal(info?.factor, 2.6);
  assert.equal(rawEquivalentGrams(260, info.factor), 100);
});

test("220 g cooked pasta is 100 g dry and never double counts calories", () => {
  const info = getCookingYield({ name: "Vollkornnudeln" });
  assert.equal(info?.factor, 2.2);
  assert.ok(Math.abs(rawEquivalentGrams(220, info.factor) - 100) < 1e-8);
});

test("already cooked foods are not offered the conversion", () => {
  for (const name of ["Reis (gekocht)", "Spaghetti cooked", "Kartoffeln gebraten", "Salmon grilled"]) {
    assert.equal(getCookingYield({ name }), null, name);
  }
});

test("composite dishes are not matched", () => {
  for (const name of ["Milchreis", "Pasta Sauce", "Reissalat", "Reiswaffeln",
    "Curry mit Reis", "Preiselbeeren", "Instant Nudeln", "Wasser"]) {
    assert.equal(getCookingYield({ name }), null, name);
  }
});

test("cooking yields cover other ingredient groups with warning levels", () => {
  assert.equal(getCookingYield({ name: "Hähnchenbrust roh" })?.uncertainty, "medium");
  assert.equal(getCookingYield({ name: "Quinoa" })?.factor, 2.6);
  assert.equal(getCookingYield({ name: "Champignons roh" })?.factor, 0.6);
  assert.equal(getCookingYield({ name: "Spinat" })?.factor, 0.4);
});

test("never lowers a manually entered uncertainty", () => {
  assert.equal(combinedAmountUncertainty("high", "low"), "high");
  assert.equal(combinedAmountUncertainty("none", "low"), "low");
  assert.equal(combinedAmountUncertainty("low", "medium"), "medium");
});

test("rejects invalid measurements and impossible factors", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => rawEquivalentGrams(value, 2.6), RangeError);
  }
  for (const factor of [0, -1, NaN, Infinity, 11]) {
    assert.throws(() => rawEquivalentGrams(100, factor), RangeError);
  }
});

test("raw snapshots and cooked snapshots display their original weighed amount", () => {
  assert.equal(displayedMealWeight({ amountG: 100 }), 100);
  assert.equal(displayedMealWeight({ amountG: 100, weighedAs: "cooked",
    weighedAmountG: 260 }), 260);
});
