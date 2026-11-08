# openGym als unveränderte Quellbasis für RED Fit

Stand: 2026-11-08. **Nutzerentscheid:** Der Eigentümer hat ausdrücklich erklärt, dass openGym sein Repository ist und der Originalcode 1:1 als Ausgangsbasis für RED Fit übernommen werden soll. Damit hat openGym-Code-Übernahme Vorrang vor einer bloßen Funktionsadaption.

## Quellidentität und Reproduzierbarkeit

- Originalprojekt: [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym), geprüfter Git-Commit `8fb98b16861a2728652302a7e6e30c50548493a0` vom 4. November 2026.
- Vom Nutzer bereitgestelltes Archiv: `openGym-main(1).zip`, SHA-256 `7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09`.
- Vollständiger, separat aufbereiteter **Quellcode ohne fremde Gym-visual-Medien**: 8.869 unverändert kopierte Quelldateien, 77.652.954 Byte vor ZIP-Kompression. SHA-256 für jede der 8.869 Dateien geprüft: **0 Abweichungen**.
- Ausgeschlossen: 13.108 Dateien unter `catalogue/media/` (Ausnahme: `catalogue/media/NOTICE.md`). Laut Original-`NOTICE.md` sind diese Medien Gym visual vorbehalten. Das Eigentum am openGym-Repository beweist noch keine eigenständige RED-Fit-Medienlizenz.
- Unverändert beibehalten: `LICENSE` und `NOTICE.md` einschließlich Urheber- und Drittanbieterhinweisen. openGym steht unter AGPL-3.0-or-later; für öffentlich vernetzte Nutzung und Weitergabe Rechte- und Quellcodepflichten gesondert prüfen.
- Vollständiges Archiv und per-Datei-Prüfmanifest wurden lokal im Projekt-Chat erzeugt. Ein Chat-Artefakt ist **kein GitHub-Commit** und für weitere Chats nicht automatisch im Repository vorhanden.

## Tatsächlich im privaten GitHub-Repository

Der Ordner `vendor/opengym-upstream/` enthält inzwischen **34** Originaldateien direkt auf `main`, SHA-geprüft und ohne inhaltliche Änderungen: Original-Lizenz, Notices, README, Changelog, Roadmap, Frontend-App-Einstieg und weitere React-Komponenten sowie `api/server.js` und Paketmanifeste. Die überprüften Dateien haben identische Git-Blob-SHAs wie openGym. **Noch nicht behaupten, dass alle 8.869 Dateien in GitHub liegen.**

### Den vollständigen Quellstand ohne Medien nachziehen

Auf einem Rechner mit einem Checkout von `Redurbabat/Red-Fit` und dem ursprünglichen ZIP:

```bash
python3 tools/import-opengym.py "/pfad/zu/openGym-main(1).zip"
python3 tools/import-opengym.py "/pfad/zu/openGym-main(1).zip" --apply
git status --short
```

Das Skript prüft die genaue Archiv-SHA-256, verweigert Symlinks und unsichere Pfade, behält Datei-Bytes/Pfade unverändert bei und überspringt bereits importierte Dateien nur bei bytegleichem Inhalt. Abweichende Bestandsdateien werden **nicht** überschrieben. Anschließend nur geprüfte Quellen committen, keine Secrets oder fremden Medien.

## Entwicklungsstrategie ab jetzt

1. **openGym ist die maßgebliche fachliche/visuelle Trainings-Ausgangsbasis.** Originalcode möglichst unverändert und nachvollziehbar versionieren, bevor Änderungen vorgenommen werden.
2. Der bisherige React/TypeScript-/Dexie-RED-Fit-Core bleibt bis zur erfolgreichen Umstellung unter den bestehenden Projektpfaden funktionsfähig. Keine Datenbank-/Backup-Routen einfach ersetzen oder Nutzerdaten löschen.
3. Prüfen, welcher openGym-Frontend-Aufruf (React/JS, Vite 8, eigenes npm-Lockfile) und welche Server-Funktionen (Node `api/server.js`, Auth/Sync) notwendig sind. Eine reine statische Cloudflare-Worker-Site ist **kein** Ersatz für die Node-API. Keine öffentliche Produktion ohne geprüften Login-, Sync- und Datenschutzpfad.
4. Anschließend die eigenen RED-Fit-Ernährungsfunktionen und ausgewählte wger-/Dietry-Funktionalität **in diese eine openGym-basierte App** integrieren. RED Morph/BBT Bit bleiben nur Design-/iOS-Referenzen.
5. Erst nach `npm ci`, Tests, Build, Datenmigration/Backup, Auth-/Netzwerkprüfung und Plattformtests die aktive RED-Fit-Startkonfiguration umschalten. Bis dahin ist `vendor/opengym-upstream/` eine **Quellbasis**, keine bestätigte laufende App.


## Vorbereiteter Import als RED-Fit-Wurzel-ZIP

Zusätzlich wurde ein direkt in die Wurzel des RED-Fit-Checkouts entpackbares Archiv `RED-Fit-openGym-vendor-import.zip` erzeugt. Es enthält **ausschließlich** `vendor/opengym-upstream/...` mit allen 8.869 zulässigen Originaldateien (und eine maschinenlesbare Import-Info an der ZIP-Wurzel), keine produktiven RED-Fit-Dateien. SHA-256 des ZIPs: `7089f61e5939eb08968486dda7af1ffe10b0bda3bd0c6db2c6b48a77d80e071c`; ZIP-Integritätsprüfung bestanden. Das ZIP ist ein Chat-Artefakt und **nicht** im privaten GitHub-Repository hochgeladen.

Zusätzlich tatsächlich ausgeführt: `node --check` für **169/169** originale openGym-`api/**/*.js`/`.mjs`/`.cjs`-Dateien in einem isolierten lokalen Extract, ohne Syntaxfehler. `frontend/vite.config.js` wurde ebenfalls mit `node --check` syntaktisch geprüft. Dies ist **kein** npm-Install, API-Start, HTTP-/Auth-Test oder Frontend-Build.

Die 34 bereits auf GitHub übernommenen Dateien umfassen unter anderem `frontend/package-lock.json`, `frontend/vite.config.js`, `frontend/capacitor.config.json`, `frontend/src/index.css`, `frontend/src/sheets.jsx`, `api/package-lock.json`, die originale Frontend-/API-Grundstruktur und erste Komponenten. Es fehlen weiterhin zahlreiche `src/`-Module, API-Routen und Katalogdateien; ein unmittelbarer Start dieses unvollständigen GitHub-Teilbaums wäre nicht belastbar.
