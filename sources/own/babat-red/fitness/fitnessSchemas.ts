import { z } from "zod";
import { FITNESS_STATE_VERSION } from "../persistence/sanitizeFitnessState";
import { WASSER_ZIEL_ML } from "../../gesundheit/services/GesundheitKonstanten";
export { sanitizeFitnessState } from "../persistence/sanitizeFitnessState";

/* ============================================================
 * ✅ fitnessSchemas — Zod-Validierung NUR an den Rändern (DATA-MODEL §3).
 *
 * (1) Import (CSV/xlsx-Asset): jede Zeile gegen ein Input-Schema; ungültige
 *     Zeilen → Warnung, gültige werden übernommen (Teil-Import).
 * (2) Restore (Backup/Cloud): sanitizeFitnessState heilt defensiv statt zu
 *     werfen (Muster heileListen) — nie eine weiße Seite.
 * Nicht im Hot-Path validieren.
 * ============================================================ */

const nichtNeg = z.number().finite().nonnegative();
const nichtNegGanz = z.number().finite().int().nonnegative();

/** ISO-Datum "YYYY-MM-DD" MIT Kalenderprüfung (Format allein ließe 2026-13-45 durch). */
const zIsoDatum = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }, { message: "kein gültiges Kalenderdatum" });

/** Import-Schema: Ernährungsziel. */
export const zNutritionGoalInput = z.object({
  name: z.string().min(1),
  kcal: nichtNeg,
  proteinG: nichtNeg,
  fettG: nichtNeg,
  khG: nichtNeg,
  fettMinG: nichtNeg.optional(),
  fettMaxG: nichtNeg.optional(),
  wasserZielMl: nichtNeg.default(WASSER_ZIEL_ML),
});

/** Import-Schema: Zutat mit Nährwerten je 100 g/ml. */
export const zIngredientInput = z.object({
  name: z.string().min(1),
  proteinPro100: nichtNeg,
  khPro100: nichtNeg,
  fettPro100: nichtNeg,
  kcalPro100: nichtNeg.optional(),
  standardEinheit: z.string().min(1).default("g"),
  preisRappenProEinheit: z.number().int().nonnegative().optional(),
});

/** Import-Schema: Rezept (aggregierte Makros). */
export const zRecipeInput = z.object({
  name: z.string().min(1),
  kategorie: z.string().default(""),
  zubereitung: z.string().default(""),
  portionen: z.number().finite().positive().default(1),
  proteinG: nichtNeg,
  khG: nichtNeg,
  fettG: nichtNeg,
  kcal: nichtNeg.optional(),
});

/** Import-Schema: Verzehr-Eintrag. */
export const zMealEntryInput = z.object({
  date: zIsoDatum,
  proteinG: nichtNeg,
  khG: nichtNeg,
  fettG: nichtNeg,
  kcal: nichtNeg.optional(),
  quelle: z.enum(["plan", "frei"]).default("frei"),
});

/** Persistenzschema: kanonischer Mahlzeiten-Abschlussstatus. */
export const zMealCompletionStatus = z.enum(["offen", "erledigt", "teilweise", "uebersprungen"]);
export const zMealCompletionLogPersisted = z.object({
  id: z.string().min(1),
  date: zIsoDatum,
  mealSlotId: z.string().min(1),
  status: zMealCompletionStatus,
  done: z.boolean().optional(),
  anteilProzent: z.number().finite().min(0).max(100).optional(),
  rueckgaengigVonLogId: z.string().min(1).optional(),
  zeit: z.string().min(1).optional(),
}).passthrough();

const zFitnessSource = z.enum([
  "manual",
  "seed",
  "import-xlsx",
  "import-csv",
  "import-pdf",
  "adapter",
  "bridge",
  "ai-suggested",
]);

const zFitnessEntity = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  archivedAt: z.string().nullable().optional(),
  sourceType: zFitnessSource,
  sourceReference: z.string().optional(),
  importJobId: z.string().optional(),
});

/** Persistenzschema: Vorratsreservierung. */
export const zPantryReservationPersisted = zFitnessEntity.extend({
  pantryItemId: z.string().min(1),
  menge: nichtNeg,
  einheit: z.string().min(1),
  status: z.enum(["aktiv", "verbraucht", "freigegeben", "storniert"]),
  fuerDatum: zIsoDatum.optional(),
  grund: z.enum(["meal-prep", "meal-plan", "manual"]),
  refId: z.string().optional(),
}).passthrough();

