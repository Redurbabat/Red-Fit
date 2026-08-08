/* ============================================================
 * 🏋️ RED Fitness — Datenmodell (Phase 1)
 *
 * Reine Typdefinitionen für das native Fitness-Modul. KEINE Laufzeit-
 * abhängigkeiten (nur `type`), damit `database/schema.ts` sie per
 * `import type` referenzieren kann, ohne Laufzeit-/Bundle-Kopplung.
 *
 * Grundsatz (DATA-MODEL.md §0): ALLE neuen Fitness-Daten liegen im
 * selbstheilenden Teilbaum `db.redOs.fitness.*`. Bereits getrackte Größen
 * (Gewicht/Wasser/Schlaf/Blutdruck/Schritte/Kraft-Logs) bleiben Quelle der
 * Wahrheit in `db.gesundheit` bzw. `db.redOs.gym` und werden über Adapter
 * gelesen/geschrieben — hier NICHT gespeichert (siehe [ADAPTER]-Marker).
 * ============================================================ */

/** Herkunft eines Datensatzes (Nachvollziehbarkeit, Import-Deduplizierung). */
export type FitnessSource =
  | "manual"
  | "seed"
  | "import-xlsx"
  | "import-csv"
  | "import-pdf"
  | "adapter"
  | "bridge"
  | "ai-suggested";

/** Gemeinsamer Rumpf aller neuen Fitness-Entitäten (DATA-MODEL.md §1). */
export interface FitnessEntity {
  id: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  archivedAt?: string | null; // Soft-Delete
  sourceType: FitnessSource;
  sourceReference?: string;
  importJobId?: string;
}

/* ---------- Ziele & Profil ---------- */

export interface FitnessProfile {
  geschlecht?: "m" | "w" | "d" | "";
  geburtsjahr?: number;
  /** [ADAPTER] Spiegel auf db.gesundheit.groesse — nicht doppelt pflegen. */
  groesseCm?: number;
  aktivitaetslevel?: "niedrig" | "mittel" | "hoch";
  /** [ADAPTER] Spiegel auf db.gesundheit.gewichtZiel. */
  zielgewichtKg?: number | null;
  grundumsatzKcal?: number;
  /** @deprecated Legacy-Lesefeld. Kanonisch ist FitnessState.activeNutritionGoalId. */
  aktivesZielProfilId?: string;
}

export interface NutritionGoal extends FitnessEntity {
  name: string;
  kcal: number;
  proteinG: number;
  fettG: number;
  khG: number;
  /** Additive Fett-Zielband-Erweiterung (nicht Teil von PLAN_META.ziele). */
  fettMinG?: number;
  fettMaxG?: number;
  wasserZielMl: number;
  aktiv: boolean;
  gueltigAb?: string;
}

/* ---------- Zutaten & Rezepte ---------- */

export interface IngredientCategory {
  id: string;
  name: string;
  icon?: string;
  sort?: number;
}

export interface Ingredient extends FitnessEntity {
  name: string;
  kategorieId?: string;
  proteinPro100: number;
  khPro100: number;
  fettPro100: number;
  kcalPro100: number; // Cache = Formel
  standardEinheit: string;
  preisRappenProEinheit?: number;
}

export interface Recipe extends FitnessEntity {
  code?: string;
  name: string;
  kategorie: string;
  zubereitung: string;
  portionen: number;
  proteinG: number;
  khG: number;
  fettG: number;
  kcal: number; // Cache
  obstGemuese?: number;
  quelle?: string;
  /** Freitext-Fallback (Bestand: Rezept.zutaten:string[]). */
  zutatenText?: string[];
  tagIds?: string[];
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  menge: number;
  einheit: string;
}

/* ---------- Mahlzeitenplan ---------- */

export type MealPosition = "Frühstück" | "Lunch" | "Dinner" | "Snack" | "Makro-Finisher" | string;

export interface MakroSumme {
  proteinG: number;
  khG: number;
  fettG: number;
  kcal: number;
  obstGemuese?: number;
}

export interface MealPlanTemplate extends FitnessEntity {
  name: string;
  zyklusTage: number;
  zielProfilId?: string;
  startDatum?: string;
  endDatum?: string;
  mealPrepTage: string[];
}

export interface MealPlanTemplateDay {
  id: string;
  templateId: string;
  zyklusTag: number; // 1..zyklusTage
  fokus: string;
  summe: MakroSumme;
}

export interface MealPlanDay extends FitnessEntity {
  templateId: string;
  date: string; // ISO YYYY-MM-DD (lokal, iso())
  zyklusTag: number;
  abgeschlossen?: boolean;
}

export interface MealSlot extends FitnessEntity {
  mealPlanDayId?: string;
  position: MealPosition;
  code?: string;
  name: string;
  recipeId?: string;
  proteinG: number;
  khG: number;
  fettG: number;
  kcal: number;
  prep?: string;
}

