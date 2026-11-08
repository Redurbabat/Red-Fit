import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertRestorableBackupSize,
  BackupTooLargeError,
  MAX_STANDARD_BACKUP_BYTES,
} from "../src/services/backup/backupExportPolicy.ts";

test("backup size policy uses a 25 MiB limit", () => {
  assert.equal(MAX_STANDARD_BACKUP_BYTES, 25 * 1024 * 1024);
});

test("ordinary backup sizes can be exported and imported", () => {
  assert.doesNotThrow(() => assertRestorableBackupSize(1));
  assert.doesNotThrow(() => assertRestorableBackupSize(4096));
  assert.doesNotThrow(() => assertRestorableBackupSize(MAX_STANDARD_BACKUP_BYTES));
});

test("a backup one byte above the importer limit is rejected", () => {
  assert.throws(
    () => assertRestorableBackupSize(MAX_STANDARD_BACKUP_BYTES + 1),
    BackupTooLargeError,
  );
});

test("invalid sizes never silently pass validation", () => {
  for (const bytes of [-1, 0, 0.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => assertRestorableBackupSize(bytes), RangeError);
  }
});

test("counts UTF-8 bytes, not string code units", () => {
  const json = JSON.stringify({ name: "Übergröße 😊" });
  const blob = new Blob([json], { type: "application/json" });
  assert.ok(blob.size > json.length);
  assert.doesNotThrow(() => assertRestorableBackupSize(blob.size));
});

test("the policy does not affect separate private photo backup limits", () => {
  const source = assertRestorableBackupSize.toString();
  assert.doesNotMatch(source, /photo|mediaAssets|progressPhotos/);
});
