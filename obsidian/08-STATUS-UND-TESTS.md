---
tags: [red-fit, status, verification]
updated: 2026-11-08
---
# Gesicherter Projektstand / Testprotokoll

## Bereits im vorhandenen RED-Fit-Code dokumentiert
- React/TypeScript-PWA mit Navigation, Training, Ernährung, Körper, Plänen, Backup und Einstellungen.
- openGym-beeinflusste Warm-ups und Supersets, persistentes Workout und Revisionsschutz.
- Dietry-inspirierte Energiebedarfsschätzung, Mahlzeitenschätzungen und optionale Gekocht-/Roh-Umrechnung.
- wger: 789 zugeschriebene Offline-Katalogübungen und Import mit Vorschau.
- Windows-Tauri-Projektgerüst sowie iOS-Capacitor-Konfiguration; native Hash-Navigation.
- `docs/INTEGRATION-ROADMAP.md` nennt 21 lokal ausgeführte Node-Selftest-Suiten mit 166 Tests und dokumentiert noch offene CI-/native Builds. Das ist ein **dokumentierter früherer Nachweis**, kein frisch hier durchgeführter App-Build.

## Aktuelle Verifikation bei Erstellung dieses Vaults
- Repository `Redurbabat/Red-Fit` per GitHub-Zugriff geöffnet; `main` und bestehender Integrationsbranch wurden gesichtet.
- `Redurbabat/RED-Morph` Skill/Designsystem/Touch Kit und `Redurbabat/BBT-Bit` Einstieg/Designsystem gelesen.
- Drei ZIPs lokal nach SHA-256 geprüft: Details [[02-QUELLEN-UND-ARCHIVE]]. `openGym-main/NOTICE.md` gelesen und gesondert lizenzierte Medien erkannt.
- Elf bereitgestellte BBT-/SwiftUI-Markdown-Skills als **Referenz** gelesen.
- Nicht durchgeführt: `npm ci`, echter React-Build, iOS-/Android-/Windows-App-Build, Realgerät-/Simulatorprüfung oder vollständige neue Datenmigration.

## 2026-11-08 — Direktänderung auf main: Android Native Bootstrap
- Gepinntes `@capacitor/android@8.6.0` in `tools/nativeDependencies.mjs` ergänzt; iOS/Core/CLI behalten dieselbe Version.
- `tools/native-deps.selftest.mjs` prüft nun auch Android-Version, Lockfile und richtige Dependency-Gruppe.
- `tools/native-shell.selftest.mjs` prüft Android-Capacitor-Detektion samt Hash-Routing und deaktiviertem PWA-Service-Worker.
- Android-Hinweise in `docs/PLATFORM-BUILDS.md`, `docs/NATIVE-DEPENDENCY-BOOTSTRAP.md` und README ergänzt.
- Status: **Code direkt auf main committed; Tests und npm-Registry-/Android-Studio-Build nicht in dieser Sitzung ausgeführt.** `package.json`/`package-lock.json` enthalten noch keine gebootstrappten nativen Pakete; diese müssen gemeinsam erzeugt und committed werden.


## Jede Folgesitzung ergänzt hier
```text
Datum:
Branch/Commit:
Ziel:
Dateien:
Tatsächlich ausgeführte Befehle und Ergebnisse:
Offene Tests/Blocker:
Nächster konkreter Schritt:
```

**Evidenzprinzip:** „Code committed“ ist nicht „Build grün“, „Konfiguration angelegt“ ist nicht „App installierbar“.
