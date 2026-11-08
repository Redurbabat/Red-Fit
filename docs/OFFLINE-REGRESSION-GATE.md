# RED Fit – unabhängiger Offline-Regressionslauf

**Stand:** 8. November 2026 · Integrations-Branch
`feat/unified-iphone-windows-integration`

## Problem und Lösung

Der bestehende `.github/workflows/ci.yml`-Job `verify` beginnt mit
`npm ci`. Kann die npm-Registry nicht erreicht werden oder ist die
Runner-Umgebung gestört, gelangen viele bereits vorhandene,
dependency-freie Regressionstests nicht zur Ausführung.

Das neue `tools/offline-regressions.mjs` entdeckt automatisch **alle
`tools/*.selftest.mjs`** im Checkout und startet sie in einem eigenen
Node.js-Testlauf:

```bash
# Node.js 22+, kein npm ci / node_modules / Netzwerk erforderlich
node tools/offline-regressions.mjs --list
node tools/offline-regressions.mjs
# alternativ npm run test:offline (npm CLI, aber keine Paketinstallation)
```

Der Testlauf enthält aktuell **19 Suites** inklusive fünf
Selbsttests des Offline-Runners. Es werden ausdrücklich **keine**
`playwright-core`-/Vitest-/Dexie-Pakete installiert. Node startet die
Dateien mit `--experimental-strip-types --test --test-concurrency=4`,
wodurch die importierten rein funktionalen TypeScript-Module verarbeitet
werden können. Fehler führen zu einem **nichtnull Exit-Code**; auch ein
leerer Testordner ist ein Fehler. Neue `*.selftest.mjs`-Dateien werden
ohne separate Pflege der CI-Workflow-Liste erfasst.

`.github/workflows/ci.yml` besitzt dafür einen eigenständigen Job
`offline-regressions` mit Checkout und Node-22-Setup, **ohne
`npm ci`**. Der bisherige vollständige `verify`-Job bleibt
unverändert als erforderlicher Release-Nachweis (Installation,
TypeScript, ESLint, Vitest, Vite-Build); die zwei Icon-Suiten müssen
im `verify`-Job nicht nochmals separat gestartet werden.

## Tatsächlich ausgeführte Checks

### Vollständiger Lauf am 8. November 2026

**Alle 19 von 19 Offline-Testsuiten wurden zusammen ausgeführt:
144/144 Einzeltests bestanden, 0 fehlgeschlagen, 0 übersprungen.**

```text
$ node tools/offline-regressions.mjs
RED Fit: running 19 offline regression suites (Node v22.16.0).
# tests 144
# pass 144
# fail 0
# skipped 0
Offline checks passed. App and native release checks still required.
```

Der vollständige Lauf wurde **nicht in GitHub Actions**, sondern mit
Node.js **22.16.0** in einer **lokal rekonstruierten Testumgebung**
ausgeführt. Ein direkter `git clone` war wegen fehlender DNS-Auflösung
für `github.com` nicht möglich. Stattdessen wurden die im Feature-Branch
vorliegenden Originaldateien aus dem privaten GitHub-Connector
übernommen und mit ihrem Git-Blob-SHA-1 verifiziert.

Vor dem vollständigen Lauf wurden die zuvor fehlenden vier Suiten und
alle zugehörigen Quellen ergänzt:

- `backup-snapshot.selftest.mjs`: 6 Tests – Produktionslogik von
  `collectBackupData` und Export-Sicherheitsprüfungen;
- `backup-workout-revision.selftest.mjs`: 10 Tests –
  Wiederherstellungsrevisionen einschließlich Import-Verdrahtung;
- `bundled-wger.selftest.mjs`: 7 Tests – 789 attribuierte
  Übungseinträge, Datensatz-SHA-256 und Opt-in-/Offline-PWA-Regeln;
- `cooking-yield.selftest.mjs`: 8 Tests – Roh-/Gekocht-Umrechnung,
  Lebensmittelausschlüsse und ungültige Gewichte.

**Dateiintegrität:** Alle **19 Testdateien** stimmen bytegenau mit den
jeweiligen Git-Blob-IDs im Branch überein. Ebenfalls als bytegleich
verifiziert wurden sämtliche für die Tests benutzten mitgelieferten
Implementierungen und Konfigurationen, darunter
`backupService.ts` (`c3d506fa467816f0e8fef83e714bb1f7d4157e9e`),
`workoutService.ts` (`1dfe4af0e16f36321cb6c0f2c7f04035b72b5194`),
`cookingYield.ts` (`81eb6abf027d947ddd9e7f46847977b59b4e2e89`),
`src-tauri/tauri.conf.json` und die wger-Quelldateien.
Der echte wger-Katalog ist bytegleich mit dem erwarteten
**SHA-256 `5e9b9736afce37d62aaf15a1f3de8cf54ce0b725f5a404ba446192fd03966599`**.

Der vollständige Sammellauf wurde nach Ersetzen früherer
**nur lokal** vereinfachter Test-/Quellkopien nochmals durchgeführt.
Die bisher gemeldeten 15/19 Suiten bzw. 113/113 Prüfungen waren der
**vorherige Zwischenstand** und sind jetzt durch den vollständigen
19/19-Lauf ersetzt. In der GitHub-Repository-Implementierung waren
für den nun bestandenen Lauf **keine zusätzlichen Codekorrekturen**
erforderlich; die neue Arbeit besteht in der vollständigen
Verifizierung des vorhandenen Offline-Test-Gates.

### Abgrenzung

Die Offline-Tests prüfen kontrollierte Node-Logik, Datendateien,
ausgewählte Produktions-Funktionskörper und simulierte
Datenbanktransaktionen; sie ersetzen **keine echte Dexie-/IndexedDB-
Integration**, keine vollständige Vitest-Suite und keine
Xcode-/iPhone- oder Tauri-/Windows-Kompilierung.

**Weiter nicht nachgewiesen:** ein GitHub-Actions-Lauf mit zugewiesenem
Runner, `npm ci` mit erreichbarer Registry sowie
`typecheck → lint → test → build` der vollständigen React-Anwendung.
Die Ausführungsumgebung meldet weiterhin DNS-Fehler (`EAI_AGAIN`);
frühere GitHub-Jobs erhielten keinen Runner
(siehe [CI-RECOVERY.md](CI-RECOVERY.md)). Ein lokaler grüner
Offline-Lauf macht den Pull Request daher **noch nicht merge-fähig**.

## Freigabekriterien

Der neue Offline-Job muss in CI vollständig grün sein **und** der
unverändert bestehende `verify`-Job mit
`npm ci → typecheck → lint → test → build` muss erfolgreich laufen.
Danach bleiben echte Capacitor-/Xcode- sowie Tauri-/Windows-Builds
und Geräte-/Datenschutzprüfungen notwendig. Das Bestehen von
Node-Selbsttests ist **kein** Nachweis für ein funktionsfähiges
Native-Release.