/** Verzehr-Log: was tatsächlich gegessen wurde (Ist-vs-Soll). */
export interface MealEntry extends FitnessEntity {
  date: string; // ISO
  mealSlotId?: string;
  recipeId?: string;
  ingredientId?: string;
  menge?: number;
  proteinG: number;
  khG: number;
  fettG: number;
  kcal: number;
  quelle: "plan" | "frei";
}

export type MealCompletionStatus = "offen" | "erledigt" | "teilweise" | "uebersprungen";

export interface MealCompletionLog {
  id: string;
  date: string; // ISO
  mealSlotId: string;
  /** Kanonischer Zustand; alte `done`-Logs werden beim Laden additiv abgebildet. */
  status: MealCompletionStatus;
  /** @deprecated Nur zum Lesen alter Daten. Neue Writes verwenden `status`. */
  done?: boolean;
  /** Optionaler Anteil für `teilweise`, 0..100. */
  anteilProzent?: number;
  /** Referenz auf einen durch diesen Log rückgängig gemachten Vorgänger. */
  rueckgaengigVonLogId?: string;
  zeit?: string;
}

/* ---------- Einkauf ---------- */

export interface GroceryList extends FitnessEntity {
  woche?: "A" | "B";
  zeitraumVon?: string;
  zeitraumBis?: string;
  templateId?: string;
  name?: string;
}

export interface GroceryListItem {
  id: string;
  groceryListId: string;
  name: string;
  menge: number;
  einheit: string;
  hinweis?: string;
  ingredientId?: string;
  preisRappen?: number;
  gekauft: boolean;
}

/* ---------- Vorrat ---------- */

export interface PantryItem extends FitnessEntity {
  ingredientId?: string;
  name: string;
  mengeVorhanden: number; // Cache über Transaktionen
  einheit: string;
  mindestMenge?: number;
  ablaufDatum?: string;
  ort?: "kuehlschrank" | "gefrierschrank" | "vorratsschrank" | "kueche" | "sonstiges";
  /** Übliche Packungsgröße (gleiche Einheit) → Verpackungsrundung im Einkauf (Welle 8). */
  packungsGroesse?: number;
}

export interface PantryTransaction {
  id: string;
  pantryItemId: string;
  date: string; // ISO
  delta: number; // + Zugang / − Verbrauch
  grund: "einkauf" | "verbrauch" | "korrektur" | "verschwendung";
  refId?: string;
}

export type PantryReservationStatus = "aktiv" | "verbraucht" | "freigegeben" | "storniert";

/** Reservierte Vorratsmenge, z. B. für eine geplante Meal-Prep-Session. */
export interface PantryReservation extends FitnessEntity {
  pantryItemId: string;
  menge: number;
  einheit: string;
  status: PantryReservationStatus;
  fuerDatum?: string;
  grund: "meal-prep" | "meal-plan" | "manual";
  refId?: string;
}

/* ---------- Meal Prep ---------- */

export interface MealPrepSession extends FitnessEntity {
  date: string; // ISO
  zeitpunkt: string;
  fuerTage: string[];
  abgeschlossen?: boolean;
}

export interface MealPrepTask {
  id: string;
  sessionId: string;
  text: string; // Feld heißt text (nicht title), wie KalenderEvent.checklist
  done: boolean;
  sort?: number;
}

/* ---------- Fortschritt ---------- */

export interface BodyMeasurement extends FitnessEntity {
  date: string; // ISO
  typ: "taille" | "huefte" | "brust" | "armLinks" | "armRechts" | "beinLinks" | "beinRechts" | "kfa" | string;
  wertCm?: number;
  prozent?: number;
}

/** Nur Metadaten; das Bild-Blob liegt in IndexedDB (nie localStorage/Datenpaket). */
export interface ProgressPhotoMeta extends FitnessEntity {
  date: string; // ISO
  blobRef: string; // IndexedDB-Key
  notiz?: string;
}

export interface DailyCheckin extends FitnessEntity {
  date: string; // ISO
  energie?: number; // 1..10
  hunger?: number;
  verdauung?: number;
  schlafScore?: number;
  stress?: number;
  stimmung?: number;
  motivation?: number;
  notiz?: string;
}

/* ---------- Training ---------- */

export interface TrainingPlan extends FitnessEntity {
  name: string;
  ziel?: string;
  tageProWoche?: number;
  workoutIds: string[];
}

export interface Workout extends FitnessEntity {
  planId?: string;
  name: string;
  date?: string; // ISO bei Durchführung
  dauerMin?: number;
  notiz?: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  sort: number;
  zielSaetze?: number;
  zielWdh?: number;
}

