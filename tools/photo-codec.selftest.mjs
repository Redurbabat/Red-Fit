/**
 * Standalone codec check when GitHub Actions has no runners.
 * Node 22.16+: node --experimental-strip-types --test tools/photo-codec.selftest.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  decodePhotoBase64,
  encodePhotoBase64,
  MAX_SINGLE_PHOTO_BYTES,
} from "../src/services/backup/photoBackupCodec.ts";

test("round-trip for 1, 2, 3 and >12 KiB byte arrays", () => {
  for (const size of [1, 2, 3, 12_287, 12_288, 12_289, 25_000, 120_000]) {
    const bytes = Uint8Array.from({ length: size }, (_, index) => index % 251);
    assert.deepEqual(decodePhotoBase64(encodePhotoBase64(bytes), size), bytes);
  }
});

test("reject invalid base64, truncated values and metadata mismatches", () => {
  assert.throws(() => decodePhotoBase64("!!!!", 3));
  assert.throws(() => decodePhotoBase64("QQ=", 1));
  assert.throws(() => decodePhotoBase64("QQ==", 2));
});

test("reject empty files and wrong sizes beyond 10 MiB", () => {
  assert.throws(() => decodePhotoBase64("", 0));
  assert.throws(() => decodePhotoBase64("AA==", MAX_SINGLE_PHOTO_BYTES + 1));
});
