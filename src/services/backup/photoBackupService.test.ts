import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../storage/database";
import { progressPhotoRepository } from "../storage/progressPhotoRepository";
import { collectBackupData } from "./backupService";
import {
  collectPhotoBackup,
  decodePhotoBase64,
  encodePhotoBase64,
  importPhotoBackup,
  parsePhotoBackupJson,
  PHOTO_BACKUP_FORMAT,
} from "./photoBackupService";

beforeEach(async () => {
  await db.transaction("rw", [db.mediaAssets, db.progressPhotos], async () => {
    await db.progressPhotos.clear();
    await db.mediaAssets.clear();
  });
});

async function examplePhoto() {
  const bytes = new Blob(["a-private-image"], { type: "image/jpeg" });
  return progressPhotoRepository.createFromBlob(bytes, "front", {
    weightKg: 79,
    notes: "Local comparison",
  });
}

describe("opt-in sensitive photo backup", () => {
  it("round-trips base64 across multiple chunk boundaries", () => {
    const bytes = new Uint8Array(25_000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    expect(decodePhotoBase64(encodePhotoBase64(bytes), bytes.length)).toEqual(bytes);
    expect(() => decodePhotoBase64("AAAA", 5)).toThrow();
    expect(() => decodePhotoBase64("!!!!", 3)).toThrow();
  });

  it("exports photo bytes and metadata without changing the normal backup", async () => {
    const photo = await examplePhoto();
    const normalBackup = await collectBackupData();
    expect(Object.keys(normalBackup)).not.toContain("progressPhotos");
    expect(Object.keys(normalBackup)).not.toContain("mediaAssets");

    const archive = await collectPhotoBackup();
    expect(archive.format).toBe(PHOTO_BACKUP_FORMAT);
    expect(archive.photos).toHaveLength(1);
    expect(archive.photos[0].photo).toMatchObject({
      id: photo.id,
      assetId: photo.assetId,
      pose: "front",
      weightKg: 79,
      notes: "Local comparison",
    });
    expect(archive.photos[0].asset).toMatchObject({
      id: photo.assetId,
      privacyClass: "sensitiveMedia",
      mimeType: "image/jpeg",
    });
    const parsed = parsePhotoBackupJson(JSON.stringify(archive));
    expect(parsed.ok).toBe(true);
  });

  it("restores the private image atomically and skips identical reimports", async () => {
    await examplePhoto();
    const archive = await collectPhotoBackup();
    await db.progressPhotos.clear();
    await db.mediaAssets.clear();

    expect(await importPhotoBackup(archive)).toEqual({ added: 1, skipped: 0 });
    expect(await importPhotoBackup(archive)).toEqual({ added: 0, skipped: 1 });
    const photos = await db.progressPhotos.toArray();
    const assets = await db.mediaAssets.toArray();
    expect(photos).toHaveLength(1);
    expect(assets).toHaveLength(1);
    expect(assets[0].privacyClass).toBe("sensitiveMedia");
    expect(await assets[0].blob.text()).toBe("a-private-image");
  });

  it("never overwrites an unrelated local media asset with a matching ID", async () => {
    await examplePhoto();
    const archive = await collectPhotoBackup();
    const source = archive.photos[0];
    await db.progressPhotos.clear();
    // Keep the media asset behind to simulate an asset-ID collision.
    const localAsset = await db.mediaAssets.get(source.asset.id as never);
    expect(localAsset).toBeDefined();

    const renamed = {
      ...archive,
      photos: [{
        ...source,
        photo: { ...source.photo, id: "new-photo-id" },
      }],
    };
    expect(await importPhotoBackup(renamed)).toEqual({ added: 1, skipped: 0 });
    const restored = await db.progressPhotos.get("new-photo-id");
    expect(restored).toBeDefined();
    expect(restored?.assetId).not.toBe(source.asset.id);
    expect((await db.mediaAssets.get(source.asset.id as never))?.blob).toEqual(localAsset?.blob);
    expect(await db.mediaAssets.count()).toBe(2);
  });

  it("rejects corrupted, duplicate or incorrectly labelled sensitive images", async () => {
    await examplePhoto();
    const archive = await collectPhotoBackup();
    expect(parsePhotoBackupJson(JSON.stringify({
      ...archive,
      photos: [...archive.photos, ...archive.photos],
    })).ok).toBe(false);
    expect(parsePhotoBackupJson(JSON.stringify({
      ...archive,
      photos: [{
        ...archive.photos[0],
        asset: { ...archive.photos[0].asset, privacyClass: "normal" },
      }],
    })).ok).toBe(false);
    expect(parsePhotoBackupJson(JSON.stringify({
      ...archive,
      photos: [{
        ...archive.photos[0],
        dataBase64: "AAAA",
      }],
    })).ok).toBe(false);
    expect(parsePhotoBackupJson('{"format":"unknown"}').ok).toBe(false);
  });

  it("refuses to silently export a photo with a missing binary", async () => {
    const photo = await examplePhoto();
    await db.mediaAssets.delete(photo.assetId as never);
    await expect(collectPhotoBackup()).rejects.toThrow(/missing its media asset/);
  });
});
