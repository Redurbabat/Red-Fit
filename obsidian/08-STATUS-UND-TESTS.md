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

## 2026-11-08 — Cloudflare-Workers-Build `dist` fehlt
- Vom Nutzer gelieferter Cloudflare-Log (13:39 UTC): `npm clean-install` erfolgreich, 512 Pakete, dann `npx wrangler deploy` ohne vorherigen Build. Fehler: `assets.directory` zeigt auf nicht vorhandenes `/opt/buildhome/repo/dist`.
- `package.json` auf `main` um **`deploy:workers`** (`npm run build && npx wrangler deploy --config wrangler.jsonc`) und **`deploy:pages`** ergänzt; keine Änderung am Dependency-Lockfile nötig, da nur Scripts hinzugefügt.
- `docs/CLOUDFLARE-DEPLOY.md` dokumentiert nun die Cloudflare-Dashboard-Einstellungen: Workers **Build command `npm run build`**, **Deploy command `npx wrangler deploy`**, Root `/`; alternativ Deploy command `npm run deploy:workers` ohne separaten Build command.
- **WICHTIG:** Cloudflare Workers Builds ignoriert aktuell benutzerdefinierte `build.command`-Einstellungen in Wrangler-Konfigurationsdateien. GitHub kann die bereits gespeicherten Cloudflare-Dashboard-Build-Einstellungen nicht automatisch korrigieren.
- Status: **Code/Dokumentation direkt auf main aktualisiert**. Weder neuer Cloudflare-Build noch Live-Bereitstellung wurde im Chat verifiziert. Die `glob`-Warnung im Nutzerprotokoll war nicht fatal.
- **Nächster Schritt:** Im Cloudflare-Worker-Projekt `Settings → Build` setzen, neuen Deploy starten, `dist`-Build und Produktions-URL prüfen; danach Deep Links, Workout-Datenerhalt, Offline-PWA und Update testen.


## 2026-11-08 — Cloudflare-Deployment: zusätzliche Absicherung
- Der ursprüngliche Cloudflare-Log zeigte einen erfolgreich durchgelaufenen Dependency-Install, aber **kein** `npm run build` vor `npx wrangler deploy`; dadurch fehlte `dist/`.
- Als direkter `main`-Fix existiert nun zusätzlich `npm run deploy:cloudflare` = `npm run build && npx wrangler deploy`. Vorhandenes `deploy:workers` baut ebenfalls zuerst.
- `tools/cloudflare-deploy.selftest.mjs` hinzugefügt und an die tatsächlich vorhandenen Worker-Deploy-Skripte und `docs/CLOUDFLARE-DEPLOY.md` angepasst.
- Der aktuelle GitHub-`main`-Inhalt von `package.json`, `wrangler.jsonc`, Cloudflare-Dokumentation und Test wurde direkt geprüft: **11/11 deklarative Konfigurations-/Dokumentationsabgleiche erfüllt**. Dies ist **kein** ausgeführter Node-Selftest, kein Vite-Build und kein bestätigter Remote-Deploy.
- Cloudflare-Dashboard muss weiterhin `Build command = npm run build`, `Deploy command = npx wrangler deploy` verwenden; alternativ bei leerem Build-Feld `Deploy command = npm run deploy:workers`. Ein GitHub-Push ändert diese Remote-Einstellung nicht.
- Bei unverifiziertem Cloudflare-Zugang ist das erneute Auslösen und die Validierung einer Live-URL **ausstehend**. Website-Deployment ist zudem nicht automatisch privat, obwohl GitHub privat ist.


## 2026-11-08 — Workers Build erreicht TypeScript, Backup-Test TS2352
- Cloudflare Workers Build vom 2026-11-08, **13:59–14:00 UTC** (vom Nutzer bereitgestellter Build-Log): `npm clean-install` installierte 512 Pakete; **`npm run build` wurde korrekt gestartet**, danach scheiterte TypeScript an `src/services/backup/backupSnapshot.test.ts(48,21)`, Fehler **TS2352** (Typ `string | Table<...>` zu `unknown[]`).
- Änderung direkt auf `main`: `src/services/backup/backupSnapshot.test.ts` prüft den von `vi.spyOn(db, "transaction")` erfassten Scope jetzt zur Laufzeit mit `Array.isArray`, statt ihn blind als Array umzudeuten. Die Backuplogik selbst, Datenbankmigrationen und Nutzerdaten blieben unverändert.
- Commit: `991c4c1def6960020a9c96276daa3187f50b92d4`.
- Prüfung: Die GitHub-Datei und ihr tatsächlicher Backup-Transaktionsaufruf (`collectBackupData` über ein Tabellen-Array) wurden abgeglichen. **Kein vollständiger TypeScript-/Vite-Build und kein neuer Cloudflare-Deploy in dieser Sitzung verifiziert.**
- Nächster Schritt: Cloudflare Worker erneut von `main` bauen; `tsc && vite build`, Asset-Upload und Deployergebnis prüfen. Bei weiteren TS-Fehlern genaue Logs prüfen und gezielt beheben. Eine Worker-URL ist ohne erfolgreiche Deployment-Antwort nicht verifiziert.


