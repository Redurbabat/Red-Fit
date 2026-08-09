import type { PhotoPose, ProgressPhoto } from "../../models";
import { getLocalDateKey, nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { db } from "./database";
import { mediaRepository } from "./mediaRepository";

export const progressPhotoRepository = {
  /** Photo + its blob are created together — no orphaned metadata. */
  async createFromBlob(
    blob: Blob,
    pose: PhotoPose,
    extras: { weightKg?: number; notes?: string } = {},
  ): Promise<ProgressPhoto> {
    return db.transaction("rw", [db.mediaAssets, db.progressPhotos], async () => {
      const asset = await mediaRepository.createFromBlob(blob, "sensitiveMedia");
      const now = nowIso();
      const photo: ProgressPhoto = {
        id: newId(),
        date: getLocalDateKey(),
        pose,
        assetId: asset.id,
        ...extras,
        createdAt: now,
        updatedAt: now,
      };
      await db.progressPhotos.add(photo);
      return photo;
    });
  },

  async listNewestFirst(pose?: PhotoPose): Promise<ProgressPhoto[]> {
    const all = pose
      ? await db.progressPhotos.where("pose").equals(pose).toArray()
      : await db.progressPhotos.toArray();
    all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return all;
  },

  /** Deletes the photo AND its blob in one transaction — no storage leaks. */
  async delete(id: string): Promise<void> {
    await db.transaction("rw", [db.mediaAssets, db.progressPhotos], async () => {
      const photo = await db.progressPhotos.get(id as never);
      await db.progressPhotos.delete(id as never);
      if (photo) await db.mediaAssets.delete(photo.assetId as never);
    });
  },

  async count(): Promise<number> {
    return db.progressPhotos.count();
  },
};
