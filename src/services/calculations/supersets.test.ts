import { describe, expect, it } from "vitest";
import type { ExerciseLog } from "../../models";
import {
  contiguousSuperset,
  invalidSupersetGroup,
  nextSupersetExerciseIndex,
  shouldRestAfterSupersetSet,
  supersetRestSeconds,
} from "./supersets";

function entry(id: string, group: string | undefined, completed: boolean[]): ExerciseLog {
  return {
    id,
    exerciseId: id,
    name: id,
    supersetGroup: group,
    setLogs: completed.map((done, index) => ({
      id: id + "-" + index,
      setIndex: index,
      weightKg: 20,
      reps: 10,
      completed: done,
    })),
  };
}

describe("superset rounds", () => {
  it("validates adjacent groups and rejects split or single entries", () => {
    expect(invalidSupersetGroup([
      { supersetGroup: "A" }, { supersetGroup: "A" },
      {}, { supersetGroup: "B" }, { supersetGroup: "B" },
    ])).toBeUndefined();
    expect(invalidSupersetGroup([{ supersetGroup: "A" }])).toBe("A");
    expect(invalidSupersetGroup([
      { supersetGroup: "A" }, {}, { supersetGroup: "A" },
    ])).toBe("A");
  });

  it("only groups contiguous matching entries", () => {
    const logs = [entry("a", "A", [false]), entry("b", "A", [false]),
      entry("c", undefined, [false]), entry("d", "A", [false])];
    expect(contiguousSuperset(logs, 0)).toEqual([0, 1]);
    expect(contiguousSuperset(logs, 3)).toEqual([]);
    expect(contiguousSuperset(logs, 2)).toEqual([]);
  });

  it("alternates A and B with no rest in between", () => {
    const logs = [entry("a", "A", [true, false]), entry("b", "A", [false, false])];
    const afterA = nextSupersetExerciseIndex(logs, 0);
    expect(afterA).toBe(1);
    expect(shouldRestAfterSupersetSet(logs, 0, afterA)).toBe(false);
    logs[1].setLogs[0].completed = true;
    const afterB = nextSupersetExerciseIndex(logs, 1);
    expect(afterB).toBe(0);
    expect(shouldRestAfterSupersetSet(logs, 1, afterB)).toBe(true);
  });

  it("skips completed members in an uneven group", () => {
    const logs = [entry("a", "A", [true]), entry("b", "A", [true, false])];
    expect(nextSupersetExerciseIndex(logs, 1)).toBe(1);
    expect(shouldRestAfterSupersetSet(logs, 1, 1)).toBe(true);
    logs[1].setLogs[1].completed = true;
    expect(nextSupersetExerciseIndex(logs, 1)).toBeUndefined();
    expect(shouldRestAfterSupersetSet(logs, 1, undefined)).toBe(true);
  });

  it("leaves plain workout navigation unchanged", () => {
    const logs = [entry("a", undefined, [false]), entry("b", undefined, [false])];
    expect(nextSupersetExerciseIndex(logs, 0)).toBeUndefined();
    expect(shouldRestAfterSupersetSet(logs, 0, undefined)).toBe(true);
  });

  it("uses explicit group rest, otherwise the longest member rest", () => {
    const logs = [entry("a", "A", [false]), entry("b", "A", [false])];
    expect(supersetRestSeconds(logs, 0, (id) => id === "a" ? 90 : 120)).toBe(120);
    logs[0].supersetRestSeconds = 75;
    expect(supersetRestSeconds(logs, 1, () => 180)).toBe(75);
  });
});
