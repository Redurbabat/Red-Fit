# RED Fit 2031 — Migration

## Regeln (verbindlich)

1. Dexie-Migrationen sind **additiv und versioniert** (`this.version(n).stores({...})`).
2. Stores werden **nie** gedroppt, bevor eine vollständige Migration bewiesen ist.
3. Jede Migration mit Datenumbau bekommt eine Vorher/Nachher-Validierung
   (Zähler: Workouts, Sätze, Foods, Meals, Messungen, Pläne, Rezepte,
   Einkauf, Settings + Stichproben).
4. Backup-Format-Erweiterungen sind optional-additiv — ältere Backups bleiben
   importierbar (Import-Preview zeigt, was enthalten ist).

## Migrations-Historie

| DB-Version | Änderung | Datenumbau | Risiko |
|---|---|---|---|
| 1 | 14 Basis-Stores | – | – |
| 2 (Phase A) | + `recoveryLogs` (`id, date`) | keiner (neuer leerer Store) | keins |

## Routen-Migration (Phase A)

- Bottom-Nav: „Fortschritt" → „Körper" (`/body`)
- `/progress/body` → Redirect `/body/measurements` (kein gebrochener Deep-Link)
- `/progress` bleibt erreichbar (Körper → Trainings-Fortschritt)

## Feature-Inventar Phase A (§119)

| Bereich | Einstufung |
|---|---|
| Today, Training, Workout, Ernährung, Rezepte, Einkauf, Backup, Settings, 3D | KEEP |
| Fortschritt-Tab | MOVE → Körper (`/progress` Seite bleibt, Tab entfällt) |
| Körperwerte-Seite (`/progress/body`) | MOVE → `/body/measurements` |
| Recovery/Readiness, Quick Log, Coach-Insights | NEU (Phase A) |
| entfernt | nichts — kein Feature verloren |

## Geplante Migrationen (Phase C)

- v3: + `goals`, `mediaAssets`, `progressPhotos` (alle additiv, leer startend)
- FoodItem-Provenance: optionale Felder, kein Umbau bestehender Rows
- Workout-Normalisierung: **bewusst nicht geplant** — Begründung in
  `DATA_MODEL_V2.md` (atomare Autosaves schlagen Satz-Tabelle bei Priorität
  „kein Datenverlust"); Neubewertung bei echtem Bedarf
