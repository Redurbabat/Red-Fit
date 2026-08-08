# Kleine Nutrition-Projekte — Sammel-Audit

## SparkyFitness — **PARTIAL** (kein Extrakt)
- https://github.com/CodeWithCJ/SparkyFitness · MIT-artig · React/TS + Node + Postgres (1340 ts)
- MyFitnessPal-Alternative, deckt Training UND Ernährung ab — aber komplett serverzentriert
  (Postgres-Funktionen als Fachlogik, `db_schema_backup.sql` mit 2000+ Zeilen).
- Wertvolle Idee: **Goal-Timeline** (`manage_goal_timeline`) — Ernährungsziele gelten ab
  Datum statt global; historische Tage behalten ihr damaliges Ziel. Für RED Fits
  `NutritionGoal` als spätere Erweiterung notiert.
- Frontend-Komponenten zu eng an deren API gebunden.

## Waistline — **PARTIAL** (kein Extrakt)
- https://github.com/davidhealey/waistline · GPL-3.0 · Framework7/Cordova, JS (487 js)
- Reifer Kalorienzähler mit OFF- und USDA-Anbindung, komplett offline-fähig (lokale DB).
- Nährwert-Vokabular (welche Nutriments eine Food-App wirklich braucht) und
  Diary-Gruppierung als Referenz. Framework7-Code selbst nicht portierbar.

## Food You — **REFERENCE**
- https://github.com/maksimowiczm/FoodYou · GPL-3.0 · Kotlin Multiplatform (600 kt), Room
- Vorbildliche Domain-Schicht: `goals/domain/entity/DailyGoal`, `MacronutrientGoal`,
  `WeeklyGoals` — sauber getrennte UseCases. Nur Architektur-Referenz (Kotlin).

## nutritrace — **PARTIAL** (kein Extrakt)
- https://github.com/TraceApps/nutritrace · AGPL-3.0 · Svelte + Vite + Capacitor, PWA
- Kompakte OFF-API-Schicht (`src/lib/api.js`), Ein-Container-Deployment.
  PWA-Setup als zweites Beispiel neben openGym. Svelte-Code nicht direkt portierbar.

## PANTS — **REFERENCE**
- https://github.com/dylanleigh/PriceAndNutritionTrackingSystem · Apache-2.0 · Django
- Eine gute Idee: `AbstractBaseNutrients` als gemeinsame Basisklasse für Ingredient,
  Recipe und DiaryFood — alle Nährwert-tragenden Entities teilen dieselben Felder.
  Zusätzlich einziges Projekt mit Preis-pro-Nährstoff-Tracking (für RED Fit irrelevant).

## Fud AI — **REFERENCE** (Phase 14)
- https://github.com/apoorvdarshan/fud-ai · MIT · Kotlin (Android) + Swift (iOS) + Web
- Relevanter Kern: `services/ai/OpenAICompatibleClient.kt`, `OpenAIResponseParser` (+Tests),
  `AiError`-Modellierung — Foto→Nährwerte über OpenAI-kompatible API.
- 163 MB entpackt, davon 1781 JPGs (Assets) — fast alles Ballast.
- MIT → wenn Phase 14 kommt, Parser-/Prompt-Struktur als Vorlage verwenden.
