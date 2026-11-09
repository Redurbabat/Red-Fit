# ARCHITEKTUR.md — RED Fit

> **NEUER ARCHITEKTURVORRANG 09.11.2026:** Das originale openGym-Frontend + bereits vorhandene Node-API + iOS-Capacitor-App in `vendor/opengym-upstream/` werden als **RED Fit** weiterentwickelt. Das folgende Root-`src/`/Dexie/PWA-Architekturdokument ist **Legacy-Referenz**, keine Vorgabe, einen zweiten Core zu bauen. Priorität 1 ist die iPhone-App. [Details](docs/OPEN-GYM-IS-RED-FIT.md).

> **Neue priorisierte Produktentscheidung (08.11.2026):** Der Eigentümer will openGym **1:1 als Codebasis** übernehmen und RED Fit von dort weiterentwickeln. Die bisherige React/TypeScript-/Dexie-PWA bleibt **vorübergehend** als laufender Bestand erhalten; die folgenden Regeln beschreiben ihren bisherigen Zustand, nicht die endgültige Architektur nach openGym-Übernahme. Der neue Ausgangspunkt enthält ein React/Vite-Frontend und eine separate Node-API (Auth/Sync). Die staged Quellen stehen unter `vendor/opengym-upstream/`; Details und Medienrechte in `docs/OPENGYM-BASELINE.md`. Keine Umstellung des aktiven Entrypoints oder Abkündigung der alten IndexedDB-Daten vor Build-, Privacy-, API- und Migrationstests.

## Status

Phase 0 (Quellenanalyse) ist abgeschlossen — Ergebnisse in `docs/phase0/`.
Diese Architektur ist verbindlich für die Implementierung.

## Produkt

RED Fit — Training und Ernährung in einer App. Gemeinsamer React/TypeScript-Core
mit PWA sowie geplanten installierbaren Shells für iPhone (Capacitor) und Windows
(Tauri 2). Local-first, kein Konto, kein Backend, vollständig im Besitz des
Projektinhabers — kein fremder Code wird eingebunden oder verlinkt.

## Zielstack (fixiert)

```text
TypeScript (strict)     gesamte Logik
React                   UI (TSX)
Vite                    Build
React Router            Navigation
Dexie + IndexedDB       persistente Source of Truth
Zod                     Validierung (Import-/Backup-Grenzen, Formulare)
Lucide React            Icons
CSS + CSS-Variablen     Styling (kein UI-Framework, kein Tailwind)
vite-plugin-pwa         Manifest + Service Worker (Prompt-Update)
Vitest                  Unit-Tests (Berechnungen, Backup-Validierung)
playwright-core         E2E-Smoke (tools/e2e-smoke.mjs, npm run test:e2e)
Three.js / R3F          3D-Übungs-Coach (lazy Chunk; GLB-Loader + prozeduraler Fallback)
```

Bewusst NICHT: Redux/MobX, Material/Chakra/Bootstrap, schwere Chart-Libs (Charts als
SVG/CSS), Backend-SDKs, getrennte native Neuimplementierungen der Fachlogik.
Capacitor-/Tauri-Shells sind ausdrücklich erlaubt; Status und Build-Grenzen:
`docs/PLATFORM-BUILDS.md`.

## Architekturprinzipien

1. Local-first: IndexedDB ist die einzige Source of Truth; Netz ist optional.
2. Kein Datenverlust: Reload, App-Schließen, SW-Update, fehlgeschlagener Import —
   nichts davon darf Daten zerstören.
3. Ein aktives Workout ist ein **persistenter Datensatz** (`status: "active"`),
   kein React-State (Liftosaur-Erkenntnis).
4. Zeit immer über absolute Timestamps (`restEndsAt`, `startedAt`) — nie Countdown-State.
5. Nährwerte pro 100 g als einzige Wahrheit; Portionswerte sind Ableitungen.
6. Meal-Entries speichern Snapshots (Name + berechnete Werte).
7. Fachlogik als reine Funktionen außerhalb der UI, Tests co-located
   (BABAT-RED-Muster: `*.test.ts` neben jeder Service-Datei).
8. Storage nur über Repository-Schicht — kein Dexie-Aufruf in Komponenten.
9. Versionierte DB + versioniertes Backup-Format; Migrationen additiv, nie löschend.
10. Mobile-first (iPhone ~428 px), Safe Areas, Touch-Ziele ≥ 44 px, Inputs ≥ 16 px.
11. Barcode immer mit manuellem Fallback; 3D immer mit Text-Fallback; KI nie Voraussetzung.
12. Code Englisch, UI Deutsch (Label-Mapper für Enums).

## App-Struktur

