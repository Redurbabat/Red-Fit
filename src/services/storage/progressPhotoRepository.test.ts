import { describe, expect, it } from "vitest";
import { db } from "./database";
import { progressPhotoRepository } from "./progressPhotoRepository";

function photoBlob(content = "fake-image-bytes"): Blob {
  return new Blob([content], { type: "image/jpeg" });
}

describe("progressPhotoRepository", () => {
  it("creates photo metadata together with its blob asset", async () => {
    const photo = await progressPhotoRepository.createFromBlob(photoBlob(), "front", {
      weightKg: 78.4,
    });
    expect(photo.pose).toBe("front");
    expect(photo.weightKg).toBe(78.4);

    const asset = await db.mediaAssets.get(photo.assetId as never);
    expect(asset?.privacyClass).toBe("sensitiveMedia");
    expect(asset?.byteSize).toBeGreaterThan(0);

    await progressPhotoRepository.delete(photo.id);
  });

  it("lists newest first and filters by pose", async () => {
    const front = await progressPhotoRepository.createFromBlob(photoBlob(), "front");
    const side = await progressPhotoRepository.createFromBlob(photoBlob(), "side");

    const all = await progressPhotoRepository.listNewestFirst();
    expect(all.length).toBeGreaterThanOrEqual(2);
    const sides = await progressPhotoRepository.listNewestFirst("side");
    expect(sides.every((p) => p.pose === "side")).toBe(true);

    await progressPhotoRepository.delete(front.id);
    await progressPhotoRepository.delete(side.id);
  });

  it("delete removes the blob asset too — no storage leaks", async () => {
    const photo = await progressPhotoRepository.createFromBlob(photoBlob(), "back");
    await progressPhotoRepository.delete(photo.id);

    expect(await db.progressPhotos.get(photo.id as never)).toBeUndefined();
    expect(await db.mediaAssets.get(photo.assetId as never)).toBeUndefined();
  });
});
