---
tags: [red-fit, status, verification]
updated: 2026-11-09
---
# Gesicherter Projektstand / Testprotokoll

## 2026-11-10 — Agents 01–05: gemeinsame Integrations-PR (Quelle, kein Release)

- Integrationsbranch `integration/red-fit-opengym-iphone-20261110` sammelt PRs #11, #12, #13, #14 und #15 in einem einzigen Draft gegen `main`. Original-openGym ist die Produktbasis. Bei Integration wurden native TabBar/React-Bridge, RED-Morph-Home und Ernährungskarte bewusst kombiniert.
- Separate Evidenz: der letzte Agent-04-iOS-XCUITest `42733050029` scheiterte am Onboarding/Home-Übergang. Kein integrierter iPhone-Gerätetest oder signiertes IPA nachgewiesen. GitHub-Sichtbarkeit zur Prüfung `public`.
- Gesamt-CI, Sicherheits-/Datenmigration, Apple-Signing und tatsächliche Installation sind nach Integration offen; siehe `docs/agent-runs/00-consolidated-integration.md`.


## 2026-11-09 — Agent 03: volle original-openGym-Tests bestanden

- GitHub Actions `42711524409` **completed/success**: `npm test` im vollständigen originalen openGym-Frontend `vendor/opengym-upstream/frontend/` ergibt **657/657 Testdateien mit 7'893/7'893 bestandenen Tests**. Zusätzlich isolierte Ernährungs-Vitest-Suite **61/61**, mobiler Vite-Build und Bundle-Flavour-Kontrolle **success**. Alle Angaben gegen den tatsächlichen Runner-Log und Job-Steps überprüft.
- Neue getrennte CI-Nachprüfung auf dem Agent-03-Branch: alter Kompatibilitätstester `scripts/check-bundle-syntax.mjs` für Safari 15.5, `npx cap copy ios` (nur Webdateien in das bestehende iOS-Capacitor-Verzeichnis auf dem CI-Runner kopieren, **kein iOS-Build**) und `scripts/check-mobile-bundle.mjs` plus Prüfung des kopierten Nutrition-JS. Neue Schritte bei Dokumentation **noch in progress**, nicht als erfolgreich markieren.
- **Offen:** echte iPhone-IPA/Xcode-Signierung, Betrieb auf iPhone, WKWebView-IndexedDB-v1→v2-Migration und Datenbackup-Roundtrip, zusammengeführtes Workout-/Nutrition-Backup sowie separater alter Root-App-Lintfehler. Kein Merge in `main`.
- Detailprotokoll: `docs/agent-runs/03-opengym-nutrition.md`. PR #15.

## 2026-11-09 — Agent 03: original-openGym Ernährung auf echter CI geprüft (nur PR #15)

- **Neu eingerichtete Original-Frontend-CI**: `.github/workflows/opengym-nutrition.yml` führt ausschliesslich unter `vendor/opengym-upstream/frontend` `npm ci`, `npx vitest run src/nutrition` und `VITE_MOBILE=1 npm run build` aus; eigene Prüfung des mobilen `dist/index.html`.
- **Tatsächlich erfolgreicher GitHub-Actions-Run `42710935902`**: Vitest **61/61 Tests (6 Dateien) bestanden**, Vite v8.3.5 **475 Module**, mobile Browser-/WebView-Bundle erfolgreich erzeugt und Mobile-Flavour bestätigt. Logs und einzelne Steps eingesehen. Keine erfolgreiche iOS-IPA-/Xcode-/Capacitor-Sync-/Geräte-QA behauptet.
- Nutrition enthält Lebensmittel, Rezepte mit gekochtem Gesamtgewicht, Ernährungstagebuch, v2-IDB-Mahlzeitenplanung, daraus abgeleitete 7-Tage-Einkaufsliste, native Dokumentensicherungen und additive v1/v2-JSON-Wiederherstellung. Details und verbleibende Risiken: `docs/agent-runs/03-opengym-nutrition.md`.
- **Weiter offen:** Root-`.github/workflows/ci.yml` blockiert durch vorhandenes Lint-`no-control-regex` in `src/services/workout/setNotes.ts` (auf main und Agent-03-Branch identisch); getrennte originale openGym-Gesamttests, nativer iPhone-/Dateisystem-/IndexedDB-Roundtrip und gemeinsames Workout-/Nutrition-Backup.
- PR #15 gegen `main` bleibt **offen**. Kein eigener Merge/kein direkter Push auf `main`.

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


