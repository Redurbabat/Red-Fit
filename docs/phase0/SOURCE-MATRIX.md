# SOURCE-MATRIX.md — Vergleich der 20 Quellen

Grundlage: vollständige Rekonstruktion und Inventarisierung aller 20 Archive aus
`github.com/Redurbabat/gym-essen` (53 Teile → 20 ZIPs → 615 MB entpackter Quellcode).
Alle Archive per `unzip -t` geprüft, SHA256 dokumentiert in `audits/ARCHIVE-INTEGRITY.md`.

Bewertung: 0 = ungeeignet, 5 = sehr stark **für RED Fit** (nicht: "gutes Projekt").
Ein exzellentes Projekt kann hier 1 bekommen, wenn seine Stärke für RED Fit irrelevant ist.

| Projekt | Workout | Übungen | Progression | Nutrition | Barcode | Rezepte | Meal Plan | Shopping | PWA | Local-first | 3D | AI | Portierbarkeit | Entscheidung |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Liftosaur | **5** | 4 | **5** | 0 | 0 | 0 | 0 | 0 | **5** | **5** | 0 | 2 | **5** | **KEEP** |
| workout-cool | 3 | **5** | 3 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 4 | PARTIAL |
| wger | 3 | **5** | 3 | 4 | 3 | 1 | 2 | 0 | 2 | 0 | 0 | 0 | 2 | PARTIAL |
| openGym | 3 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | **5** | 3 | 0 | 0 | 4 | PARTIAL |
| Workout Tracker | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | DROP |
| LiftLog | 4 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 0 | 2 | 3 | PARTIAL |
| Wingfit | 2 | 2 | 2 | 1 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 2 | REFERENCE |
| ExerciseDiary | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | REFERENCE |
| Flexify | 4 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 0 | 0 | 2 | PARTIAL |
| FastNFitness | 3 | 3 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | REFERENCE |
| OpenNutriTracker | 0 | 0 | 0 | **5** | **5** | 3 | 1 | 0 | 2 | 4 | 0 | 1 | 3 | **KEEP** |
| SparkyFitness | 2 | 2 | 2 | **5** | 4 | 3 | 3 | 0 | 2 | 0 | 0 | 2 | 4 | PARTIAL |
| Waistline | 0 | 0 | 0 | 4 | 4 | 3 | 2 | 0 | 3 | 4 | 0 | 0 | 2 | PARTIAL |
| Food You | 0 | 0 | 0 | 4 | 4 | 2 | 1 | 0 | 0 | 4 | 0 | 0 | 2 | REFERENCE |
| Mealie | 0 | 0 | 0 | 3 | 0 | **5** | **5** | **5** | 3 | 0 | 0 | 1 | 3 | **KEEP** |
| Tandoor Recipes | 0 | 0 | 0 | 3 | 0 | **5** | 4 | 4 | 2 | 0 | 0 | 0 | 2 | PARTIAL |
| Calories-In | 0 | 0 | 0 | 4 | 0 | 2 | **5** | 1 | 1 | 3 | 0 | 0 | **5** | PARTIAL |
| nutritrace | 0 | 0 | 0 | 4 | 4 | 2 | 2 | 1 | 4 | 3 | 0 | 0 | 3 | PARTIAL |
| PANTS | 0 | 0 | 0 | 3 | 0 | 3 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | REFERENCE |
| Fud AI | 1 | 1 | 0 | 3 | 3 | 1 | 1 | 0 | 1 | 2 | 0 | **5** | 2 | REFERENCE |

## Entscheidungscodes

- **KEEP** — sehr wertvolle Quelle, große Teile fachlich relevant.
- **PARTIAL** — einzelne Services/Modelle/UI-Patterns relevant.
- **REFERENCE** — nur Ideen/Architektur/UX vergleichen.
- **DROP** — nach Dokumentation aus der aktiven Source-Library entfernen.

## Kurzbegründung je Projekt

### KEEP

**Liftosaur** (TS/TSX, PWA + React Native, 1213 TS-Dateien).
Die mit Abstand wichtigste Trainings-Quelle. Löst exakt das schwerste RED-Fit-Problem:
ein aktives Workout, das Reload, App-Schließen und Screen-Lock überlebt. Der Trick ist
strukturell, nicht technisch — siehe `REPORT-WORKOUT.md`. Zusätzlich: IndexedDB-Schicht
mit Sharding, Valibot-Runtime-Validation (1:1 durch Zod ersetzbar), reine Funktionen für
die gesamte Workout-Logik.

