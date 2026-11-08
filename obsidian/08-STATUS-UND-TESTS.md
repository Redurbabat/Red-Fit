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
