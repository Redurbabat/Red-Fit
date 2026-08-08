# FINAL-DATA-MODEL.md — Verbindliches Datenmodell RED Fit

Basis: Master-Prompt §§15–28, abgeglichen gegen alle Quell-Analysen
(REPORT-WORKOUT, REPORT-NUTRITION, REPORT-MEAL-PLANNING, REPORT-STORAGE).
Code Englisch, UI Deutsch. IDs: `crypto.randomUUID()`. Timestamps: ISO-8601.
Tages-Keys: lokales `YYYY-MM-DD` (nie UTC-Slice!).

## Konventionen

```ts
type ISODateTime = string   // "2026-08-08T18:25:12.123Z"
type LocalDateKey = string  // "2026-08-08" — lokales Datum

interface BaseEntity {
  id: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

## Training

```ts
type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "abs"
  | "legs" | "glutes" | "calves" | "forearms" | "fullBody" | "cardio" | "mobility"

type EquipmentType = "none" | "dumbbell" | "barbell" | "machine" | "cable"
  | "kettlebell" | "resistanceBand" | "bodyweight" | "treadmill" | "bike" | "other"

type Difficulty = "beginner" | "intermediate" | "advanced"

interface Exercise extends BaseEntity {
  name: string
  muscleGroup: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType
  difficulty: Difficulty
  instructions: string[]     // Seed: BABAT-RED uebungen.ts (4 Schritte)
  commonMistakes: string[]   // Seed: 3 typische Fehler
  tips: string[]             // Seed: Profi-Tipp
  animation3dUrl?: string    // Phase 13
  imageUrl?: string
  isCustom: boolean
}

type TrainingLocation = "gym" | "home" | "both"
type FitnessGoal = "buildMuscle" | "loseFat" | "maintain" | "strength" | "endurance" | "health"

interface WorkoutPlan extends BaseEntity {
  name: string
  goal: FitnessGoal
  daysPerWeek: number        // 1–7 validieren
  level: Difficulty
  location: TrainingLocation
  sessions: WorkoutPlanSession[]
  active: boolean            // genau einer aktiv; Aktivierung deaktiviert den vorherigen
}

interface WorkoutPlanSession {
  id: string
  name: string
  dayIndex?: number          // 0 = Montag … 6 = Sonntag
  exercises: WorkoutPlanExercise[]
}

interface WorkoutPlanExercise {
  id: string
  exerciseId: string
  sets: number               // ≥ 1
  repsMin: number            // ≤ repsMax
  repsMax: number
  restSeconds: number        // ≥ 0
  targetWeightKg?: number
  notes?: string
}

type WorkoutStatus = "planned" | "active" | "completed" | "cancelled"

// Liftosaur-Erkenntnis: das aktive Workout IST ein WorkoutLog (status "active"),
// sofort persistiert, bei jeder Änderung per Autosave aktualisiert.
interface WorkoutLog extends BaseEntity {
  date: LocalDateKey
  planId?: string
  sessionId?: string
  name: string
  startedAt: ISODateTime
  endedAt?: ISODateTime
  durationSeconds?: number
  status: WorkoutStatus
  exerciseLogs: ExerciseLog[]
  notes?: string
  restEndsAt?: ISODateTime   // Pausentimer als absoluter Zeitpunkt (Liftosaur-Muster)
  currentExerciseIndex?: number
}

interface ExerciseLog {
  id: string
  exerciseId: string
  name: string               // Snapshot — Historie bleibt stabil
  setLogs: SetLog[]
  notes?: string
}

interface SetLog {
  id: string
  setIndex: number
  weightKg: number           // ≥ 0 (0 = Körpergewicht)
  reps: number               // ≥ 0
  rpe?: number
  completed: boolean
  completedAt?: ISODateTime
  notes?: string
}
```

## Ernährung

```ts
type FoodCategory = "breakfast" | "meal" | "snack" | "drink" | "dairy" | "meat"
  | "fish" | "grain" | "fruit" | "vegetable" | "supplement" | "sweet" | "other"

type FoodSource = "manual" | "scanned" | "imported" | "openFoodFacts"