## 2026-11-08 — Persönliche Trainingsrekorde korrigiert (Gewicht, Wiederholungen, Eigengewicht)

- **Ausgangspunkt:** Die native npm-Bootstrap-Aufgabe bleibt blockiert, weil `registry.npmjs.org` im lokalen Runner nicht erreichbar ist (`npm view @capacitor/core@8.6.0 version` → `EAI_AGAIN`). `package.json`/`package-lock.json` wurden deshalb bewusst nicht halbseitig aktualisiert.
- **Konkreter Funktionsfehler:** `findNewRecords` erkannte bisher nur ein höheres Höchstgewicht, nicht mehr Wiederholungen bei gleichem Gewicht. Außerdem konnten Null-Wiederholungs-Sätze und verworfene Trainings als neue Rekorde erscheinen. Die Zusammenfassungsseite stellte bodyweight-Rekorde als `0 kg` dar.
- **Produktionsfix direkt auf `main`:** `src/services/calculations/workout.ts` erkennt jetzt ein höheres Höchstgewicht **oder** mehr Wiederholungen beim bisherigen Höchstgewicht (einschließlich `weightKg=0`); filtert abgeschlossene 0-Wiederholungs-Sätze für die PR-Berechnung; beendet die PR-Auswertung früh für andere Status als `completed`.
- **UI auf `main`:** `src/features/training/workout/WorkoutSummaryPage.tsx` zeigt Eigengewicht als Wiederholungsbestwert statt `0 kg` an, Gewichts-/Wiederholungsrekorde bei geladenen Übungen klar bezeichnet.
- **Regressionen:** `src/services/calculations/workout.test.ts` aktualisiert (bestehende `80 kg × 10` gegen `80 kg × 8`-Annahme berichtigt) und erweitert: höhere Reps bei gleichem Gewicht, unveränderte Bestleistung, Eigengewicht und Nicht-Rekorde bei 0 Wdh., aktiv/abgebrochen. Neue `tools/workout-records.selftest.mjs` lädt ohne npm den tatsächlichen `workout.ts` über die eingebaute Node-TypeScript-Typentfernung; für nicht zu testende Datumsfunktionen werden explizit Stubs verwendet.
- **Tatsächlich ausgeführt:** 9/9 fokussierte Auswertungsprüfungen wurden auf aus dem aktuellen GitHub-Produktionsquelltext extrahierten **unverändert übernommenen Funktionskörpern** im JavaScript-Isolat ausgeführt: höhere Last, mehr Reps, Gleichstand, Eigengewicht, 0-Reps, unvollständige Sätze, Abbruch, aktiv und neue Übung. Alle bestanden. Diese Prüfung ersetzt **nicht** den vollständigen Node-Selftest, Vitest, Typecheck oder Build.
- **Commits:** `9ada120` PR-Reps, `4627a25` Vitest, `08638ed` Eigengewichts-UI, `380da87` Abbruchschutz, `59b0b2e` Status-Vitest, `aca2d88` source-backed Node-Selftest.
- **Offen:** `node --test tools/workout-records.selftest.mjs` im vollständigen Checkout, vollständiger `npm ci && npm run typecheck && npm run lint && npm run test && npm run build`, Cloudflare und native Zielgeräte. Diesen Schritt erst nach realen Erfolgslogs abhaken.
- **Nächster Schritt:** Den source-backed Selbsttest mit echtem Checkout und Node 22.16+ ausführen; danach den aktuellen Cloudflare Worker-Build kontrollieren. Für native Binary-Builds fehlt weiter ein atomar aktualisiertes `package.json` + `package-lock.json`.


