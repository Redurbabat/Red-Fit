# Agent 05 — Original-openGym QA / Windows / Android

Stand: 2026-11-09. Priorität: **iPhone zuerst**, Agent 04 besitzt die iOS-Shell und die Capacitor-/npm-Konfiguration. Dieses Dokument betrifft **die originale openGym-Laufzeit** unter `vendor/opengym-upstream/`, **nicht** die alte RED-Fit-PWA im Repository-Root.

## Reproduzierbare QA für die tatsächliche App

```bash
# Im Root des Red-Fit-Checkouts, Node.js 22 und npm:
node --test tools/opengym-qa/verify.test.mjs
node tools/opengym-qa/verify.mjs

# Nur wenn dependencies in vendor/opengym-upstream/frontend bereits korrekt installiert sind:
node tools/opengym-qa/verify.mjs --skip-install
```

Der Runner überprüft `vendor/opengym-upstream/frontend/package.json` auf `name: opengym-frontend` und das originale Lockfile, bevor er im **Original-Frontend-CWD** nacheinander `npm ci --ignore-scripts --no-audit --no-fund`, `npm run test`, den normalen `npm run build` und zusätzlich `VITE_MOBILE=1 npm run build` ausführt. Die neue mobile Stufe prüft ausschliesslich das erzeugte `frontend/dist/` auf den `opengym-flavor=mobile`-Marker, vorhandene referenzierte JS/CSS-Dateien und einen ggf. vorhandenen, korrekt gestempelten Service Worker. Sie führt **kein** `cap sync` und keine native iOS-/Android-Änderung aus; der vollständige Original-Befehl `npm run build:mobile` bleibt Agent 04 vorbehalten. Er protokolliert Status, Exit-Code, Dauer und Log-Pfade in `artifacts/opengym-qa/report.json`; vollständige Ausgaben stehen getrennt in `install.log`, `test.log`, `build.log`, `mobile-web-build.log`. Bei fehlgeschlagenem Install werden abhängige Schritte als übersprungen ausgewiesen; ein fehlgeschlagener Test verhindert den unabhängigen Build nicht. Der Ordner `artifacts/` wird durch die Root-`.gitignore` ignoriert. Keine Nutzerdaten oder Umgebungsvariablen werden absichtlich in den JSON-Report geschrieben; npm-Prozesslogs vor Weitergabe auf Secrets prüfen.

`.github/workflows/opengym-original-qa.yml` führt denselben Pfad bei relevanten PR-Änderungen oder **manuellem Workflow-Dispatch** aus, hält Artefakte sieben Tage vor und enthält **keinen Deploy**. Das originale `vendor/opengym-upstream/.github/workflows/test.yml` ist eine Referenz und wird an seinem geschachtelten Ort nicht als Root-GitHub-Action ausgeführt. Es definiert u. a. Vitest mit V8-Coverage/JUnit, Vite-Build, Bundle-Size, Locales, Garmin-Check und separate API/Android-Jobs. Die neue, bewusst kleine Gate-Suite ersetzt die Original-Release-Gates nicht.

### Ist-Stand und echte CI-Diagnose

- Am 09.11.2026 via verbundenem GitHub überprüft: `Redurbabat/Red-Fit` hat `visibility: private`.
- Root-`.github/workflows/ci.yml` prüft **das Legacy-Root-`package.json`**, nicht die Original-openGym-App; grüne Root-CI allein wäre daher kein Nachweis für openGym.
- GitHub-Actions-Run **42699825846** auf `main` (09.11.2026 21:09 UTC) steht auf **failure**. Beide Jobs `verify` und `offline-regressions` wurden mit **keinen abrufbaren Schritten** gemeldet. Der Abruf von Job-Logs lieferte 404 BlobNotFound. Folglich ist weder ein npm-/TypeScript-/Vite-Fehler noch die genaue Runner-/Abrechnungsursache aus diesem Run bewiesen. Siehe `docs/CI-RECOVERY.md`.
- Am 09.11.2026 **lokal ausgeführt** auf Linux/Node v22.16.0: `node --check` für beide neuen QA-Skripte und `node --test tools/opengym-qa/verify.test.mjs` mit **4/4 erfolgreichen Fixture-Tests**. Dabei liefen **absichtlich gefälschte npm-Prozesse**, die Aufrufort, Sequenz, Erfolgs-/Fehler- und Skip-Reporting prüfen. **Kein echtes `npm ci`, keine Original-Vitest-Suite, kein Original-Vite-Build oder native Paketierung** wurde in dieser Umgebung bestätigt. Die volle private Quellbasis war hier nur über den GitHub-Dateizugriff, nicht als lokaler Checkout verfügbar.

### Bekannte Versionen / Voraussetzungen (Original-Code)