// Werte IMMER pro 100 g — einzige Source of Truth (OpenNutriTracker/wger-Konsens)
interface FoodItem extends BaseEntity {
  barcode?: string           // String! Führende Nullen erhalten
  name: string
  brand?: string
  category: FoodCategory
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  sugarPer100g?: number
  fiberPer100g?: number
  saltPer100g?: number
  servingSizeG?: number
  imageUrl?: string
  source: FoodSource
  favorite?: boolean
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "shake"
  | "preWorkout" | "postWorkout"

interface MealLog extends BaseEntity {
  date: LocalDateKey
  mealType: MealType
  entries: MealFoodEntry[]
  notes?: string
}

// Snapshot-Prinzip (§129): Name + berechnete Werte einfrieren
interface MealFoodEntry {
  id: string
  foodId: string
  foodName: string
  amountG: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface NutritionGoal extends BaseEntity {
  dailyKcal: number
  dailyProtein: number
  dailyCarbs: number
  dailyFat: number
  dailyWaterMl: number
  goalType: FitnessGoal
}

interface WaterLog extends BaseEntity {
  date: LocalDateKey
  amountMl: number
  loggedAt: ISODateTime
}
```

## Fortschritt

```ts
// Append-only: historische Werte nie überschreiben
interface BodyMeasurement extends BaseEntity {
  date: LocalDateKey
  weightKg?: number
  waistCm?: number
  chestCm?: number
  armCm?: number
  legCm?: number
  bodyFatPercent?: number    // 0–100 validieren
  photoUrls?: string[]
  notes?: string
}
```

## Planung

```ts
interface MealPlan extends BaseEntity {
  name: string
  weekStart: LocalDateKey    // Montag
  days: MealPlanDay[]
}

interface MealPlanDay {
  date: LocalDateKey
  entries: MealPlanEntry[]
}

// Food ODER Rezept ODER freier Text (Mealie/BABAT-RED-Konsens)
interface MealPlanEntry {
  id: string
  mealType: MealType
  foodId?: string
  recipeId?: string
  label?: string
  amountG?: number
  notes?: string
}

interface Recipe extends BaseEntity {
  name: string
  servings: number           // ≥ 1
  ingredients: RecipeIngredient[]
  instructions: string[]
}

interface RecipeIngredient {
  id: string
  foodId: string
  amountG: number
}

interface ShoppingList extends BaseEntity {
  title: string
  weekStart?: LocalDateKey
  items: ShoppingItem[]
}

interface ShoppingItem {
  id: string
  name: string
  amount?: number
  unit?: string
  category?: FoodCategory
  checked: boolean
}
```

## System

```ts
type NutritionTrackingMode = "calories" | "protein" | "mealPlan" | "simple"

interface UserProfile extends BaseEntity {
  fitnessGoal: FitnessGoal
  trainingLocation: TrainingLocation
  trainingDaysPerWeek: number
  nutritionTrackingMode: NutritionTrackingMode
}

interface UserSettings {
  theme: "dark" | "light" | "system"
  units: "metric"
  firstDayOfWeek: "monday" | "sunday"
  show3dPlaceholders: boolean
  reducedMotion: boolean
  language: "de"
}

interface AppMetadata {
  schemaVersion: number
  onboardingCompleted: boolean
  onboardingVersion: number
  demoDataSeeded: boolean
}
```

## Backup (BABAT-RED-Envelope-Muster)

```ts
interface RedFitBackup {
  format: "red-fit-backup"
  schemaVersion: number      // aktuell 1
  appVersion: string
  exportedAt: ISODateTime
  data: {
    exercises: Exercise[]
    workoutPlans: WorkoutPlan[]
    workoutLogs: WorkoutLog[]
    foodItems: FoodItem[]
    mealLogs: MealLog[]
    nutritionGoals: NutritionGoal[]
    waterLogs: WaterLog[]
    bodyMeasurements: BodyMeasurement[]
    shoppingLists: ShoppingList[]
    mealPlans: MealPlan[]
    recipes: Recipe[]
    userProfiles: UserProfile[]
    settings: UserSettings[]
  }
}
```

Import: Zod-Validierung + `__proto__`/`constructor`-Schlüssel ablehnen
(BABAT-RED `pruefeJsonBaum`-Muster) → Vorschau → Merge (Default: bestehende behalten).

## Dexie-Stores und Indizes

```ts
// DB_NAME = "red-fit", DB_VERSION = 1
exercises:        "id, name, muscleGroup, equipment"
workoutPlans:     "id, active"
workoutLogs:      "id, date, status, planId"
foodItems:        "id, name, barcode, category"
mealLogs:         "id, date, mealType, [date+mealType]"
nutritionGoals:   "id"
waterLogs:        "id, date"
bodyMeasurements: "id, date"
shoppingLists:    "id"
mealPlans:        "id, weekStart"
recipes:          "id, name"
userProfiles:     "id"
settings:         "id"      // Singleton, key "settings"
metadata:         "id"      // Singleton, key "app"
```

Migrationen: additiv, versioniert, niemals Daten löschend (Dexie `version(n).upgrade()`).