## 2026-11-08 — Trainingsrekord-Quellselbsttest real ausgeführt (7/7)

- **Ziel:** Die bisher nur als Quellfunktionsprüfung verifizierte neue Datei `tools/workout-records.selftest.mjs` erstmals tatsächlich mit Node als vollständige Suite ausführen.
- **GitHub-`main` am Testbeginn:** `80a2ba7a721fc0cdd3a73584a55c3a5b66e8bf5f`. Originaldateien aus dem privaten GitHub-Repository in eine isolierte lokale Teststruktur übertragen; GitHub-Blob-SHAs mit `git hash-object` bestätigt:
  - `tools/workout-records.selftest.mjs` → `8dc398b822f1530696ba932697584cad4f53d531`;
  - `src/services/calculations/workout.ts` → `a505f693771d767ce72fd0ed978c7203150e6d1d`.
- **Tatsächlich ausgeführt:** `node --test tools/workout-records.selftest.mjs` unter **Node.js 22.16.0**, TAP-Ergebnis **7 Tests, 7 bestanden, 0 fehlgeschlagen**, Laufzeit 112,8 ms. Gesonderter Testlog im ausführenden Arbeitsverzeichnis `/mnt/data/redfit-pr-verification/TEST-RESULTS.log`.
- **Inhalt:** höheres Gewicht; mehr Wiederholungen bei identischem Spitzengewicht; keine Scheinrekorde bei Gleichstand; Eigengewichts-PR; Null-Wiederholungs-/nicht abgeschlossene Sätze; abgebrochene, aktive und geplante Trainings; mehrere Blöcke derselben Übung.
- **Testgrenze:** Voller neuer npm-freier **Node-Selbsttest** erfolgreich, aber im isolierten Nachbau mit den zwei exakt hash-geprüften `main`-Dateien und gestubbten fremden Datumsfunktionen, **nicht** als `npm ci`, Vitest-Gesamtlauf, Typecheck, Vite-Build oder Cloudflare-/nativer Deploy.
- **Weiterer Dokumentschritt:** `docs/CI-RECOVERY.md` auf bereits zusammengeführte PRs/`main` aktualisiert und veraltete Freigabeformulierung zum unmerged Draft-PR korrigiert; `obsidian/07-BACKLOG.md` markiert den neuen Ausführungsnachweis. Produktionscode unverändert.
- **Nächste offene Aufgabe:** `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` auf einem Checkout mit erreichbarer npm-Registry ausführen; den neuesten Cloudflare-Build und die Live-URL erst nach Logs/HTTP-Prüfung bestätigen. Native npm-Abhängigkeiten fehlen weiterhin im Lockfile.


## 2026-11-08 — Historische Trainingsrekorde zeitlich korrekt (9/9 Node)

- **Befund / echte Reproduktion:** Beim Öffnen älterer Trainings konnte `findNewRecords` den damals aufgestellten Rekord verlieren, weil `WorkoutSummaryPage` `listCompleted()` einschließlich späterer Sitzungen übergibt. Der vorherige Selbsttest wurde mit zwei hinzugefügten Historienfällen **vor der Korrektur** ausgeführt: **7 bestanden, 2 fehlgeschlagen** (`/mnt/data/redfit-pr-chronology/before.log`).
- **Änderung direkt auf `main`:** `src/services/calculations/workout.ts` filtert beim Berechnen historischer persönlicher Rekorde nun auf Datensätze mit `w.date < workout.date` oder bei demselben Kalendertag `w.startedAt < workout.startedAt` (und schließt die eigene ID aus). Keine Schema-/Backup-Migration; bestehende Trainingsdaten bleiben unverändert.
- **Regressionen:** `tools/workout-records.selftest.mjs` besitzt nun echte Datums-/Startzeit-Fix­turen und zusätzliche Fälle für spätere Trainings (anderer Tag und gleicher Tag). Ergänzende Vitest-Fälle sind in `src/services/calculations/workout.test.ts` versioniert.
- **Tatsächlich ausgeführt:** `node --test tools/workout-records.selftest.mjs`, **Node.js 22.16.0**, isoliertes lokales Dateiverzeichnis: **9 Tests bestanden, 0 Fehler** (`/mnt/data/redfit-pr-chronology/after.log`, 108 ms). Die beiden getesteten Dateien sind **bytegleich mit GitHub `main`** (`git hash-object`):
  - `src/services/calculations/workout.ts`: `e0e8703f058993504e9a71075d80614c97b52b9d`
  - `tools/workout-records.selftest.mjs`: `edd530e220e83a2c2201dc3a893c3fca804d8340`
