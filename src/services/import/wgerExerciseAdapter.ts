import type { Difficulty, EquipmentType, MuscleGroup } from "../../models/exercise";

/**
 * Interoperability adapter for an individually licensed, user-supplied
 * wger-compatible exercise record. Does not ship wger records or media.
 * Licences/attributions must be reviewed BEFORE any catalog import.
 */
export interface WgerExerciseInput {
  sourceId: number;
  name: string;
  categoryId: number;
  muscleIds: number[];
  secondaryMuscleIds: number[];
  equipmentIds: number[];
  sourceLicense: string;
  sourceAuthor: string;
}

export interface WgerExercisePreview {
  sourceKey: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  difficulty: Difficulty;
  attribution: { author: string; license: string; source: "wger" };
}

const muscleMap: Record<number, MuscleGroup> = {
  1: "biceps", 2: "shoulders", 3: "chest", 4: "chest", 5: "triceps",
  6: "abs", 7: "calves", 8: "glutes", 9: "back", 10: "legs",
  11: "legs", 12: "back", 13: "biceps", 14: "abs", 15: "calves", 16: "back",
};

const categoryMap: Record<number, MuscleGroup> = {
  8: "biceps", 9: "legs", 10: "abs", 11: "chest", 12: "back",
  13: "shoulders", 14: "calves", 15: "cardio",
};

const equipmentMap: Record<number, EquipmentType> = {
  1: "barbell", 2: "barbell", 3: "dumbbell", 4: "none", 5: "other",
  6: "other", 7: "bodyweight", 8: "other", 9: "other",
  10: "kettlebell", 11: "resistanceBand", 12: "cable",
};

export function previewWgerExercise(input: WgerExerciseInput): WgerExercisePreview {
  if (!Number.isSafeInteger(input.sourceId) || input.sourceId <= 0) {
    throw new RangeError("Invalid source ID");
  }
  if (!input.name.trim() || !input.sourceLicense.trim() || !input.sourceAuthor.trim()) {
    throw new Error("Exercise name, source license, and author are required");
  }
  const primary = input.muscleIds.map((id) => muscleMap[id]).find(Boolean) ??
    categoryMap[input.categoryId] ?? "fullBody";
  const secondary = [...new Set(
    [...input.muscleIds, ...input.secondaryMuscleIds]
      .map((id) => muscleMap[id])
      .filter((muscle): muscle is MuscleGroup => muscle !== undefined && muscle !== primary),
  )];
  const equipment = input.equipmentIds.map((id) => equipmentMap[id]).find(Boolean) ?? "none";

  return {
    sourceKey: "wger:" + input.sourceId,
    name: input.name.trim(),
    muscleGroup: primary,
    secondaryMuscles: secondary,
    equipment,
    difficulty: "intermediate",
    attribution: {
      author: input.sourceAuthor.trim(),
      license: input.sourceLicense.trim(),
      source: "wger",
    },
  };
}
