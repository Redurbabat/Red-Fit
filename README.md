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
Native-Builds und Installer sind noch nicht verifiziert. Die optionale
Energie-/Makro-Schätzung ist integriert. **789 wger-Übungen** inklusive
individueller Autor-/Lizenzangabe sind jetzt als lokaler, offlinefähiger
Katalog enthalten. Der Import ist ausschließlich nach Vorschau und
ausdrücklicher Bestätigung möglich; andere Übungen bleiben erhalten.
Siehe [Integrationsplan](docs/INTEGRATION-ROADMAP.md) und
[Plattform-Build-Anleitung](docs/PLATFORM-BUILDS.md).

## Integrationsstand des Feature-Branches (November 2026)

- **openGym**: Aufwärmsatz-Vorschläge und Supersatz-Gruppen im Planeditor,
  automatischer Wechsel im aktiven Workout und Gruppenpause nach einer Runde.
- **Dietry**: Kalorienbedarf-/Makro-Rechner, Kennzeichnung geschätzter
  Essensmengen und **optionale Roh-/Gekocht-Umrechnung** für Reis, Nudeln
  und weitere Zutaten. Das tatsächlich gekochte Gewicht und der Faktor
  bleiben im Tagebuch erhalten; bestehende Rohdaten unverändert.
  [Umrechnung und Grenzen](docs/DIETRY-COOKED-WEIGHT.md).
  Mahlzeiteneinträge und Rezepte werden jetzt **atomar** gespeichert, damit
  parallele Speichervorgänge keine anderen Einträge überschreiben. Auch
  gekochte Mengen bleiben bei späteren Änderungen konsistent.
  [Datenintegrität](docs/MEAL-LOG-INTEGRITY.md).
- **wger**: 789 geprüfte und individuell attribuierte Übungen sind als
  **mitgelieferter Offline-Katalog** über Training → Übungen → wger-Katalog
  verfügbar. Die Datenbank wird erst nach Vorschau und ausdrücklicher
  Bestätigung verändert. Ein eigener JSON-Import bleibt möglich.
  [Importanleitung](docs/WGER-IMPORT.md) ·
  [Autoren- und Lizenznachweise](docs/WGER-CATALOG-ATTRIBUTION.md).
- **Windows**: responsive Sidebar ab Desktop-Breite; Tauri-Rust-Projektgerüst.
- **iPhone**: gemeinsame Oberfläche und Capacitor-Konfiguration.

Der neue Code ist in einem Draft-Pull-Request. GitHub Actions konnte zuletzt
keinen Runner starten; die Implementierung gilt daher **nicht als Build-verifiziert**.
Native App-Binaries und ein vollständiger Merge aller drei Originalprojekte
sind noch nicht vorhanden. Quell-/Lizenzstatus:
[Status](docs/SOURCE-ARCHIVE-STATUS.md).

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

## Native Abhängigkeiten reproduzierbar vorbereiten

Im Integrations-Branch steht jetzt ein versionsfestes Werkzeug für
**Capacitor 8 (iPhone) und Tauri 2 (Windows)** bereit. Vor dem ersten
nativen Build ist auf einem Rechner mit Registry-Zugriff auszuführen:

```bash
npm run native:plan
npm run native:bootstrap
npm run native:check
npm ci
```

`native:bootstrap` trägt die nativen CLI-Pakete einschließlich der passenden
Lockfile-Einträge ein. Beide npm-Manifeste müssen anschließend gemeinsam
committed werden. Bei einem npm-Fehler setzt das Tool die Manifestdateien
zurück. [Native Bootstrap-Anleitung](docs/NATIVE-DEPENDENCY-BOOTSTRAP.md).
In der aktuellen Ausführungsumgebung ist die npm-Registry nicht erreichbar;
ein echter iOS-/Windows-Build ist damit **noch nicht nachgewiesen**.

## Prüfen ohne GitHub-Actions-Runner

Der GitHub-Actions-Runner wird derzeit nicht zugewiesen; dasselbe Problem
bestand schon auf `main` im August 2026. Alle fünf App-Prüfschritte lassen
sich auf Windows oder macOS direkt im lokalen Checkout ausführen:

```bash
node tools/verify-local.mjs
```

Das Ergebnis steht in `artifacts/verify-local.json`. Zum Prüfen des
Ablaufs ohne installierte Abhängigkeiten:

```bash
node --test tools/verify-local.selftest.mjs
```

Detaillierte Diagnose und Hinweise: [CI-Wiederherstellung](docs/CI-RECOVERY.md).
Die Selbsttests des Prüfscripts ersetzen **keinen** erfolgreichen App-Build.

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

Alle Daten liegen in IndexedDB (`red-fit`, 17 Stores: exercises, workoutPlans,
workoutLogs, foodItems, mealLogs, nutritionGoals, waterLogs, bodyMeasurements,
shoppingLists, mealPlans, recipes, userProfiles, recoveryLogs, mediaAssets,
progressPhotos, settings, metadata).
Ein aktives Workout ist ein persistenter Datensatz (`status: "active"`) mit
Autosave — Reload oder App-Schließen verliert nie Daten. Der Pausentimer läuft
über absolute Zeitstempel (`restEndsAt`) und übersteht Backgrounding.

## Backup

`Mehr → Backup & Import`: Standardexport `red-fit-backup-YYYY-MM-DD.json`
für Trainings-, Ernährungs-, Körper- und Recovery-Daten. Er ist Zod-validiert
und wird mit Vorschau sowie Merge-Strategie importiert. **Fortschrittsfotos
sind ausdrücklich nicht enthalten**, da sie als private Medien gelten.

Für den manuellen iPhone-↔-Windows-Transfer gibt es einen separaten,
freiwilligen Foto-Export/Import (`red-fit-photos-YYYY-MM-DD.json`) mit
Metadatenprüfung, atomarer Speicherung und ohne Cloud-Upload. **Die
Foto-Datei ist unverschlüsselt** und muss vertraulich aufbewahrt werden.
Grenzen und Anleitung: [Foto-Transfer](docs/PHOTO-TRANSFER.md).

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
