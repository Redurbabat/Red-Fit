import { beforeEach, describe, expect, it } from "vitest";
import { previewWgerExercise } from "../import/wgerExerciseAdapter";
import { db } from "./database";
import { exerciseRepository } from "./exerciseRepository";

const preview = previewWgerExercise({
  sourceId: 42,
  name: "Test Squat",
  categoryId: 9,
  muscleIds: [10],
  secondaryMuscleIds: [8],
  equipmentIds: [1],
  sourceLicense: "CC-BY-SA 4 (https://creativecommons.org/licenses/by-sa/4.0/deed.en)",
  sourceAuthor: "Source Author",
});

describe("importAttributedExercises", () => {
  beforeEach(async () => {
    await db.exercises.clear();
  });

  it("preserves source details and does not duplicate repeated imports", async () => {
    expect(await exerciseRepository.importAttributedExercises([preview]))
      .toEqual({ created: 1, skipped: 0 });
    expect(await exerciseRepository.importAttributedExercises([preview]))
      .toEqual({ created: 0, skipped: 1 });

    const list = await db.exercises.toArray();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: "Test Squat",
      sourceRef: "wger:42",
      sourceAuthor: "Source Author",
      taxonomyNeedsReview: false,
      muscleGroup: "legs",
      equipment: "barbell",
      isCustom: true,
    });
    expect(list[0].sourceLicense).toContain("creativecommons.org");
  });

  it("keeps local exercises unchanged and deduplicates within one upload", async () => {
    await exerciseRepository.create({
      name: "Personal movement",
      muscleGroup: "mobility",
      secondaryMuscles: [],
      equipment: "bodyweight",
      difficulty: "beginner",
      instructions: [],
      commonMistakes: [],
      tips: [],
      isCustom: true,
    });

    const result = await exerciseRepository.importAttributedExercises([preview, preview]);
    expect(result).toEqual({ created: 1, skipped: 1 });
    expect(await db.exercises.count()).toBe(2);
    expect((await exerciseRepository.list()).some((e) => e.name === "Personal movement")).toBe(true);
  });

  it("persists review status without modifying existing exercises", async () => {
    const unclassified = {
      ...preview,
      sourceKey: "wger:77",
      muscleGroup: "fullBody" as const,
      needsMuscleReview: true,
    };
    await exerciseRepository.importAttributedExercises([unclassified]);
    const imported = (await exerciseRepository.list()).find((e) => e.sourceRef === "wger:77");
    expect(imported?.taxonomyNeedsReview).toBe(true);
  });
});