| Baustein | Im Originalstand |
| --- | --- |
| Frontend | `opengym-frontend@1.4.4`, React `^19.3.1` |
| Node | Original-Workflow: 22; lokal QA-Tests auf 22.16.0 |
| Vite | `^8.3.4` in `frontend/package.json` (konkrete Lockfile-Version ist beim `npm ci` zu verwenden) |
| Vitest | `^4.1.12` (ebenso über Lockfile) |
| Capacitor Core/CLI/iOS/Android | `^8.5.3` |
| Original Node-API | `api/package.json`: `gym-api@1.4.4`; separates `npm ci` / `npm test` für späteren API-Nachweis |
| iOS | Originalprojekt `frontend/ios/App/` vorhanden; `vite.config.js` nennt Safari/iOS 15.5 als WebView-Ziel; Xcode/macOS/Signierung für IPA erforderlich |
| Android | Originalprojekt `frontend/android/` vorhanden; minSdk 24, compile-/targetSdk 36; sideload/play/fdroid-Flavors in Gradle |

Beobachtete originale Testbereiche: `frontend/src/lib/*.test.js` (u. a. API, Backup, Health, Offline, Sync, Workout) und umfangreiche `frontend/src/sheets*.test.jsx`/App-Interaktionstests; `frontend/scripts/*.test.mjs`; `api/test/*.test.js`; Android-Test-/Native-Verzeichnisse. **Testanzahl, Coverage-Quote und E2E-Geräteerfolg noch nicht als ausgeführt gemessen.**

### Privatsphäre / Veröffentlichung

Der GitHub-Repositorystatus ist **privat**. Root-`.github/workflows/cloudflare-deploy.yml` hat ausschliesslich `workflow_dispatch` und kann damit über GitHub nicht durch einen normalen Push automatisch Cloudflare deployen. **Andere Cloudflare-Dashboard-/extern konfigurierte Build-Trigger sind nicht einsehbar und wurden nicht geprüft.** Vor jeder Veröffentlichung gesonderte Freigabe einholen. Original-`LICENSE`, `NOTICE.md` und die Rechte an Gym-visual-Medien nicht entfernen; privat bedeutet nicht lizenzfrei.

## Windows-Desktop: Entwurf mit offenen Kompatibilitäts-Gates

**Keinen zweiten Core bauen und Root-`src-tauri/` nicht als openGym-Installer ausgeben.** Die Original-App verwendet React/Vite, aber auch einen separaten Node-API-Server (`api/server.js`), Auth/Pairing und Sync. `frontend/src/lib/api.js` trennt `MOBILE`-Pairing von browserbasierten Same-Origin-Cookies. Ein WebView allein liefert noch keinen lauffähigen Offline-/Sync-/Login-Desktop.

1. **Nach iPhone-Erfolg:** originales `frontend/dist` unter Windows in einer einzigen Shell laden (Tauri 2 **erst** nach Nachweis von API-/Node-Betrieb, WebView2, Cookies, Deep Links, Datei-/Medienzugriff und lokalen Auth-Modi). Alternativ eine Node-fähige Desktop-Shell technisch gegen dieselben Akzeptanztests vergleichen. Keine Runtime-Wahl anhand des alten Root-Tauri-Gerüsts vorwegnehmen.
2. **Persistenz:** tatsächliche originale Storage-, Auth- und Medienpfade messen; Datenverzeichnis, Schlüsselverwaltung, Backup-JSON/ZIP und Upgrade-Rollback festlegen. Bestehendes `frontend/src/lib/backup-media.js` bietet Medien-ZIP, seine Import-/Exportregeln nicht durch eine neue Desktop-Datenbank ersetzen. Vor Installer-Updates mit echten Benutzerfixtures Backup → Update → Restore → Workout-Resume testen.
3. **Windows-Eingaben:** Resize, Maus, Tastatur, Tab-/Fokus-Reihenfolge, Shortcuts, High Contrast, 125–200 % Skalierung; direkte UI und alle Dialoge auf derselben Original-App testen. Keine dekorativen Glass-Layer über Eingabefeldern.
4. **Verteilung:** MSI/NSIS oder anderes Paket erst nach erfolgreichem Windows-Build und signierter Upgrade-Strategie auswählen. Keine Installer-Datei und keine Windows-Kompatibilität derzeit nachgewiesen.

## Android: nachrangig, vorhandenen Originalcode erhalten

- `frontend/android/app/build.gradle` verwendet noch `applicationId ch.duartesantos.opengym`, Debug-Suffix `.test` sowie sideload/play/fdroid-Flavors; App-Name und ID dürfen erst koordiniert mit Agent 04 final umbenannt werden. Datenmigration bei geänderter ID beachten.
- `AndroidManifest.xml` enthält `opengym.ch`-Links und `opengym`-URL-Scheme. Diese nicht blind durch RED-Fit-Domains ersetzen. NFC/Verified Links, Health Connect, Wear OS, Barcode/ML Kit und App-Backups auf echtem Android prüfen; alte Identifier sind nicht automatisch ein Sicherheitsproblem, sondern Integrationsverträge.
- Mobil-Build ist **nicht** `npm run build`, sondern Original-`npm run build:mobile` (`VITE_MOBILE=1`, Medien-Staging, Capacitor-Sync und `check-mobile-bundle.mjs`). Die iOS-/Android-Sync-Schritte liegen ausserhalb dieses QA-Runners, damit Agent 04 nicht blockiert oder übersteuert wird.
- Erst nach iPhone-Abnahme: Android-Gradle/SDK/JDK-Versionen, API-Fallbacks, App-Lifecycle, Workouts im Hintergrund, Offline-Neustart, lokale Sicherung und APK auf Gerät testen.

