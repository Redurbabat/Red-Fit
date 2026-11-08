import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldSkipExistingPhoto, availablePhotoAssetId,
} from "../src/services/backup/photoImportPolicy.ts";

test("new photo is not skipped even with a missing unrelated asset", () => {
  assert.equal(shouldSkipExistingPhoto(false, false), false);
});

test("existing healthy photo is skipped", () => {
  assert.equal(shouldSkipExistingPhoto(true, true), true);
});

test("existing photo missing its media fails instead of silently skipping", () => {
  assert.throws(() => shouldSkipExistingPhoto(true, false), /missing its media asset/);
});

test("unoccupied source asset ID is retained", async () => {
  const id = await availablePhotoAssetId("original", async () => false, () => {
    throw Error("generator should not run");
  });
  assert.equal(id, "original");
});

test("occupied ID and a generated collision are both avoided", async () => {
  const occupied = new Set(["original", "collision"]);
  const ids = ["collision", "safe"];
  const id = await availablePhotoAssetId("original", async value => occupied.has(value),
    () => ids.shift() ?? "safe");
  assert.equal(id, "safe");
});

test("a permanently colliding generator fails after bounded retries", async () => {
  await assert.rejects(availablePhotoAssetId("x", async () => true, () => "x", 3),
    /unused photo media ID/);
});