## 2026-11-08 — RED Morph / BBT-Bit inspiriertes Bottom Dock
- Neues React-Dock im Branch `feat/red-morph-bottom-dock-20261108`: weiterhin fünf echte Bereiche; nach abwärtsgerichtetem Scrollen minimiert das Dock (Icons bleiben ≥44px erreichbar), beim Aufwärtsscrollen wird es wieder ausgeklappt.
- Ein-Produkt-Regel beachtet: kein BBT-Bit-Musikplayer und kein SwiftUI-Code. Desktop-Sidebar und Workout-Fullscreen bleiben unverändert.
- Geänderte Dateien: `src/components/layout/BottomNav.tsx`, `dockBehavior.ts`, `src/app/AppShell.tsx`, `src/styles/mobile.css`, `tokens.css`, `components.css`; Tests `tools/dock-behavior.selftest.mjs` und `BottomNav.test.tsx`; Detaildoku `docs/RED-MORPH-BOTTOM-DOCK.md` und [[10-DOCK-RED-MORPH]].
- Tatsächlich ausgeführt: `node --experimental-strip-types --test tools/dock-behavior.selftest.mjs` auf Node 22.16.0 in isoliertem lokalem Quelltest (**7/7 erfolgreich**); TypeScript-`transpileModule`-Syntaxanalyse für drei TS/TSX-Dateien erfolgreich.
- **Nicht verifiziert:** `npm ci`, vollständiger Typecheck, ESLint, Vitest-UI-Test, Vite-Build, Cloudflare-Deployment und echte iOS-/Android-/Windows-UI. Keine native SwiftUI-Parität behaupten.
- Next: PR nach `main`, danach Cloudflare-Build prüfen und auf iPhone/Android Accessibility, Safe Areas, Scrollrichtung und Quick-Log-Überlagerung abnehmen.

