# RED Fit

**Training und Ernährung in einer App.**

RED Fit ist eine eigenständige, mobile-first Progressive Web App fürs iPhone:
Trainingspläne, Workout-Logging mit Pausentimer, Übungsbibliothek mit animierten
Bewegungsfiguren, Ernährungstracking (Nährwerte pro 100 g), Wasser, Körperwerte,
Fortschritt, Wochen-Essensplan, Einkaufsliste und Backup — alles lokal auf dem
Gerät (IndexedDB), offline-fähig, ohne Konto und ohne Backend.

## Plattformen

RED Fit bleibt eine lauffähige PWA. Auf dem Branch zur Mehrplattform-Integration
sind ein **iPhone-Capacitor-Gerüst** und ein **Windows-Tauri-Gerüst** angelegt;
Native-Builds und Installer sind noch nicht verifiziert. Die erste neue
fachliche Integration ist die optionale Energie-/Makro-Schätzung in den
Einstellungen; ein Lizenz-/Herkunfts-geprüfter wger-Übungsadapter liefert
Vorschauen, importiert aber ohne Freigabe keine fremden Übungsdaten.
Siehe [Integrationsplan](docs/INTEGRATION-ROADMAP.md) und
[Plattform-Build-Anleitung](docs/PLATFORM-BUILDS.md).

## Voraussetzungen

- Node.js ≥ 20
- npm ≥ 10

## Installation & Entwicklung

```bash
npm install
npm run dev        # Dev-Server (Vite)
npm run build      # Produktions-Build (tsc + vite build)
npm run preview    # gebaute App lokal testen
npm run typecheck  # TypeScript strict
npm run lint       # ESLint
npm run test       # Vitest (Berechnungen, Backup-Validierung)
```

## Architektur

React 19 · TypeScript (strict) · Vite · React Router 7 · **Dexie/IndexedDB** ·
Zod · Lucide · CSS mit Design-Tokens · vite-plugin-pwa · Vitest.
Details: `ARCHITEKTUR.md`, verbindliche Regeln: `CLAUDE.md`,
Datenmodell: `docs/phase0/FINAL-DATA-MODEL.md`.

```text
src/
├─ app/        AppShell, Routen, Provider
├─ components/ ui/ (Buttons, Cards, Stepper …), layout/, feedback/, exercise/
├─ features/   today, training (plans/exercises/workout), nutrition
│              (foods/meals/scan/meal-plan), progress, shopping, recipes,
│              onboarding, backup, settings, more
├─ models/     TS-Typen + Zod-Schemas
├─ services/   storage/ (Dexie + Repositories), calculations/, workout/,
│              backup/, barcode/, pwa/, demoData/, planning/
├─ hooks/      useActiveWorkout, useRestTimer, useSettings
├─ utils/      dates (lokale Tages-Keys!), numbers, labels, ids
└─ styles/     tokens.css (Nocturne), base, components, mobile
```

## Lokale Speicherung

Alle Daten liegen in IndexedDB (`red-fit`, 14 Stores: exercises, workoutPlans,
workoutLogs, foodItems, mealLogs, nutritionGoals, waterLogs, bodyMeasurements,
shoppingLists, mealPlans, recipes, userProfiles, settings, metadata).
Ein aktives Workout ist ein persistenter Datensatz (`status: "active"`) mit
Autosave — Reload oder App-Schließen verliert nie Daten. Der Pausentimer läuft
über absolute Zeitstempel (`restEndsAt`) und übersteht Backgrounding.

## Backup

`Mehr → Backup & Import`: Export als `red-fit-backup-YYYY-MM-DD.json`
(alle Stores, versioniertes Format). Import mit Runtime-Validierung (Zod),
Schutz vor manipulierten Dateien, Vorschau und Merge-Strategie — bestehende
Daten werden nie ungefragt gelöscht.

## PWA / iPhone

Manifest + Service Worker (Precache der App-Shell, Update nur nach Bestätigung).
Nach dem ersten Laden funktioniert die Kern-App offline. Installation:
RED Fit in Safari öffnen → Teilen → „Zum Home-Bildschirm“ → „Hinzufügen“.

## 3D-Modelle (Blender)

Eigene Übungs-Animationen als GLB werden automatisch geladen: Datei nach
`public/models/<übungs-id>.glb` legen (z. B. `seed-ch1.glb` für Bankdrücken —
die IDs stehen in `src/services/demoData/exerciseCatalog.ts`). Vorgaben:
Figur ~1,75 m, Ursprung an den Füßen, eine gebackene Loop-Animation (ideal
mit dem Namen „exercise"). Fehlt die Datei, zeigt die App automatisch den
eingebauten prozeduralen 3D-Coach.

Optional steuert ein Manifest `public/models/manifest.json` die Zuordnung
(andere Dateinamen, Clip-Name, Kamera-Preset), Zod-validiert:

```json
{
  "version": 1,
  "assets": [
    { "exerciseId": "seed-ch1", "modelUrl": "/models/bench-v2.glb",
      "animationClip": "exercise", "cameraPreset": "side" }
  ]
}
```

## E2E-Smoke-Test

```bash
npm run dev          # Terminal 1
npm run test:e2e     # Terminal 2 (braucht Chrome; sonst CHROME_PATH setzen)
```

Prüft die kritischen Flows im echten Browser: Onboarding → Workout →
Satz loggen → Reload ohne Datenverlust → Resume-Banner → 80 g = 296 kcal.

## Bekannte Einschränkungen

- Barcode-Kamera-Scan nur in Browsern mit `BarcodeDetector` (manuelle Eingabe
  funktioniert immer); die optionale Open-Food-Facts-Suche braucht Internet —
  offline bleibt die manuelle Anlage der Weg.
- 3D-Coach: eingebaute prozedurale Figur für alle Übungstypen; eigene
  Blender-GLBs werden automatisch geladen (Abschnitt „3D-Modelle“), der
  Feinschliff einzelner Animationen folgt mit den echten Modellen.
- KI-Coach ist bewusst nur als „Später“-Eintrag sichtbar — keine Fake-Funktion.

## Projekt-Dokumentation

- `AUFGABEN.md` — Phasenplan und Checklisten
- `docs/phase0/` — Quellenanalyse (20 Projekte), Berichte, finale Entscheidungen
- `sources/own/babat-red/` — eigener Code als Portierungsbasis
