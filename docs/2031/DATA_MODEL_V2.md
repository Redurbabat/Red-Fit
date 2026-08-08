# RED Fit 2031 — Datenmodell V2

## Grundsätze

- Dexie/IndexedDB bleibt Source of Truth; Zugriff nur über Repositories.
- **Migrationen sind additiv, versioniert und getestet.** Stores werden nie
  gedroppt, bevor eine vollständige Migration bewiesen ist.
- Vor/nach jeder Migration: Zähl-Validierung (Workouts, Sätze, Foods, Meals,
  Messungen, Pläne, Rezepte, Einkauf, Settings).

## Stand nach Phase A (DB-Version 2)

v1: 14 Stores (exercises, workoutPlans, workoutLogs, foodItems, mealLogs,
nutritionGoals, waterLogs, bodyMeasurements, shoppingLists, mealPlans, recipes,
userProfiles, settings, metadata).
**v2 (additiv): + `recoveryLogs` (`id, date`)** — tägliche Recovery-Check-ins
(sleepQuality/energy/stress/soreness 1–5, optional sleepHours). Ein Check-in
pro Lokaltag, Upsert über Datum.

Backup-Format: `recoveryLogs` als **optionales** Array ergänzt — v1-Backups
bleiben ohne Änderung importierbar; Import merged den Store nur, wenn vorhanden.

## Entscheidung: Workout-Normalisierung (§73) — geprüft, bewusst vertagt

Der Auftrag verlangt ausdrücklich, nicht blind zu zerlegen, sondern Queries
und Update-Muster zu begründen. Ergebnis der Prüfung:

- **Datenvolumen:** 5 Jahre × ~5 Workouts/Woche ≈ 1 300 WorkoutLogs mit je
  ~20–30 Sätzen. Als verschachtelte Objekte: wenige MB — weit unterhalb jeder
  IndexedDB-Grenze. Lesepfade (Historie, Records, Analytics) laden ohnehin
  ganze Workouts.
- **Schreibmuster:** Der Workout-Modus hält genau EIN aktives Workout und
  schreibt es debounced/sofort als Ganzes (atomar!). Eine Satz-Tabelle würde
  Teilzustände möglich machen (Satz gespeichert, Workout-Kopf nicht) — genau
  das Risiko, das Priorität 1 (kein Datenverlust) verbietet.
- **Konsequenz:** Verschachteltes `WorkoutLog` bleibt. Neu bewertet wird,
  sobald ein realer Bedarf entsteht (z. B. satzgenaue Cross-Workout-Queries
  ohne Aggregat, Multi-Device-Sync mit Konflikt-Merge auf Satzebene).

## Geplante additive Erweiterungen (Phase C)

| Store | Zweck |
|---|---|
| `goals` | vereinheitlichtes Zielsystem (bodyWeight, calories, protein, workoutFrequency, strength, habit) mit start/target/targetDate/status |
| `mediaAssets` | Blob-Layer für Fortschrittsfotos (Metadaten getrennt, privacyClass `sensitiveMedia`) |
| `progressPhotos` | Foto-Metadaten (date, pose, weight?, storageRef) |
| `personalRecords` | materialisierte PR-Typen (maxWeight, e1RM, repPR, volumePR) — heute zur Laufzeit berechnet und getestet; Materialisierung nur bei Bedarf |

FoodItem bekommt Provenance-Felder (`source: manual/barcode/openFoodFacts/recipe/import`,
`sourceName`, `sourceId?`, `lastVerifiedAt?`) — additiv, optional.

## Zeit & Einheiten

- Tageslogs: LocalDate-Key (`getLocalDateKey()`, nie UTC-Slice)
- Workout-Start/Rest-Timer: absolute Timestamps
- Intern metrisch: kg, g, ml, cm, kcal; imperial später als reine Anzeige-Schicht