Abgeleitet aus der analysierten Struktur des eigenen Projekts
**BABAT-RED** (`app/src/` mit `apps/<domain>/<modul>/{views,services,calculations,models,
validation,persistence,data}`, zentraler `database/`-Schicht, `registry/`, co-located Tests
— Audit: `docs/phase0/audits/babat-red.md`), bereinigt auf eine Ein-Produkt-App:

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ AppShell.tsx          Scroll-Container, Header, Layer (Toast/Modal/Sheet)
│  ├─ routes.tsx            Routenbaum (docs/phase0/FINAL-ROUTES.md)
│  └─ providers.tsx
│
├─ components/
│  ├─ ui/                   Card, Buttons, Inputs, SegmentedControl, Chip,
│  │                        ProgressBar, MacroBar, Tabs, ListRow, ConfirmDialog
│  ├─ layout/               BottomNav, PageHeader, SectionHeader
│  └─ feedback/             Toast, Modal, BottomSheet, EmptyState, LoadingState,
│                           ErrorState, ErrorBoundary
│
├─ features/                ein Ordner je Fachbereich (BABAT-RED-Muster)
│  ├─ today/
│  ├─ training/             plans/, exercises/, workout/ (Workout-Modus!)
│  ├─ nutrition/            foods/, meals/, scan/, meal-plan/
│  ├─ progress/             body/
│  ├─ shopping/
│  ├─ onboarding/
│  ├─ backup/
│  ├─ settings/
│  └─ more/
│
├─ models/                  TS-Typen + Zod-Schemas (FINAL-DATA-MODEL.md)
│  ├─ exercise.ts  workout.ts  nutrition.ts  progress.ts
│  ├─ planning.ts  profile.ts  settings.ts  backup.ts
│
├─ services/
│  ├─ storage/              database.ts (Dexie, 14 Stores) + 13 Repositories
│  ├─ calculations/         nutrition.ts, workout.ts, progress.ts — reine Funktionen + Tests
│  ├─ backup/               export.ts, import.ts (Envelope, Zod, __proto__-Schutz, Merge)
│  ├─ barcode/              BarcodeService (isSupported/scan, BarcodeDetector + Fallback)
│  ├─ pwa/                  Update-Prompt-Handling
│  └─ demoData/             Seed (Basis-Übungen aus BABAT-RED-Katalog, Demo-Logs getrennt)
│
├─ hooks/                   useActiveWorkout, useTodayNutrition, useFoodSearch,
│                           useWorkoutPlans, useExercises, useSettings, useToast, …
├─ utils/                   dates.ts (getLocalDateKey!), numbers.ts, ids.ts
├─ styles/                  tokens.css (Nocturne), base.css, components.css, mobile.css
└─ main.tsx

public/
├─ manifest.webmanifest
├─ icons/                   192, 512, maskable, apple-touch-icon
└─ placeholder-3d/
```

## Datenmodell & Storage

Verbindlich in `docs/phase0/FINAL-DATA-MODEL.md`:
- 14 Dexie-Stores (exercises, workoutPlans, workoutLogs, foodItems, mealLogs,
  nutritionGoals, waterLogs, bodyMeasurements, shoppingLists, mealPlans, recipes,
  userProfiles, settings, metadata) mit Indizes auf date/status/barcode/name/category.
- `DB_NAME = "red-fit"`, `DB_VERSION = 1`, Migrationen über Dexie-Versionen.
- Backup-Envelope `red-fit-backup` v1 (Muster: eigener BABAT-RED `backupEnvelope.ts`
  inkl. Prototype-Pollution-Schutz beim Import).

## Aktives Workout (kritischster Mechanismus)

```text
Start           → WorkoutLog { status:"active", startedAt } sofort in IndexedDB
jede Änderung   → Autosave (Gewicht, Reps, RPE, Satz fertig, Übungswechsel, Notiz, Pause)
Satz fertig     → completed:true, completedAt, restEndsAt = now + restSeconds
Anzeige Timer   → restEndsAt − Date.now(), Neuberechnung bei visibilitychange
App-Neustart    → status==="active" gefunden → Banner: Fortsetzen / Beenden / Verwerfen
Abschluss       → status:"completed", endedAt, durationSeconds → Summary
```

## Design

Richtung "Nocturne": Dark-first, near-black `#0f1012`, dunkle Cards, Akzent Rot/Orange
(`#ef4444`/`#f97316`), Makro-Farben (Protein blau, Carbs orange, Fett violett, Wasser cyan).
Vollständige Token-Palette, Typografie und Animationszeiten: Master-Prompt §§7–14
(in `CLAUDE.md` referenziert). Bottom Nav (2031): Heute · Training · Ernährung · Körper · Mehr —
„Fortschritt" ist im Körper-Tab aufgegangen (`/progress` bleibt als Trainings-Analytics-Seite,
`/progress/body` leitet auf `/body/measurements` um). Details: `docs/2031/INFORMATION_ARCHITECTURE.md`.

## Quellen-Herkunft

Alle Architekturentscheidungen sind aus der Analyse von 20 Open-Source-Projekten +
BABAT-RED abgeleitet und begründet:
- `docs/phase0/SOURCE-MATRIX.md` — Bewertung aller Quellen
- `docs/phase0/REPORT-*.md` — Muster je Fachbereich
- `docs/phase0/FINAL-SOURCE-SELECTION.md` — Gewinner je Funktion
- `sources/own/babat-red/` — eigener Code als Portierungsbasis

Fremder Code wird nicht übernommen; AGPL-/GPL-Quellen dienten ausschließlich als
Konzept-Referenz. RED Fit gehört vollständig dem Projektinhaber.