## Branch-Konfliktmatrix / nächste Gates

| Agent | Potenzieller Kontaktpunkt | Regel |
| --- | --- | --- |
| 01 Training | `frontend/src/lib/**`, Trainingstests | QA-Runner führt dessen echte Tests aus; keine Trainingdateien bearbeiten |
| 02 Design | `frontend/src/**`, Web-Build | UI-Änderungen nur über PR testen; keine UI-Dateien anfassen |
| 03 Ernährung | App-Daten-/Backup- und API-Integration | Migrations-/Offline-Checks nach Integrations-PR ergänzen |
| 04 iPhone | `frontend/package*.json`, `capacitor.config.json`, `frontend/ios/**` | Hier unverändert; App-Build/Signierung hat Priorität |

**Nächster konkreter Schritt:** Root-CI-Runnersperre via GitHub-Action-Details/Billing beheben oder auf einem vollständigen privaten Checkout `node tools/opengym-qa/verify.mjs` ausführen, JSON/Logs auswerten und echte offene Test-/Buildfehler gezielt beheben. Danach iPhone-Agent 04 mit dem Original-App-Frontend-Buildresultat beliefern. Windows/Android-Packaging bleibt gesperrt, bis diese iOS-Basis und API-/Persistenzverträge nachgewiesen sind.

### Nachtrag 09.11.2026 — Mobile-Web-Build-Gate

- Neue QA-Stufe (Agent-05-Branch) kontrolliert die **mobile Variante des Original-Vite-Bundles**, die als Ausgangspunkt für die iPhone-App dient, ohne native Dateien zu synchronisieren oder zu verändern.
- Lokal auf Linux/Node.js v22.16.0 real ausgeführt: `node --check` für `verify.mjs`, `verify.test.mjs` und `mobile-web.mjs`; `node --test tools/opengym-qa/verify.test.mjs` → **8/8 Fixture-Tests bestanden**. Es wurden Fake-npm-Prozesse und künstlich erzeugte `dist/`-Dateien benutzt; dies beweist nicht, dass die echte Original-App baut.
- Gezielte Negativtests: falscher Web-Build trotz Exit-Code 0, fehlende JS-Datei, ungefüllter SW-Build-Placeholder und fehlendes `index.html` werden als Fehler erkannt.
- Noch offen: echtes `npm ci`, Vitest, Web-/Mobile-Vite-Build im gesamten Original-Checkout, `npm run build:mobile` mit Capacitor-Sync, Xcode und iPhone-Test. Automatisierte GitHub-Runs wurden bislang vor Start der Steps als `failure` ausgewiesen.

### Nachtrag — iOS-Integrations-Baseline ohne Xcode

Neu: `node tools/opengym-qa/ios-baseline.mjs` führt eine **read-only** Kontrolle des vorhandenen originalen Xcode-/Capacitor-Quellbaums durch. Es prüft die Präsenz von Xcode-Projekt/Workspace, Podfile, Entitlements, Privacy Manifest, AppleHealthPlugin, PhoneWorkoutPlugin, LiveActivityPlugin, Widgets, AppUITests und Assets sowie `capacitor.config.json` (appId, appName, webDir). Der alte App-Name bzw. die Original-Bundle-ID erzeugen eine Warnung, **kein automatisches Rebranding und keinen harten Fehler**; Agent 04 bleibt Eigentümer dieser Einstellungen.

Ausführung lokal auf Linux/Node v22.16.0: `node --test tools/opengym-qa/*.test.mjs` → **13/13 isolierte QA-Fixture-Tests bestanden** (8 bisherige + 5 neue iOS-Tests). Die neuen Testdateien stimmen SHA-1-Git-Blob-genau mit den hochgeladenen Branchdateien überein. Zusätzlich wurden 14 gezielt ausgewählte originale iOS-Dateien/-Verzeichnisse via verbundenem privaten GitHub-Zugriff auf `main` als vorhanden bestätigt. Die bisherige Originalkonfiguration trägt noch `appName=openGym` und `appId=ch.duartesantos.opengym`, aber `webDir=dist` ist korrekt.

**Grenze:** Dies ist kein Xcode-Typecheck, keine iOS-Testausführung, kein signierter IPA-Build und keine Funktionsgarantie für HealthKit oder Widgets. Der neue Root-Workflow ruft den iOS-Quell-Audit ohne Apple-Zugang auf, sobald GitHub Actions tatsächlich Runner-Jobs ausführt.
