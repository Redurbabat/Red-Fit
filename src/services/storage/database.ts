import Dexie, { type EntityTable } from "dexie";
import type {
  AppMetadata,
  BodyMeasurement,
  Exercise,
  FoodItem,
  MealLog,
  MealPlan,
  MediaAsset,
  NutritionGoal,
  ProgressPhoto,
  Recipe,
  RecoveryLog,
  ShoppingList,
  UserProfile,
  UserSettings,
  WaterLog,
  WorkoutLog,
  WorkoutPlan,
} from "../../models";

export const DB_NAME = "red-fit";
export const DB_VERSION = 3;

/** Singleton row wrappers — settings/metadata live under fixed ids. */
export interface SettingsRow extends UserSettings {
  id: string;
}
export interface MetadataRow extends AppMetadata {
  id: string;
}
export const SETTINGS_ID = "settings";
export const METADATA_ID = "app";

class RedFitDatabase extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  workoutPlans!: EntityTable<WorkoutPlan, "id">;
  workoutLogs!: EntityTable<WorkoutLog, "id">;
  foodItems!: EntityTable<FoodItem, "id">;
  mealLogs!: EntityTable<MealLog, "id">;
  nutritionGoals!: EntityTable<NutritionGoal, "id">;
  waterLogs!: EntityTable<WaterLog, "id">;
  bodyMeasurements!: EntityTable<BodyMeasurement, "id">;
  shoppingLists!: EntityTable<ShoppingList, "id">;
  mealPlans!: EntityTable<MealPlan, "id">;
  recipes!: EntityTable<Recipe, "id">;
  userProfiles!: EntityTable<UserProfile, "id">;
  recoveryLogs!: EntityTable<RecoveryLog, "id">;
  mediaAssets!: EntityTable<MediaAsset, "id">;
  progressPhotos!: EntityTable<ProgressPhoto, "id">;
  settings!: EntityTable<SettingsRow, "id">;
  metadata!: EntityTable<MetadataRow, "id">;

  constructor() {
    super(DB_NAME);
    // Migrations are additive: later versions add stores/indexes via
    // this.version(n+1).stores({...}).upgrade(...) — existing data is never dropped.
    this.version(1).stores({
      exercises: "id, name, muscleGroup, equipment",
      workoutPlans: "id, active",
      workoutLogs: "id, date, status, planId",
      foodItems: "id, name, barcode, category, updatedAt",
      mealLogs: "id, date, mealType, [date+mealType]",
      nutritionGoals: "id, updatedAt",
      waterLogs: "id, date",
      bodyMeasurements: "id, date",
      shoppingLists: "id, updatedAt",
      mealPlans: "id, weekStart",
      recipes: "id, name",
      userProfiles: "id",
      settings: "id",
      metadata: "id",
    });
    // v2 (RED Fit 2031, Phase A): recovery check-ins — purely additive.
    this.version(2).stores({
      recoveryLogs: "id, date",
    });
    // v3 (2031 Phase C): media layer + progress photos — purely additive.
    // Blobs live only in mediaAssets; photo metadata is a separate record.
    this.version(DB_VERSION).stores({
      mediaAssets: "id",
      progressPhotos: "id, date, pose",
    });
  }
}

export const db = new RedFitDatabase();