- **Quellfreigabe:** Der Nutzer hat ausdrücklich die Weiterverwendung seines eigenen Repository-Codes für RED Fit erlaubt; in `obsidian/06-LIZENZEN-UND-RECHTE.md` dokumentiert. Daraus folgt keine pauschale Lizenz an fremden Upstream-Inhalten oder gesonderten Gym-visual-Medien.
- **Commits:** `d5e62fb` Produktionsfehler, `bd15eef` Node-Test, `da5c722` Vitest, `68830e9` dokumentierte Freigabe. Full `npm ci`, `vitest`, kompletter TypeScript- und Vite-Build, GitHub-Actions-Runner, Live-Cloudflare und native iPhone/Android/Windows-Builds **nicht** getestet. Dies ist ein fokussierter Regressionserfolg, keine Release-Freigabe.
- **Nächster sinnvoller Schritt:** Vollständige Offline-Regressions-Suite und regulären Build auf tatsächlichem Checkout nachweisen; dann bestehende openGym-/wger-/Dietry-Funktionslücken vergleichen und codebasiert integrieren, ohne Duplikate oder Drittanbieter-Medien.


## 2026-11-08 — Eigentümer bestätigt openGym als direkte Quellcodebasis
- **Nutzerauftrag:** „Kopiere die opengym 1:1 im red fit und aberite ab dort weiter“; danach „Nein es ist meine repo du darfs das nehmen“. Der Originalcode darf daher als Ausgangsbasis übernommen werden; vorheriger reiner Ideen-Transfer nicht mehr die Vorgabe.
- **Identität geprüft:** `DuarteSantos8/openGym`, Commit `8fb98b16861a2728652302a7e6e30c50548493a0` (04.11.2026). Ursprungs-ZIP SHA-256 `7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09`.
- **Tatsächlich bereitgestellt:** Lokales Medien-bereinigtes ZIP aus dem Original mit 8.869 Quelldateien (77.652.954 unkomprimierte Bytes); jede enthaltene Datei wurde gegen ein SHA-256-Prüfmanifest geprüft, **0 Abweichungen**. Container-Archiv SHA-256: `cfa2b63be793ff304b52a3697ce5af13d2beb1d99490ac0430db52310b4d940b`. Nicht im GitHub-Repo abgelegt.
- **Auf GitHub-`main` bereits bytegleich kopiert:** Erster Quellblock inklusive `LICENSE`, `NOTICE.md`, `README.md`, `CHANGELOG.md`, `ROADMAP.md`, `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/index.html`, `frontend/package.json`, `api/server.js`, `api/package.json`; zweiter Block neun React-/CSS-Dateien. Vier Blob-SHAs direkt mit dem Original verglichen und identisch. Ordner `vendor/opengym-upstream/`.
- **Importer:** `tools/import-opengym.py` auf `main` prüft ZIP-SHA, Pfade, Symlinks, kopiert Originalbytes, überspringt identische Bestandsdateien und verhindert Änderungen an abweichenden Bestandsdateien. Keinerlei aktive Produktionsrouting-Umschaltung.
- **Grenze:** 13.108 `catalogue/media/`-Dateien wegen separater Gym-visual-Rechte ausgeschlossen; Lizenz/NOTICE bleiben erhalten. Eigentum am openGym-Code ist nicht automatisch eine Medienlizenz. Auch openGym-API, Auth, Build und Migration sind noch nicht erfolgreich ausgeführt.
- **Arbeitsstand:** Ein PR-/Codeimport in Teilen ist erfolgt, **kein** vollständiger 8.869-Dateien-GitHub-Commit und keine bestätigte openGym-basierte laufende RED-Fit-App. Näheres: `docs/OPENGYM-BASELINE.md`.
- **Nächster Schritt:** Medien-bereinigten Originalquellbaum vervollständigen, dann Frontend/API mit ihren ursprünglichen Abhängigkeiten bauen, Datenmigration gestalten, erst nach Tests den bisherigen Runtime-Entrypoint ersetzen.


