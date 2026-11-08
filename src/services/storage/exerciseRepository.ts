import type { Exercise } from "../../models";
import type { WgerExercisePreview } from "../import/wgerExerciseAdapter";
import { nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<Exercise>(db.exercises);

export const exerciseRepository = {
  ...base,

  /**
   * Atomic import. Never replace local exercises or duplicate imported
   * references; their original author/licence stay attached to each record.
   */
  async importAttributedExercises(
    previews: WgerExercisePreview[],
  ): Promise<{ created: number; skipped: number }> {
    return db.transaction("rw", db.exercises, async () => {
      const previous = await db.exercises.toArray();
      const known = new Set(previous.map((exercise) => exercise.sourceRef).filter(Boolean));
      const imported: Exercise[] = [];
      for (const preview of previews) {
        if (known.has(preview.sourceKey)) continue;
        known.add(preview.sourceKey);
        const now = nowIso();
        imported.push({
          id: newId(),
          createdAt: now,
          updatedAt: now,
          name: preview.name,
          muscleGroup: preview.muscleGroup,
          secondaryMuscles: preview.secondaryMuscles,
          equipment: preview.equipment,
          difficulty: preview.difficulty,
          instructions: [],
          commonMistakes: [],
          tips: [],
          sourceRef: preview.sourceKey,
          sourceAuthor: preview.attribution.author,
          sourceLicense: preview.attribution.license,
          isCustom: true,
        });
      }
      if (imported.length > 0) await db.exercises.bulkAdd(imported);
      return { created: imported.length, skipped: previews.length - imported.length };
    });
  },

  /** Alphabetical list — the library's default ordering. */
  async listSorted(): Promise<Exercise[]> {
    const all = await db.exercises.toArray();
    return all.sort((a, b) => a.name.localeCompare(b.name, "de"));
  },
};
