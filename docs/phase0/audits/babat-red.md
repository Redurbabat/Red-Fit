# BABAT-RED — Audit (eigenes Projekt)

## Identität
- Original: https://github.com/Redurbabat/BABAT-RED · eigenes Projekt → **frei nutzbar**
- Stack: React + TypeScript + Vite + Tailwind + Zod + Vitest (881 ts / 553 tsx)
- Analysierter Stand: `d45ecd9`

## App-Struktur (Vorbild für RED Fit)

```text
app/src/
├── app/            App-Einstieg
├── apps/           Fach-Module, je Domain ein Ordner
│   └── health/
│       ├── gym/           RedGym.tsx + components/ + services/ + data/
│       ├── fitness/       RedFitness.tsx + views/ + services/ + calculations/
│       │                  + models/ + persistence/ + validation/ + data/
│       └── ernaehrung/    RedErnaehrung.tsx + services/ + data/
├── components/     UI-Bausteine (standard/, red-os/, wow/, motion/)
├── core/           Kernel, Module-Definition, Consent
├── database/       schema.ts, store.ts, migrations.ts, backupEnvelope.ts,
│                   validate.ts, demoDaten.ts, demoModus.ts (+ Tests)
├── data/           statische Daten
├── hooks/          gemeinsame Hooks
├── registry/       moduleRegistry, navigationRegistry, spaceRegistry
├── settings/       Einstellungen
├── shared/ui       geteilte UI
└── utils/          Helfer (+ Tests)
```

Erkennbares Muster, das RED Fit übernimmt:
- **Ein Modul = ein Ordner** mit `views/` (UI), `services/` (Fachlogik als reine Funktionen),
  `calculations/` (Formeln), `models/` (Typen), `validation/` (Zod), `persistence/` (Sanitizing), `data/` (Kataloge).
- **Tests co-located**: jede Service-Datei hat `*.test.ts` daneben (Vitest).
- **Zentrale Datenbank-Schicht** in `database/` — kein Storage-Code in Komponenten.
- **UI-Sprache Deutsch, Code teils Deutsch** — RED Fit ändert das: Code Englisch, UI Deutsch.

## Was RED Fit konkret rettet

### Gym-Modul (`sources/own/babat-red/gym/`)
- **`uebungen.ts` — Übungskatalog**: deutsche Übungen mit je 4 Technik-Schritten,
  3 typischen Fehlern, 1 Profi-Tipp, Muskelgruppen, Equipment, Level.
  → wird RED Fits Basis-Übungsbibliothek (erfüllt Master-Prompt §34 mehr als vollständig).
- **`GymProgressionService.ts`**: `naechsteLast()` — Double-Progression mit 2,5-kg-Schritt:
  alle Sätze am Wdh-Ziel → Gewicht erhöhen, sonst Wiederholungen steigern. Mit Tests.
- **`GymService.ts`**: Volumenberechnung (Körpergewichtsübungen zählen mit Körpergewicht!),
  `bestwert()` (PR-Logik), `gymWochenStatistik()` (Einheiten/Sätze/Volumen pro Woche).
- **`trainingsplaene.ts`**: fertige deutsche Plan-Vorlagen.

### Fitness-Modul (`sources/own/babat-red/fitness/`)
- **`fitness.ts`**: komplettes Ernährungs-Domänenmodell — NutritionGoal, Ingredient,
  Recipe/RecipeIngredient, MealPlan (Template + Day + Slot + Entry), MealCompletionLog,
  GroceryList/GroceryListItem, PantryItem (+Transaktionen/Reservierungen),
  MealPrepSession, BodyMeasurement, DailyCheckin, TrainingPlan/Workout/Exercise.
  → RED Fits Datenmodell ist eine bereinigte, englischsprachige Teilmenge davon.
- **`FitnessMakroService.ts` / `FitnessMengenService.ts`**: Makro- und Mengenrechnung (mit Tests).
- **`FitnessEinkaufService.ts`**: Einkaufsliste aus Essensplan inkl. Aggregation (mit Tests).
- **`fitnessSchemas.ts`**: Zod-Validierung des gesamten Fitness-State.

### Database-Schicht (`sources/own/babat-red/database/`)
- **`backupEnvelope.ts`**: versioniertes Backup-Format (`format`, `formatVersion`, `app`,
  `version`, `exportiert`, `daten`), Erkennung von Legacy-Formaten, **Prototype-Pollution-Schutz**
  beim JSON-Import (`pruefeJsonBaum` weist `__proto__`-Schlüssel ab). → Vorbild für `RedFitBackup`.
- **`migrations.ts` / `validate.ts`**: Migrations- und Struktur-Prüf-Muster.

## Schwächen (bewusst NICHT übernehmen)
- Persistenz via localStorage-Monolith (`meinOrganizer_v4`) → RED Fit nutzt IndexedDB/Dexie
  mit getrennten Stores.
- Alles-App (Finance, Universe, Learning, …) → RED Fit bleibt fokussiert.
- Gemischte Code-Sprache (Deutsch/Englisch) → RED Fit: Code Englisch, UI Deutsch.
- Kein aktives-Workout-Resume über Reload → kommt aus dem Liftosaur-Muster.

## Bewertung (0–5)
Relevanz 5 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 3 · Offline 3 · Tests 5 ·
geringe Abhängigkeitslast 4 · Portierbarkeit 5

## Entscheidung: **KEEP** — wichtigste Einzelquelle neben Liftosaur.