- **Nachtrag:** UI-Änderung wurde über [PR #8](https://github.com/Redurbabat/Red-Fit/pull/8) per Squash nach `main` gemergt (Merge-Commit `42a70bd8e6ee528b42a3e539f06e5cc4eec5c5a8`). GitHub-Dateien auf `main` nach Merge erneut geprüft: Dock, routenbasierter Reset und [[10-DOCK-RED-MORPH]] vorhanden. Tests/Native-Builds bleiben wie oben beschrieben offen.


## 2026-11-08 — Cloudflare-Offline-Regressionsprüfung an Dokumentation angepasst
- **Ist-Stand vorher:** `main` enthielt den bereits gemergten RED-Morph-Dock (PR #8) und den Cloudflare-Fix; `tools/cloudflare-deploy.selftest.mjs` verlangte aber zwei inzwischen veraltete Textpassagen in der Cloudflare-Anleitung. Bei Ausführung wäre der Dokumentations-Assertion-Teil deshalb fehlgeschlagen.
- **Fix auf `main`:** `tools/cloudflare-deploy.selftest.mjs` erwartet nun den tatsächlich dokumentierten `npm run deploy:workers`-Befehl und prüft die Warnung zu von Workers Builds ignorierten `build.command`-Einstellungen. Keine Änderung an Cloudflare-Produktivkonfiguration, Fachlogik, Dependencies, Schema oder Nutzerdaten.
- **Code-Commit:** `286e7a4aa2b7f459d53019dde3455665d0de86ad`.
- **Tatsächlicher Nachweis:** Die Inhalte von `main` (`package.json`, `wrangler.jsonc`, `docs/CLOUDFLARE-DEPLOY.md`, `tools/cloudflare-deploy.selftest.mjs`) über GitHub abgerufen und **12/12 direkte Konfigurations-/Textchecks** gegen genau diese Inhalte erfolgreich ausgeführt. Kein npm-/Node-Testlauf, kein vollständiger Vite- oder Cloudflare-Build in dieser Sitzung; ein erfolgreicher Deployment-Status ist weiter unbelegt.
- **Weiter:** `npm run test:offline`, `npm run typecheck && npm run lint && npm run test && npm run build` auf einem Checkout mit Abhängigkeiten ausführen; Cloudflare Workers von neuestem `main` deployen und echte URL/Offline-Verhalten testen. Den Browser-/Cloudflare-Erfolg erst nach Lognachweis abhaken.


## 2026-11-08 — Cloudflare-Konfigurationstest real ausgeführt (3/3)

- **Aufgabe:** Den zuvor reparierten Deployment-Test erstmals tatsächlich ausführen, ohne einen erfolgreichen Cloudflare-Deploy vorzutäuschen.
- **Reproduktionsumgebung:** Node.js `v22.16.0`; Projektdateien in einem isolierten lokalen Testverzeichnis aus dem aktuellen GitHub-`main` nachgebildet; GitHub-Checkout über Netzwerk nicht möglich (DNS für github.com nicht erreichbar).
- **Bytegenauer Nachweis gegen `main` via `git hash-object`:**
  - `package.json` → `7155d1d203c8c04552f4ec1887099531f92dd293`
  - `wrangler.jsonc` → `cdf6a411cdf16a633dfcb6f3f10d4973283e4832`
  - `docs/CLOUDFLARE-DEPLOY.md` → `7c51f0937f31b84d8310ec9807e27568ecf33d50`
  - `tools/cloudflare-deploy.selftest.mjs` → `5166826ea41c1d9cf649329358471c384b2198cc`
- **Tatsächlich ausgeführt:** `node --test tools/cloudflare-deploy.selftest.mjs` im Testverzeichnis.
- **Ergebnis:** `tests 3, pass 3, fail 0` (Node TAP); geprüft wurden Build-vor-Wrangler-Skript, statische Asset-/SPA-Konfiguration und Abgleich der dokumentierten Cloudflare-Einstellungen.
- **Keine neuen Produktdateien geändert:** Das ist ein Nachweis der vorher committeten Korrektur. **Nicht getestet:** andere `tools/*.selftest.mjs`-Suiten, `npm ci`, TypeScript, ESLint, vollständige Vitest-Suite, Vite-Bundle, echte Cloudflare-Live-URL.
- **Nächster Schritt:** aktuellen Cloudflare-Build nach neuestem `main` anhand der Remote-Logs prüfen; nur nach tatsächlichem `vite build`-Erfolg die Worker-Asset-Auslieferung und Datenintegrität auf echter URL testen.


## 2026-11-08 — Android/iOS/Windows Native-Bootstrap wirklich getestet (16/16)

- **Neuer verifizierter Schritt:** Die drei Produktions-/Testmodule von GitHub-`main` wurden in ein isoliertes lokales Testverzeichnis übertragen und per `git hash-object` bytegenau mit GitHub abgeglichen:
  - `tools/nativeDependencies.mjs`: `63cc7d8f2d1425bda14d5606445f0f45362672a0`
  - `tools/bootstrap-native.mjs`: `03bd277316f5e29675340d042ac88ea32fbe7071`
  - `tools/native-deps.selftest.mjs`: `7e1d73fb4aae348eb1b42a84d49c62cfa650c3b4`
- **Tatsächlich ausgeführt:** `node --test tools/native-deps.selftest.mjs` unter Node `v22.16.0` im isolierten lokalen Dateibaum. **TAP: 16/16 bestanden, 0 Fehler.** Test umfasst Android-iOS-Core-CLI-Versionen, `@tauri-apps/cli`, Lockfile-V3-Validierung, Fehlkonfigurationen, `--plan`, `--check`, CLI-Fehlercodes sowie einen simulierten fehlgeschlagenen npm-Installationsvorgang mit Rollback beider Manifeste. Testlog liegt lokal in `redfit-native-verify/TEST-RESULTS.log`; kein nativer Paketdownload.
- **Aktuelle reale Lockfile-Lage direkt auf GitHub-`main` geprüft:** `package.json` Blob `7155d1d203c8c04552f4ec1887099531f92dd293`, `package-lock.json` Blob `4307551d9b3c6654fad472d2c72fe92c57fa56c1`. Alle fünf nativen Pakete fehlen aktuell sowohl als direkte Deklaration als auch als aufgelöste Lockfile-Einträge.
- **CI-Runner-Nachweis neu geprüft:** PR #8 (Actions Run `42488857176`) und PR #9 (Run `42489024356`) enthalten jeweils zwei fehlgeschlagene Jobs ohne einzige ausgeführte Step-Zeile; Job-Logs per GitHub-Actions-API mit `BlobNotFound` nicht verfügbar. Das spricht für einen vorgelagerten CI-Blocker, dessen genaue Ursache aus den verfügbaren Daten nicht bestimmbar ist.
- **Repository-Dokumentation aktualisiert:** `docs/NATIVE-DEPENDENCY-BOOTSTRAP.md` und `obsidian/07-BACKLOG.md` geben nun 16/16, den aktuellen `main`-Kontext und die offenen native-Paket-/Lockfile-Schritte an.
- **Nicht ausgeführt / nicht behauptet:** echtes `native:bootstrap` mit npm-Registry, `npm ci` mit den nativen Paketen, vollständiger Web-Build, Cloudflare-Deployment, Xcode-/Android-Studio-/Windows-Installer-Build.
- **Nächster konkreter Schritt:** Auf einem Checkout mit npm-Registry-Zugriff `npm run native:bootstrap && npm run native:check && npm ci` ausführen, `package.json` **und** `package-lock.json` zusammen auf `main` committen, dann `typecheck`, `lint`, `test`, `build` und reale native Builds prüfen. Vorher GitHub-Actions-Konto-/Runner-Berechtigung über die GitHub-Oberfläche klären.