**OpenNutriTracker** (Dart/Flutter, 556 Dateien).
Sauberste Umsetzung des 100-g-Nährwertmodells plus Barcode-Flow inklusive
Open-Food-Facts-Mapping. Dart ist nicht portierbar, aber Datenmodell, DTO-Mapping und
Scanner-Fallback-Verhalten sind 1:1 übertragbar.

**Mealie** (Python + Vue, 595 py / 203 vue).
Referenz für Wochen-Essensplan, Rezepte und — am wichtigsten — das Zusammenführen von
Einkaufslisten-Positionen (`merge_items`). Genau die Logik, die RED Fit für
"Reis 200 g + 300 g + 250 g → 750 g" braucht.

### PARTIAL

**workout-cool** — Prisma-Schema mit sehr guter Übungs-Taxonomie
(`Exercise`, `ExerciseAttribute`, `WorkoutSession`, `WorkoutSet`, `Program`/`ProgramWeek`/
`ProgramSession`). Next.js-Serverteil komplett irrelevant für RED Fit.

**wger** — reifste Übungs-Taxonomie überhaupt (Kategorie, Equipment, Muskel, Alias,
Übersetzung) und ein durchdachtes `Ingredient`-Modell mit Werten pro 100 g inkl.
`carbohydrates_sugar`, `fat_saturated`. Django-Architektur selbst unbrauchbar.

**openGym** — 60-zeiliger Service Worker und minimales Manifest. Genau die Größenordnung,
die RED Fit will: Media cache-first, Rest network-first mit Offline-Fallback, `/api/` nie
cachen. Bestes PWA-Vorbild im ganzen Bestand.

**LiftLog** — der `app/`-Teil ist React Native + TypeScript + Drizzle mit sauberer
Trennung `models/ services/ store/ db/`. Der C#-Backend-Teil (976 .cs) ist irrelevant.

**Flexify** — Drift-Schema (`GymSets`, `Plans`, `PlanExercises`) zeigt ein extrem schlankes
Set-Logging-Datenmodell; `restMs` direkt am Satz. Gutes Gegenmodell zu Liftosaurs Komplexität.

**SparkyFitness** — React/TS mit 1340 TS-Dateien; interessantes Goal-Timeline-Konzept
(`manage_goal_timeline`: Ziele gelten ab Datum statt global). Postgres-Bindung macht den
Rest unbrauchbar.

**Waistline** — Framework7/Cordova. Nährwertmodell und Offline-Verhalten relevant,
UI-Stack nicht.

**Tandoor** — Rezept-Parser und Zutaten-Skalierung; schwächer als Mealie bei Shopping.

**Calories-In** — reines React+TS, sehr gut portierbar. Meal-Plan-Editor mit Undo/Redo
und Varianten. Bestes UI-Vorbild für den Wochenplan-Editor.

**nutritrace** — Svelte-PWA mit Open-Food-Facts-Anbindung; kompakte API-Schicht in
`src/lib/api.js`.

### REFERENCE

**Wingfit** (Angular), **ExerciseDiary** (Go, nur Heatmap interessant),
**FastNFitness** (Java/Android, DAO-Struktur), **Food You** (Kotlin Multiplatform,
saubere Domain-Entities), **PANTS** (Django, `AbstractBaseNutrients` als Basisklasse),
**Fud AI** (Kotlin/Swift, OpenAI-kompatibler Client für Foto→Nährwerte — erst Phase 14).

### DROP

**Workout Tracker** (Go). Trotz 1.2k Sternen für RED Fit unbrauchbar: das Projekt trackt
Ausdauer-Aktivitäten mit GPX-Routen, Karten, Höhenprofilen und Segment-Matching. Es gibt
kein Satz-/Wiederholungs-/Gewichtsmodell. Nach dieser Dokumentation aus der aktiven
Source-Library entfernt.

## Wichtigste Erkenntnis

Kein einziges der 20 Projekte deckt RED Fits Anforderung ab. Die zwei stärksten
Trainings-Apps (Liftosaur, LiftLog) haben **keine** Ernährung; die zwei stärksten
Ernährungs-Apps (OpenNutriTracker, Mealie) haben **kein** Training. wger und
SparkyFitness decken beides ab, aber beide sind serverpflichtig und damit gegen RED Fits
Local-first-Prinzip.

RED Fit ist deshalb keine Portierung, sondern eine Neuimplementierung, die pro Fachbereich
die jeweils beste bekannte Lösung übernimmt.