## 2026-11-08 — openGym-Satznotizen in RED Fit integriert

- **Quellenabgleich:** `openGym-main(1).zip`: `frontend/src/lib/set-notes.js`, `frontend/src/views/Workout.set-note.test.jsx` und `Workout.jsx` zeigen kurze Notizen je Satz, Löschen durch Leeren und Anzeige unter dem Satz. RED Fit hatte schon `SetLog.notes?: string`, aber in `WorkoutPage.tsx` weder Satznotiz-Eingabe noch Anzeige in `WorkoutSummaryPage.tsx`. Kein Kopieren der Original-Runtime oder fremder Medien.
- **Änderung direkt auf `main`:** `src/services/workout/setNotes.ts` normalisiert kurze Satznotizen auf 140 Zeichen (Steuerzeichen/Leertext); in `WorkoutPage.tsx` editierbare, zugängliche Satznotizen pro Satz mit bestehendem `updateSet`-/Autosave; `WorkoutSummaryPage.tsx` zeigt Notiz unter dem richtigen Satz. **Keine neue DB/Backup-Migration**, kein Cloud-Upload, kein Verlust vorhandener Workout-Daten durch neue Migrationen.
- **Neue Tests:** `src/services/workout/setNotes.test.ts` (Vitest, unbestätigt) und `tools/set-notes.selftest.mjs` (drei reine Node-Tests + ein React-/Schema-Quellvertrag).
- **Tatsächlich geprüft:** Die unveränderten `main`-Quellbytes von `setNotes.ts` (`7217d9cf9736c03bd7d921ba0a33b4b4b7aa1669`) und `set-notes.selftest.mjs` (`6e0072b81d3494edbce2375b1c53279e68b7e94f`) lokal via `git hash-object` verifiziert. Mit **Node.js 22.16.0**: `node --experimental-strip-types --test --test-name-pattern='a short|empty|control' tools/set-notes.selftest.mjs` → **3/3 reine Funktionsfälle bestanden**. Zusätzlich `tsc --noEmit --strict --target ES2022 --module ESNext src/services/workout/setNotes.ts` → **bestanden**.
- **Weitere tatsächliche Prüfung:** Die GitHub-`main`-Dateien `src/models/workout.ts`, `WorkoutPage.tsx`, `WorkoutSummaryPage.tsx`, `setNotes.ts` und `set-notes.selftest.mjs` abgefragt; **9/9 statische Integrations-/Verkabelungsabgleiche** bestanden.
- **Nicht behaupten:** Der **volle** `tools/set-notes.selftest.mjs` (inkl. Quellvertrag) wurde nicht auf einem vollständigen Checkout ausgeführt. Die lokale isolierte Testfixture enthielt nicht alle React-Quelldateien, deshalb war bei einem ersten unselektierten Versuch der vierte Test wegen `ENOENT` nicht ausführbar – **kein nachgewiesener Fehler auf `main`**. Nicht gelaufen: kompletter Vitest-/React-/Vite-Build, Dexie-Persistenz-/Backup-Restore, Gerätesperre/Offline-Test.
- **Dokumentation:** `docs/OPENGYM-SET-NOTES.md` beschreibt Quellpfad, bereits vorhandenes RED-Fit-Datenmodell, Integration, Risiken und nächste Prüfungen. Ein eigenständiges openGym-Backend wurde weder gebraucht noch eingebaut.
- **Nächster Schritt:** Auf vollständigem Checkout mit npm-Registry `node --test --experimental-strip-types tools/set-notes.selftest.mjs` und `npm ci && npm run typecheck && npm run lint && npm run test && npm run build` ausführen; anschließend echte Schreib-/Reload-/Backup-/Gerätetests. Weitere openGym-Progressionsmodi gesondert abgleichen.