export interface Exercise extends FitnessEntity {
  name: string;
  muskelgruppe: string;
  equipment?: string;
  typ?: string;
}

/* ---------- Einstellungen, Logs, Import, Tags ---------- */

export interface FitnessSettings {
  einheitGewicht: "kg" | "lb";
  einheitVolumen: "ml" | "oz";
  /** @deprecated Legacy-Lesefeld. Kanonisch ist FitnessState.activeNutritionGoalId. */
  aktivesZielProfilId?: string;
  kalenderAuto: boolean; // Default false — nie automatisch
  /**
   * @deprecated Kein Consent-Gate. Nur für alte Backups lesbar; die
   * autoritative Freigabe kommt ausschließlich aus ConsentService.health.
   */
  kiFreigabe?: boolean;
}

export interface FitnessActivityLog {
  id: string;
  zeit: string; // ISO
  aktion:
    | "plan-uebernommen"
    | "einkauf-uebernommen"
    | "rezepte-uebernommen"
    | "import"
    | "ki-anfrage"
    | "seed"
    | string;
  detail?: string;
}

export type FitnessImportQuelle = "xlsx" | "csv" | "pdf" | "anki-txt";
export type FitnessImportStatus = "pending" | "running" | "completed" | "partial" | "failed" | "cancelled";

export interface FitnessImportJob {
  id: string;
  /** @deprecated Legacy-Startzeit. `startedAt` ist kanonisch. */
  zeit?: string; // ISO
  quelle: FitnessImportQuelle;
  status: FitnessImportStatus;
  startedAt: string; // ISO
  finishedAt?: string; // ISO
  dateiname?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  checksumSha256?: string;
  sourceVersion?: string;
  zeilenGesamt: number;
  zeilenUebernommen: number;
  warnungen: number;
  fehler: number;
  errorMessage?: string;
}

export interface FitnessImportWarning {
  id: string;
  importJobId: string;
  zeile?: number;
  feld?: string;
  meldung: string;
  schwere: "info" | "warn";
}

export interface FitnessTag {
  id: string;
  name: string;
  farbe?: string;
}

/** Persistierbare Filter-/Ansichtskonfiguration eines Fitness-Bereichs. */
export interface FitnessSavedView extends FitnessEntity {
  name: string;
  bereich: string;
  /** Serialisierte, bereichsspezifische Filterdefinition. */
  filterJson: string;
  sort?: number;
}

/* ============================================================
 * FitnessState — der selbstheilende Teilbaum db.redOs.fitness.*
 * Enthält NUR Nutzer-Instanzdaten. Asset-Seeds (Plan-Katalog,
 * Basis-Zutaten) und Adapter-Größen (Gewicht/Wasser/… in db.gesundheit,
 * Kraft-Logs in db.redOs.gym) liegen NICHT hier.
 * ============================================================ */
export interface FitnessState {
  /** Interne Feld-Version des Teilbaums (für additive Selbstheilung). */
  version: number;
  /** Einzige kanonische Auswahl des aktiven Ernährungsziels. */
  activeNutritionGoalId: string;
  profile: FitnessProfile;
  nutritionGoals: NutritionGoal[];
  ingredients: Ingredient[]; // nutzerergänzt (Basis = Asset)
  ingredientCategories: IngredientCategory[];
  recipes: Recipe[]; // nutzerdefiniert (18 Seed = Asset)
  recipeIngredients: RecipeIngredient[];
  mealPlanTemplates: MealPlanTemplate[]; // nutzerdefiniert
  mealPlanTemplateDays: MealPlanTemplateDay[]; // nutzerdefiniert
  mealPlanDays: MealPlanDay[];
  mealSlots: MealSlot[]; // Instanz-Overrides
  mealEntries: MealEntry[];
  mealCompletionLogs: MealCompletionLog[];
  groceryLists: GroceryList[];
  groceryListItems: GroceryListItem[];
  pantryItems: PantryItem[];
  pantryTransactions: PantryTransaction[];
  pantryReservations: PantryReservation[];
  mealPrepSessions: MealPrepSession[];
  mealPrepTasks: MealPrepTask[];
  bodyMeasurements: BodyMeasurement[];
  progressPhotos: ProgressPhotoMeta[];
  dailyCheckins: DailyCheckin[];
  trainingPlans: TrainingPlan[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  exercises: Exercise[]; // nutzerdefiniert (Katalog = Asset)
  settings: FitnessSettings;
  activityLogs: FitnessActivityLog[];
  importJobs: FitnessImportJob[];
  importWarnings: FitnessImportWarning[];
  savedViews: FitnessSavedView[];
  tags: FitnessTag[];
  /** Idempotenz-Marker: welche Plan-Vorlage schon geseedet wurde. */
  seededPlanId?: string;
}
