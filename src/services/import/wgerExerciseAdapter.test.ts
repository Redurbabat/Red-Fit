import { describe, expect, it } from "vitest";
import { parseWgerImportJson, previewWgerExercise, type WgerExerciseInput } from "./wgerExerciseAdapter";

const example: WgerExerciseInput = {
  sourceId: 100,
  name: "Example exercise",
  categoryId: 11,
  muscleIds: [4],
  secondaryMuscleIds: [5, 2],
  equipmentIds: [1],
  sourceAuthor: "Example Author",
  sourceLicense: "Example verified license",
};

describe("wger exercise import preview", () => {
  it("accepts attributed JSON exports and keeps source identity", () => {
    const preview = parseWgerImportJson(JSON.stringify([example]));
    expect(preview).toHaveLength(1);
    expect(preview[0].sourceKey).toBe("wger:100");
  });
  it("rejects duplicate source ids and missing author", () => {
    expect(() => parseWgerImportJson(JSON.stringify([example, example]))).toThrow();
    expect(() => parseWgerImportJson(JSON.stringify([{ ...example, sourceAuthor: "" }]))).toThrow();
  });
  it("rejects unknown extra fields rather than silently importing assets", () => {
    expect(() => parseWgerImportJson(JSON.stringify([{ ...example, imageUrl: "https://example.invalid/a" }]))).toThrow();
  });

  it("maps category, muscles, equipment and attribution", () => {
    expect(previewWgerExercise(example)).toMatchObject({
      sourceKey: "wger:100",
      muscleGroup: "chest",
      secondaryMuscles: ["triceps", "shoulders"],
      equipment: "barbell",
      attribution: { source: "wger", author: "Example Author" },
    });
  });
  it("uses safe fallbacks instead of inventing muscle metadata", () => {
    expect(previewWgerExercise({ ...example, muscleIds: [], equipmentIds: [] })).toMatchObject({
      muscleGroup: "chest", equipment: "none",
    });
  });
  it("rejects unattributed imports", () => {
    expect(() => previewWgerExercise({ ...example, sourceLicense: "" })).toThrow();
  });
});
