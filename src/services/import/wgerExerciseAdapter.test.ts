import { describe, expect, it } from "vitest";
import { previewWgerExercise, type WgerExerciseInput } from "./wgerExerciseAdapter";

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
