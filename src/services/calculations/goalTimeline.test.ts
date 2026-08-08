import { describe, expect, it } from "vitest";
import type { NutritionGoal } from "../../models";
import { pickGoalForDate } from "./nutrition";

function goal(id: string, validFrom: string | undefined, updatedAt = "2026-01-01T00:00:00.000Z"): NutritionGoal {
  return {
    id,
    dailyKcal: 2600,
    dailyProtein: 160,
    dailyCarbs: 300,
    dailyFat: 80,
    dailyWaterMl: 3000,
    goalType: "buildMuscle",
    validFrom,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
  };
}

describe("pickGoalForDate", () => {
  it("picks the goal with the latest validFrom <= date", () => {
    const goals = [goal("alt", undefined), goal("juli", "2026-07-01"), goal("august", "2026-08-01")];
    expect(pickGoalForDate(goals, "2026-08-08")?.id).toBe("august");
    expect(pickGoalForDate(goals, "2026-07-15")?.id).toBe("juli");
    expect(pickGoalForDate(goals, "2026-06-01")?.id).toBe("alt");
  });

  it("treats goals without validFrom as valid since forever", () => {
    expect(pickGoalForDate([goal("alt", undefined)], "2000-01-01")?.id).toBe("alt");
  });

  it("returns undefined when every goal starts later", () => {
    expect(pickGoalForDate([goal("g", "2026-09-01")], "2026-08-08")).toBeUndefined();
  });

  it("breaks ties by updatedAt", () => {
    const goals = [
      goal("a", "2026-08-01", "2026-08-01T10:00:00.000Z"),
      goal("b", "2026-08-01", "2026-08-02T10:00:00.000Z"),
    ];
    expect(pickGoalForDate(goals, "2026-08-08")?.id).toBe("b");
  });

  it("returns undefined for an empty list", () => {
    expect(pickGoalForDate([], "2026-08-08")).toBeUndefined();
  });
});
