import type { MediaAsset, PrivacyClass } from "../../models";
import { nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { db } from "./database";

/**
 * Blob storage (§46): binaries never travel through the JSON backup and are
 * only readable via explicit user actions. Deleting metadata without its
 * asset would leak storage — deletion happens through progressPhotoRepository.
 */
export const mediaRepository = {
  async createFromBlob(blob: Blob, privacyClass: PrivacyClass): Promise<MediaAsset> {
    const now = nowIso();
    const asset: MediaAsset = {
      id: newId(),
      kind: "photo",
      mimeType: blob.type || "image/jpeg",
      byteSize: blob.size,
      privacyClass,
      blob,
      createdAt: now,
      updatedAt: now,
    };
    await db.mediaAssets.add(asset);
    return asset;
  },

  async get(id: string): Promise<MediaAsset | undefined> {
    return db.mediaAssets.get(id as never);
  },

  async delete(id: string): Promise<void> {
    await db.mediaAssets.delete(id as never);
  },

  async totalBytes(): Promise<number> {
    const all = await db.mediaAssets.toArray();
    return all.reduce((sum, a) => sum + a.byteSize, 0);
  },
};
