import { z } from "zod";
import { baseEntitySchema, localDateKeySchema, nonNegativeNumber } from "./common";

/**
 * Media layer (2031 §46): binary payloads are stored as Blobs in their own
 * store, metadata lives in separate records. Progress photos are classified
 * `sensitiveMedia` (§107) — local only, never in analytics/AI/cloud, and not
 * part of the JSON backup (a media-capable container format is Phase C+).
 */

export const PRIVACY_CLASSES = ["normal", "health", "sensitiveMedia"] as const;
export type PrivacyClass = (typeof PRIVACY_CLASSES)[number];

export const mediaAssetMetaSchema = baseEntitySchema.extend({
  kind: z.literal("photo"),
  mimeType: z.string().min(1),
  byteSize: nonNegativeNumber,
  privacyClass: z.enum(PRIVACY_CLASSES),
});
export type MediaAssetMeta = z.infer<typeof mediaAssetMetaSchema>;

/** Stored row = validated metadata + the binary payload (not zod-validated). */
export interface MediaAsset extends MediaAssetMeta {
  blob: Blob;
}

export const PHOTO_POSES = ["front", "side", "back"] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

export const progressPhotoSchema = baseEntitySchema.extend({
  date: localDateKeySchema,
  pose: z.enum(PHOTO_POSES),
  assetId: z.string().min(1),
  weightKg: nonNegativeNumber.optional(),
  notes: z.string().optional(),
});
export type ProgressPhoto = z.infer<typeof progressPhotoSchema>;