### Nachtrag: openGym-Quelle weiter in GitHub übernommen / Build-Vorprüfung
- **34 statt 20 Originaldateien** sind direkt auf `main` unter `vendor/opengym-upstream/` kopiert; neu hinzugekommen sind das originale Frontend-`package-lock.json`, Vite-/Capacitor-Konfiguration, `index.css`, `sheets.jsx`, API-`package-lock.json` und weitere API-Module für Auth/Sync. Unveränderte Quellbytes wurden beim Import aus dem fixierten upstream-Commit übernommen; exemplarische Git-Blobs wurden im Ziel überprüft.
- **Vollständiges Quellpaket für RED-Fit-Ordnerstruktur** im Chat erzeugt: `RED-Fit-openGym-vendor-import.zip`, enthält 8.869 Originaldateien nur unter `vendor/opengym-upstream/`, SHA-256 `7089f61e5939eb08968486dda7af1ffe10b0bda3bd0c6db2c6b48a77d80e071c`. ZIP-Integritätsprüfung erfolgreich. Dieses Chat-Artefakt wurde **noch nicht als vollständiger Git-Commit** nach GitHub übertragen.
- **Tatsächlich ausgeführt:** Node.js `v22.16.0` `node --check` auf **169 originalen JavaScript-Modulen aus `api/`** (169/169 ohne Syntaxfehler); separate Vite-Konfiguration syntaktisch geprüft. **Nicht** ausgeführt: npm-Abhängigkeiten, Tests des gestarteten Node-Servers, Auth/Synchronisierung, Frontend-Produktionsbuild, Datenübernahme, iOS-/Android-/Windows-Build.
- **Architekturregeln aktualisiert:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `ARCHITEKTUR.md` und `docs/CLOUDFLARE-DEPLOY.md` kennzeichnen den Eigentümerwunsch und dass der alte Cloudflare-Worker **noch nicht** openGym mit API bereitstellt.


## 2026-11-08 — openGym-Originalprogression: 70 Dateien, 10/10 Node-Tests

- Eigentümerauftrag: Originale openGym-Quellbasis unverändert in `vendor/opengym-upstream/` übernehmen, bestehenden RED-Fit-Einstieg bis zur vollständigen Prüfung beibehalten.
- Neu auf `main`: 70 Original-Progressions-/Abhängigkeitsdateien (2.118.063 Bytes) inkl. sechs Modi, Tests, Trainingshistorie und generiertem Übungskatalog. Zuvor 34, nun **104/8.869** insgesamt; **8.765** fehlen weiterhin. GitHub-Commitvergleich: `9260331..97812b8` zeigt 70 neue Vendor-Dateien.
- `tools/opengym-progression-source.lock.json` hält für jede der 70 Dateien den originalen Git-Blob-Hash fest. Alle **70/70 realen GitHub-Blob-SHAs** gegen dieses Lock erfolgreich geprüft; unveränderlicher Original-Commit `8fb98b1`. **68/68** JS-Dateien mit `node --check` bestanden.
- `node --test tools/opengym-progression.selftest.mjs`: **10/10 bestanden** (Node 22.16.0, isoliertes Verzeichnis aus bytegleichen ZIP-Dateien), einschließlich sechs Modi, Gewichts-/Deload-Logik, Triple-Start, unvollständigen Sätzen, Importabhängigkeiten und 70 Original-Hashes. Log: `/mnt/data/redfit-opengym-progression-smoke/node-tests-final.log`. Test-Blob `be382958` und Lock-Blob `aa7c615d` mit GitHub abgeglichen.
- Keine produktive Umschaltung, kein vollständiger npm-/Vitest-/Vite-/API-/Cloudflare-/Native-Build und keine Datenmigration behauptet. Details: `docs/OPENGYM-BASELINE.md`. Als Nächstes fehlen der vollständige Quellenimport und reale Build-/Datenschutz-/Migrationsprüfungen.


