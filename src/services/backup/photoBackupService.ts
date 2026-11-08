import { z } from "zod";
import { decodePhotoBase64, encodePhotoBase64, MAX_SINGLE_PHOTO_BYTES } from "./photoBackupCodec";
export { decodePhotoBase64, encodePhotoBase64 } from "./photoBackupCodec";
import { mediaAssetMetaSchema, progressPhotoSchema, type MediaAsset, type ProgressPhoto } from "../../models/media";
import { getLocalDateKey, nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { db } from "../storage/database";

/**
 * Optional user-initiated local photo transfer. NOT included in the standard
 * red-fit-backup JSON because progress photos are sensitiveMedia.
 * The resulting file is NOT encrypted; the UI must explicitly warn the user.
 */
export const PHOTO_BACKUP_FORMAT = "red-fit-photo-backup" as const;
export const PHOTO_BACKUP_VERSION = 1;
export const MAX_PHOTO_BACKUP_RAW_BYTES = 25 * 1024 * 1024;
export const MAX_PHOTO_BACKUP_FILE_BYTES = 36 * 1024 * 1024;
const MAX_PHOTOS = 250;

const allowedPhotoMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "image/heif", "image/avif", "image/gif",
]);

const photoFileSchema = z.object({
  photo: progressPhotoSchema,
  asset: mediaAssetMetaSchema,
  dataBase64: z.string().min(1).max(Math.ceil(MAX_SINGLE_PHOTO_BYTES / 3) * 4),
}).strict();

export const photoBackupSchema = z.object({
  format: z.literal(PHOTO_BACKUP_FORMAT),
  version: z.literal(PHOTO_BACKUP_VERSION),
  exportedAt: z.string().min(1),
  photos: z.array(photoFileSchema).max(MAX_PHOTOS),
}).strict();

export type PhotoBackup = z.infer<typeof photoBackupSchema>;
export type PhotoBackupImportResult = { added: number; skipped: number };

function validateAsset(asset: Omit<MediaAsset, "blob">, photo: ProgressPhoto) {
  if (photo.assetId !== asset.id || asset.kind !== "photo" ||
      asset.privacyClass !== "sensitiveMedia" ||
      !allowedPhotoMimeTypes.has(asset.mimeType) ||
      asset.byteSize <= 0 || asset.byteSize > MAX_SINGLE_PHOTO_BYTES) {
    throw new Error("Photo metadata, privacy class or media format is invalid");
  }
}

export async function collectPhotoBackup(): Promise<PhotoBackup> {
  const pairs = await db.transaction("r", [db.progressPhotos, db.mediaAssets], async () => {
    const photos = await db.progressPhotos.toArray();
    if (photos.length > MAX_PHOTOS) {
      throw new Error("Too many photos for one backup file");
    }
    const result: { photo: ProgressPhoto; asset: MediaAsset }[] = [];
    for (const photo of photos) {
      const asset = await db.mediaAssets.get(photo.assetId as never);
      if (!asset) throw new Error("A photo is missing its media asset");
      result.push({ photo, asset });
    }
    return result;
  });

  const total = pairs.reduce((sum, item) => sum + item.asset.byteSize, 0);
  if (total > MAX_PHOTO_BACKUP_RAW_BYTES) {
    throw new Error("Photo archive exceeds 25 MiB; smaller archives are required");
  }

  const photos: PhotoBackup["photos"] = [];
  for (const { photo, asset } of pairs) {
    validateAsset(asset, photo);
    const bytes = new Uint8Array(await asset.blob.arrayBuffer());
    if (bytes.byteLength !== asset.byteSize) {
      throw new Error("Stored photo size does not match metadata");
    }
    const { blob: _blob, ...metadata } = asset;
    void _blob;
    photos.push({ photo, asset: metadata, dataBase64: encodePhotoBase64(bytes) });
  }
  return {
    format: PHOTO_BACKUP_FORMAT,
    version: PHOTO_BACKUP_VERSION,
    exportedAt: nowIso(),
    photos,
  };
}

export function photoBackupFileName(): string {
  return `red-fit-photos-${getLocalDateKey()}.json`;
}

export async function exportPhotoBackupFile(): Promise<number> {
  const backup = await collectPhotoBackup();
  const file = new Blob([JSON.stringify(backup)], { type: "application/json" });
  if (file.size > MAX_PHOTO_BACKUP_FILE_BYTES) {
    throw new Error("Photo archive exceeds the file limit");
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = photoBackupFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // The click has been scheduled; revoke after the browser can start download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return backup.photos.length;
}

export type PhotoBackupReadResult =
  | { ok: true; backup: PhotoBackup }
  | { ok: false; error: string };

export function parsePhotoBackupJson(text: string): PhotoBackupReadResult {
  // The supplied JSON is never merged into the normal backup.
  if (new TextEncoder().encode(text).byteLength > MAX_PHOTO_BACKUP_FILE_BYTES) {
    return { ok: false, error: "Die Foto-Datei ist zu groß." };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Ungültiges JSON." };
  }
  const result = photoBackupSchema.safeParse(data);
  if (!result.success) {
    return { ok: false, error: "Die Datei ist kein gültiges RED-Fit-Foto-Backup." };
  }

  const photoIds = new Set<string>();
  const assetIds = new Set<string>();
  let total = 0;
  try {
    for (const { photo, asset, dataBase64 } of result.data.photos) {
      validateAsset(asset, photo);
      if (photoIds.has(photo.id) || assetIds.has(asset.id)) {
        throw new Error("Duplicate photo or asset ID");
      }
      photoIds.add(photo.id);
      assetIds.add(asset.id);
      total += asset.byteSize;
      if (total > MAX_PHOTO_BACKUP_RAW_BYTES) throw new Error("Photo archive is too large");
      // Check integrity before presenting a preview.
      decodePhotoBase64(dataBase64, asset.byteSize);
    }
  } catch {
    return { ok: false, error: "Ein Foto ist beschädigt oder ungültig." };
  }
  return { ok: true, backup: result.data };
}

/**
 * Photos are additive. Existing photo IDs always win; asset-ID collisions are
 * assigned a new asset ID so unrelated local media cannot be overwritten.
 * All decode work happens before the Dexie transaction to avoid auto-commit.
 */
export async function importPhotoBackup(backup: PhotoBackup): Promise<PhotoBackupImportResult> {
  const parsed = parsePhotoBackupJson(JSON.stringify(backup));
  if (!parsed.ok) throw new Error(parsed.error);

  const decoded = parsed.backup.photos.map(({ photo, asset, dataBase64 }) => ({
    photo,
    asset,
    bytes: decodePhotoBase64(dataBase64, asset.byteSize),
  }));

  return db.transaction("rw", [db.mediaAssets, db.progressPhotos], async () => {
    let added = 0;
    let skipped = 0;
    for (const { photo, asset, bytes } of decoded) {
      if (await db.progressPhotos.get(photo.id as never)) {
        skipped++;
        continue;
      }
      let assetId = asset.id;
      if (await db.mediaAssets.get(assetId as never)) assetId = newId();
      // A fresh ArrayBuffer avoids TS 5.9's SharedArrayBuffer/BlobPart mismatch.
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const blob = new Blob([buffer], { type: asset.mimeType });
      await db.mediaAssets.add({ ...asset, id: assetId, blob });
      await db.progressPhotos.add({ ...photo, assetId });
      added++;
    }
    return { added, skipped };
  });
}
