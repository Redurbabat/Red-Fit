import { z } from "zod";

/**
 * 3D asset manifest (2031 §35): GLB URLs are never hardcoded across screens.
 * `public/models/manifest.json` is OPTIONAL — without it (or offline before
 * first cache) the id-based convention `/models/<exercise-id>.glb` applies,
 * and a missing file still falls back to the procedural coach.
 */

export const exerciseAssetSchema = z.object({
  exerciseId: z.string().min(1),
  modelUrl: z.string().min(1),
  /** Preferred animation clip name; the loader defaults to "exercise". */
  animationClip: z.string().optional(),
  cameraPreset: z.enum(["front", "side", "threeQuarter"]).optional(),
  version: z.number().int().min(1).optional(),
});
export type ExerciseAsset = z.infer<typeof exerciseAssetSchema>;

export const assetManifestSchema = z.object({
  version: z.number().int().min(1),
  assets: z.array(exerciseAssetSchema),
});
export type AssetManifest = z.infer<typeof assetManifestSchema>;

/** Strict parse — an invalid manifest is treated as absent, never as fatal. */
export function parseAssetManifest(json: unknown): AssetManifest | undefined {
  const result = assetManifestSchema.safeParse(json);
  return result.success ? result.data : undefined;
}

export interface ResolvedExerciseModel {
  url: string;
  animationClip?: string;
  cameraPreset?: ExerciseAsset["cameraPreset"];
}

/**
 * Precedence: manifest entry → explicit `animation3dUrl` on the exercise →
 * id convention. Always returns a URL; whether the file exists is decided
 * by the loader (with procedural fallback).
 */
export function resolveExerciseModel(
  exercise: { id: string; animation3dUrl?: string },
  manifest: AssetManifest | undefined,
): ResolvedExerciseModel {
  const asset = manifest?.assets.find((a) => a.exerciseId === exercise.id);
  if (asset) {
    return {
      url: asset.modelUrl,
      animationClip: asset.animationClip,
      cameraPreset: asset.cameraPreset,
    };
  }
  return { url: exercise.animation3dUrl ?? `/models/${exercise.id}.glb` };
}

let manifestPromise: Promise<AssetManifest | undefined> | undefined;

/** Fetch once per session; 404/offline/invalid all resolve to undefined. */
export function loadAssetManifest(): Promise<AssetManifest | undefined> {
  manifestPromise ??= fetch("/models/manifest.json")
    .then((res) => (res.ok ? res.json() : undefined))
    .then((json) => (json ? parseAssetManifest(json) : undefined))
    .catch(() => undefined);
  return manifestPromise;
}