- **Nachtrag für den neuen Vendor-Baum:** `eslint.config.js` ignoriert nun `vendor/` beim regulären RED-Fit-Lint-Lauf; der gesonderte `tools/opengym-progression.selftest.mjs` bleibt über `tools/offline-regressions.mjs` ausführbar. Änderung `3d6155e` auf `main`; kein vollständiger ESLint-/Vite-Build durchgeführt.

## 2026-11-10 — Agent 04: iPhone-IPA erfolgreich gebaut und direkt geprüft

- **Aktiver Produktpfad:** Original-openGym als RED Fit unter `vendor/opengym-upstream/frontend/`, **keine** neue Legacy-Root-PWA als iPhone-App. Branch `agent/redfit-04-ios-android`, bestehende Draft-PR #13 gegen `main`.
- **Belegt:** macOS/Xcode-GitHub-Run [42718097186](https://github.com/Redurbabat/Red-Fit/actions/runs/42718097186) ist **vollständig erfolgreich**, inkl. iOS-Simulator, iPhone-arm64-Device, Swift-Assetgenerator, aller eingebetteten originalen Watch-/Widget-/Background-Asset-Ziele und IPA-Paketvalidator. Root-CI [42718096994](https://github.com/Redurbabat/Red-Fit/actions/runs/42718096994) **erfolgreich**.
- **Echtes heruntergeladenes IPA geprüft:** GitHub-Artifact [13718993845](https://github.com/Redurbabat/Red-Fit/actions/runs/42718097186/artifacts/13718993845); `RED-Fit-UNSIGNED.ipa` **217875794 Bytes**, SHA-256 `95e46cb065a0d9bae5e01d593732f5aa42c002351979656a750dd7ba4cff963c`. 13668 ZIP-Einträge, CRC vollständig bestanden, alle fünf nativen Apple-`Info.plist`-Bundles konsistent, iPhone/Watch/Widgets = `RED Fit`; Asset-Downloader = `RED Fit animations`. Für Details siehe `docs/agent-runs/04-iphone-first.md`.
- **Offen:** Apple-Signierung und Provisioning aller 5 Targets, noch Upstream-IDs `ch.opengym.app*` und App Group `group.ch.opengym.app`; keine Behauptung einer Installation am iPhone, von funktionierender HealthKit-/Background-/Watch-Nutzung oder von Offline-/Sperr-/Wiederaufnahme-Abnahme. Eigentümerentscheidung zur eigenen Bundle-ID/Team-Signing und reale Gerätetests nötig. **Nicht** unüberlegt umbenennen oder App Group/Keychain-Datenzugriff zerstören. Keine Geheimnisse teilen.

## 10.11.2026 — Agent 05 integration QA follow-up

- PR [#17](https://github.com/Redurbabat/Red-Fit/pull/17) is the single integration draft on integration/red-fit-opengym-iphone-20261110. All five source PR heads are included; no merge into main.
- Original frontend workflows failed due to Vitest collecting three node:test-only iOS guard suites. Changed frontend/vite.config.js on integration branch in commit ffe2902e8a24cc348601af60d960de8edb5728d0; actual rerun pending.
- Extra failures: Tour.test.jsx:513 once in nutrition full suite and OpenGymUITests.swift:67 in original iOS onboarding/Home smoke. Both remain open.
- Root CI and combined iOS simulator workflow were green at old integration head 9740f4bc, not confirmation of real iPhone install. Github repository visibility is public.
- Next: confirm new CI head, then fix iOS native navigation/onboarding failure; no signed IPA or secrets release.

## 2026-11-10 — PR #17: neues RED-Fit-Branding und Dock-Integration

- Weiterarbeit direkt auf `integration/red-fit-opengym-iphone-20261110`, ausgehend von `a7be58b`. Alle fünf aktuellen Quell-PR-Heads (#11–#15) sind mit Git als Vorfahren bestätigt.
- Letzte Nutzerentscheidung fürs Logo: **Bordeaux/Elfenbein, abstraktes eigenständiges Symbol aus drei fließenden Formen; kein R, keine Buchstaben und keine Hantel**. Nur dieser letzte Entwurf ist eingebaut.
- Neue primäre und alternative App-Icons, Splash für iPhone/Watch/Android, PWA/Referenz-Icons, Onboarding, Druck-/Share-Marke; sichtbare Texte aller unterstützten Sprachen und neue Exportnamen = RED Fit. Update-/Projektlinks zeigen ins eigene Repo. Alte Daten-/URL-/Importkennungen und originale Lizenzhinweise bleiben kompatibel.
- Echtes UIKit-`UITabBar` bleibt erhalten; Web-Fallback schwebend und >=44px. Ernährung markiert Home. Native Leiste versteckt sich auch hinter der ersten Einführungstour. Health-Origin-Erkennung umfasst neue und alte Bundle-IDs.
- Browser-A11y belegt `Today Rest day` als Button: XCUITest nutzt nun den echten Button statt nicht vorhandenem separatem `Today`-Text, schließt die optionale Tour vor Dock-Taps und hängt bei Fehlschlag Screenshots/A11y an.
- Tatsächlich bestanden: **218 Offline-Regressionen**, **23 native Struktur-/Identitäts-/Bundle-Guards**, **89 fokussierte Branding-/Backup-/Health-/Dock-Tests**, **28 zusätzliche Exporttests**, Original-Web-/Mobile-Build und Safari-15.5-Syntaxcheck. Chromium: vier Breiten, Navigation, 80 g = 296 kcal, Reload-Persistenz, Offline-Navigation, Reduce Motion, keine JS-Ausnahmen.
- Root vollständig: **268/268 Tests**, Typecheck, Lint und Build bestanden. Original-Frontend-Gesamtlauf: **7.983 bestanden, 1 veraltete FIT-Dateinamensassertion fehlgeschlagen**. Diese erwartete noch `opengym-…fit`, obwohl der Export korrekt `red-fit-…fit` erzeugt. Assertion aktualisiert; anschließender Lauf der gesamten betroffenen Workout-Detail-/FIT-Suites: **36/36 bestanden**, ohne weitere Produktcodeänderung. Kein einzelner vollständig grüner Gesamtlauf nach dieser reinen Testkorrektur behauptet.
- Zusätzlich **45/45** Nachtests der Backup-/Settings-/Routing-Korrekturen und **9/9** QA-Harness-Tests bestanden. GitHub-QA erkannte den legitim umbenannten Package-Namen zuvor nicht; der Guard erlaubt jetzt ausdrücklich das originale und das umbenannte Frontend, lehnt die Root-PWA weiterhin ab.
- macOS-Run [42851915523](https://github.com/Redurbabat/Red-Fit/actions/runs/42851915523), Produktionsstand `b3d58a99`: **Simulator-Build, unsignierter Gerätebuild und tatsächliche IPA-Integritätsprüfung bestanden**. Der anschließende XCUITest wurde durch den neueren Branch-Stand abgelöst/abgebrochen, nicht als erfolgreich gewertet. Folgende Änderungen betreffen nur QA-Harness, Test-Erwartung und Dokumentation; nativer/Frontend-Produktcode ist unverändert. Neuester PR-Workflow bleibt maßgeblich für die UI-Abnahme.
- Offen: macOS-Xcode-Workflow für diesen neuen Stand, echte iPhone-/Watch-Darstellung und native Minimierung, Signing/installierbare IPA, Android-/Windows-Binaries. Kein Merge, keine Veröffentlichung/kein manueller Deploy.
- Details: `docs/design/RED-FIT-BRAND-INTEGRATION.md`, `docs/agent-runs/00-consolidated-integration.md`; reproduzierbarer Browsercheck: `E2E_BASE_URL=http://localhost:4173 node tools/redfit-original-e2e.mjs` gegen einen lokalen `VITE_MOBILE=1`-Preview.