/** Persistenzschema: gespeicherte Fitness-Ansicht. */
export const zFitnessSavedViewPersisted = zFitnessEntity.extend({
  name: z.string().min(1),
  bereich: z.string().min(1),
  filterJson: z.string().refine((wert) => {
    try {
      JSON.parse(wert);
      return true;
    } catch {
      return false;
    }
  }, { message: "filterJson ist kein gültiges JSON" }),
  sort: z.number().finite().optional(),
}).passthrough();

export const zFitnessImportQuelle = z.enum(["xlsx", "csv", "pdf", "anki-txt"]);
export const zFitnessImportStatus = z.enum([
  "pending",
  "running",
  "completed",
  "partial",
  "failed",
  "cancelled",
]);

/** Persistenzschema: nachvollziehbare, aber inhaltsarme Import-Metadaten. */
export const zFitnessImportJobPersisted = z.object({
  id: z.string().min(1),
  zeit: z.string().min(1).optional(),
  quelle: zFitnessImportQuelle,
  status: zFitnessImportStatus,
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1).optional(),
  dateiname: z.string().optional(),
  mimeType: z.string().optional(),
  fileSizeBytes: nichtNegGanz.optional(),
  checksumSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  sourceVersion: z.string().optional(),
  zeilenGesamt: nichtNegGanz,
  zeilenUebernommen: nichtNegGanz,
  warnungen: nichtNegGanz,
  fehler: nichtNegGanz,
  errorMessage: z.string().optional(),
}).passthrough();

/**
 * Schnelles Zod-Hüllschema für den sanierten Teilbaum. Die fachlichen
 * Entitäten werden an ihren Import-/Write-Grenzen mit den obigen Schemas
 * geprüft; hier geht es um die vollständige persistierbare Top-Level-Form.
 */
export const zFitnessStateEnvelope = z.object({
  version: z.number().finite().int().min(FITNESS_STATE_VERSION),
  activeNutritionGoalId: z.string().min(1),
  profile: z.record(z.string(), z.unknown()),
  nutritionGoals: z.array(z.unknown()),
  ingredients: z.array(z.unknown()),
  ingredientCategories: z.array(z.unknown()),
  recipes: z.array(z.unknown()),
  recipeIngredients: z.array(z.unknown()),
  mealPlanTemplates: z.array(z.unknown()),
  mealPlanTemplateDays: z.array(z.unknown()),
  mealPlanDays: z.array(z.unknown()),
  mealSlots: z.array(z.unknown()),
  mealEntries: z.array(z.unknown()),
  mealCompletionLogs: z.array(z.unknown()),
  groceryLists: z.array(z.unknown()),
  groceryListItems: z.array(z.unknown()),
  pantryItems: z.array(z.unknown()),
  pantryTransactions: z.array(z.unknown()),
  pantryReservations: z.array(z.unknown()),
  mealPrepSessions: z.array(z.unknown()),
  mealPrepTasks: z.array(z.unknown()),
  bodyMeasurements: z.array(z.unknown()),
  progressPhotos: z.array(z.unknown()),
  dailyCheckins: z.array(z.unknown()),
  trainingPlans: z.array(z.unknown()),
  workouts: z.array(z.unknown()),
  workoutExercises: z.array(z.unknown()),
  exercises: z.array(z.unknown()),
  settings: z.object({
    einheitGewicht: z.enum(["kg", "lb"]),
    einheitVolumen: z.enum(["ml", "oz"]),
    aktivesZielProfilId: z.string().optional(),
    kalenderAuto: z.boolean(),
    kiFreigabe: z.boolean().optional(),
  }).passthrough(),
  activityLogs: z.array(z.unknown()),
  importJobs: z.array(z.unknown()),
  importWarnings: z.array(z.unknown()),
  savedViews: z.array(z.unknown()),
  tags: z.array(z.unknown()),
  seededPlanId: z.string().optional(),
}).passthrough();

export type NutritionGoalInput = z.infer<typeof zNutritionGoalInput>;
export type IngredientInput = z.infer<typeof zIngredientInput>;
export type RecipeInput = z.infer<typeof zRecipeInput>;
export type MealEntryInput = z.infer<typeof zMealEntryInput>;

/** Ergebnis eines Zeilen-Parse (für Teil-Import + Warnungen). */
export interface ZeilenParse<T> {
  ok: boolean;
  wert?: T;
  fehler?: string;
}

/** Eine Zeile gegen ein Schema prüfen; nie werfen. */
export function parseZeile<T>(schema: z.ZodType<T>, roh: unknown): ZeilenParse<T> {
  const r = schema.safeParse(roh);
  if (r.success) return { ok: true, wert: r.data };
  const erst = r.error.issues[0];
  return { ok: false, fehler: erst ? `${erst.path.join(".") || "?"}: ${erst.message}` : "ungültig" };
}
