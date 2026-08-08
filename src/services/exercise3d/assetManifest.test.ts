import { describe, expect, it } from "vitest";
import { parseAssetManifest, resolveExerciseModel } from "./assetManifest";

const VALID = {
  version: 1,
  assets: [
    {
      exerciseId: "seed-ch1",
      modelUrl: "/models/bench-press-v2.glb",
      animationClip: "exercise",
      cameraPreset: "side",
    },
  ],
};

describe("parseAssetManifest", () => {
  it("accepts a valid manifest", () => {
    const manifest = parseAssetManifest(VALID);
    expect(manifest?.assets[0].exerciseId).toBe("seed-ch1");
  });

  it("treats invalid shapes as absent instead of throwing", () => {
    expect(parseAssetManifest(null)).toBeUndefined();
    expect(parseAssetManifest({ version: 1 })).toBeUndefined();
    expect(
      parseAssetManifest({ version: 1, assets: [{ exerciseId: "", modelUrl: "" }] }),
    ).toBeUndefined();
    expect(
      parseAssetManifest({
        version: 1,
        assets: [{ exerciseId: "a", modelUrl: "/x.glb", cameraPreset: "diagonal" }],
      }),
    ).toBeUndefined();
  });
});

describe("resolveExerciseModel", () => {
  const manifest = parseAssetManifest(VALID);

  it("prefers the manifest entry including clip and camera", () => {
    const resolved = resolveExerciseModel(
      { id: "seed-ch1", animation3dUrl: "/models/custom.glb" },
      manifest,
    );
    expect(resolved).toEqual({
      url: "/models/bench-press-v2.glb",
      animationClip: "exercise",
      cameraPreset: "side",
    });
  });

  it("falls back to animation3dUrl, then to the id convention", () => {
    expect(
      resolveExerciseModel({ id: "seed-sq1", animation3dUrl: "/models/custom.glb" }, manifest).url,
    ).toBe("/models/custom.glb");
    expect(resolveExerciseModel({ id: "seed-sq1" }, undefined).url).toBe(
      "/models/seed-sq1.glb",
    );
  });
});
