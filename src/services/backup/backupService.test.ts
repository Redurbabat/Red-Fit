import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION } from "../../models/backup";
import { buildPreview, findDangerousKey, parseBackupJson } from "./backupService";

function minimalBackup() {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: "0.1.0",
    exportedAt: "2026-08-08T10:00:00.000Z",
    data: {
      exercises: [],
      workoutPlans: [],
      workoutLogs: [],
      foodItems: [
        {
          id: "f1",
          name: "Haferflocken",
          category: "grain",
          kcalPer100g: 370,
          proteinPer100g: 13,
          carbsPer100g: 60,
          fatPer100g: 7,
          source: "manual",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      mealLogs: [],
      nutritionGoals: [],
      waterLogs: [],
      bodyMeasurements: [],
      shoppingLists: [],
      mealPlans: [],
      recipes: [],
      userProfiles: [],
      settings: [],
    },
  };
}

describe("parseBackupJson", () => {
  it("accepts a valid backup", () => {
    const result = parseBackupJson(JSON.stringify(minimalBackup()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.foodItems).toHaveLength(1);
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseBackupJson("{nicht json");
    expect(result.ok).toBe(false);
  });

  it("rejects a foreign format", () => {
    const backup = { ...minimalBackup(), format: "andere-app" };
    const result = parseBackupJson(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects a newer schema version", () => {
    const backup = { ...minimalBackup(), schemaVersion: 999 };
    const result = parseBackupJson(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });

  it("rejects __proto__ keys anywhere in the tree", () => {
    // Built via string so JSON.parse creates an own "__proto__" property.
    const json = JSON.stringify(minimalBackup()).replace(
      '"exercises":[]',
      '"exercises":[],"x":{"__proto__":{"polluted":true}}',
    );
    const result = parseBackupJson(json);
    expect(result.ok).toBe(false);
  });

  it("rejects structurally broken data (negative kcal)", () => {
    const backup = minimalBackup();
    backup.data.foodItems[0].kcalPer100g = -5;
    const result = parseBackupJson(JSON.stringify(backup));
    expect(result.ok).toBe(false);
  });
});

describe("findDangerousKey", () => {
  it("finds nested dangerous keys", () => {
    const obj = JSON.parse('{"a":{"b":{"constructor":{}}}}');
    expect(findDangerousKey(obj)).toContain("constructor");
  });

  it("passes clean objects", () => {
    expect(findDangerousKey({ a: [1, 2, { b: "c" }] })).toBeNull();
  });
});

describe("buildPreview", () => {
  it("counts entities", () => {
    const result = parseBackupJson(JSON.stringify(minimalBackup()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const preview = buildPreview(result.backup);
      expect(preview.foodItems).toBe(1);
      expect(preview.exercises).toBe(0);
    }
  });
});
