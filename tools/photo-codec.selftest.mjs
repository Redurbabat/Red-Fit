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
  sha256PhotoBytes,
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

test("SHA-256 detects same-length photo corruption", async () => {
  const unchanged = new TextEncoder().encode("a-private-image");
  const corrupted = new TextEncoder().encode("b-private-image");
  assert.equal(unchanged.byteLength, corrupted.byteLength);
  const originalDigest = await sha256PhotoBytes(unchanged);
  const corruptedDigest = await sha256PhotoBytes(corrupted);
  assert.match(originalDigest, /^[0-9a-f]{64}$/);
  assert.notEqual(originalDigest, corruptedDigest);
});

test("SHA-256 conforms to the NIST abc test vector", async () => {
  assert.equal(
    await sha256PhotoBytes(new TextEncoder().encode("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
