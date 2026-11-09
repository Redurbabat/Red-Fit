# openGym als unveränderte Quellbasis für RED Fit

> **STATUSUPDATE 09.11.2026:** Der Originalimport wurde nachträglich **vollständig** abgeschlossen. Git-Blob-Hashvergleich: **21'977/21'977 identisch**, inklusive **13'108** Übungsmedien; letzter verifizierter Importkorrektur-Commit `043b7552ef604636262e85dacb3f613f609080e8`. Die folgenden früheren Zahlen 128/8'869 beschreiben einen älteren Zwischenstand. **Neue Produktentscheidung:** Original-openGym selbst wird als **RED Fit** weiterentwickelt, iPhone zuerst; siehe [docs/OPEN-GYM-IS-RED-FIT.md](OPEN-GYM-IS-RED-FIT.md). Bestehende Lizenzhinweise für Drittanbieter-Medien bleiben gültig.

Stand: 2026-11-08. **Nutzerentscheid:** Der Eigentümer hat ausdrücklich erklärt, dass openGym sein Repository ist und der Originalcode 1:1 als Ausgangsbasis für RED Fit übernommen werden soll. Damit hat openGym-Code-Übernahme Vorrang vor einer bloßen Funktionsadaption.

## Quellidentität und Reproduzierbarkeit

- Originalprojekt: [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym), geprüfter Git-Commit `8fb98b16861a2728652302a7e6e30c50548493a0` vom 4. November 2026.
- Vom Nutzer bereitgestelltes Archiv: `openGym-main(1).zip`, SHA-256 `7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09`.
- Vollständiger, separat aufbereiteter **Quellcode ohne fremde Gym-visual-Medien**: 8.869 unverändert kopierte Quelldateien, 77.652.954 Byte vor ZIP-Kompression. SHA-256 für jede der 8.869 Dateien geprüft: **0 Abweichungen**.
- Ausgeschlossen: 13.108 Dateien unter `catalogue/media/` (Ausnahme: `catalogue/media/NOTICE.md`). Laut Original-`NOTICE.md` sind diese Medien Gym visual vorbehalten. Das Eigentum am openGym-Repository beweist noch keine eigenständige RED-Fit-Medienlizenz.
- Unverändert beibehalten: `LICENSE` und `NOTICE.md` einschließlich Urheber- und Drittanbieterhinweisen. openGym steht unter AGPL-3.0-or-later; für öffentlich vernetzte Nutzung und Weitergabe Rechte- und Quellcodepflichten gesondert prüfen.
- Vollständiges Archiv und per-Datei-Prüfmanifest wurden lokal im Projekt-Chat erzeugt. Ein Chat-Artefakt ist **kein GitHub-Commit** und für weitere Chats nicht automatisch im Repository vorhanden.

## Tatsächlich im privaten GitHub-Repository

Der Ordner `vendor/opengym-upstream/` enthält inzwischen **128** Originaldateien direkt auf `main`: die zuerst importierten **34** Basisdateien, **70** zusätzliche, vollständig zusammengehörige Dateien des Progressionskerns sowie **24** weitere originale Coach-API-Module (`frontend/src/lib/`, einschließlich seiner sechs Modi, Tests, Historie und generiertem Übungskatalog). Die 70 neuen Dateien wurden einzeln anhand der SHA-1-Git-Blob-Prüfsummen mit dem Original verglichen (**70/70 identisch**); die ursprünglichen 34 Dateien waren bereits zuvor bytegleich bestätigt. **8.741 der 8.869 zulässigen Originaldateien liegen weiterhin noch nicht vollständig im GitHub-Repository.**

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

Die zuerst übernommenen 34 Dateien umfassen unter anderem `frontend/package-lock.json`, `frontend/vite.config.js`, `frontend/capacitor.config.json`, `frontend/src/index.css`, `frontend/src/sheets.jsx`, `api/package-lock.json`, die originale Frontend-/API-Grundstruktur und erste Komponenten. Die 70 neuen Progressions-/Abhängigkeitsdateien sind ein **zusammenhängender testbarer Teilbereich**, aber viele weitere `src/`-Module, API-Routen und Katalogdateien fehlen weiterhin. Ein vollständiger openGym-Frontend-/Serverstart aus dem GitHub-Teilbaum ist damit **noch nicht bestätigt**.


## Zusätzlicher 1:1-Nachweis: Progressionskern (8. November 2026)

- **Upstream-Commit:** `8fb98b16861a2728652302a7e6e30c50548493a0`; ZIP-SHA-256 wie oben. Die Progressionsdateien wurden im GitHub-Original mit festem Commit gelesen und in die identischen Pfade unter `vendor/opengym-upstream/` kopiert, ohne die Produktiv-App zu ändern.
- **Umfang:** exakt **70 neue Dateien / 2.118.063 Originalbytes**, einschließlich `progression.js`, zugehöriger Testdateien und sämtlicher relativer Importabhängigkeiten. **68/68** `.js`-Dateien mit `node --check` geprüft, **0 Syntaxfehler**; zwei Dateien enthalten JSON.
- **Unveränderlichkeit:** `tools/opengym-progression-source.lock.json` enthält die Git-Blob-SHA-1-Prüfsumme **jeder** der 70 Dateien. Die tatsächlichen **70 GitHub-`main`-Blob-SHAs wurden gegen diesen Lock verglichen: 70/70 identisch**. Die große `exercises-data.js` wurde nach dem 1-MiB-Limit des Standard-Connectors erfolgreich per Git-Blob-API übertragen und danach ebenfalls per SHA bestätigt. Ein kurzes Zwischenartefakt mit leerer Datei wurde sofort gelöscht; auf dem aktuellen `main` ist die vollständige Originaldatei vorhanden.
- **Ausführbarer Test:** `tools/opengym-progression.selftest.mjs` ist im npm-unabhängigen Offline-Test-Gate enthalten. Er lädt den **originalen** Progressionskern und verifiziert die sechs Modi, Regelwahl, unvollständige Sätze, Epley, Gewichtsgrid, Deload, Triple-Start, `off`, Planänderung, komplette 70-Datei-Importkette und die Git-Blob-Prüfsummen. **10/10 Tests auf Node.js 22.16.0 bestanden** in einer isolierten, aus dem Original-ZIP rekonstruierten Verzeichnisstruktur; Selftest- und Lockfile-Quellbytes entsprechen den auf GitHub gespeicherten Blobs.
- **Abgrenzung:** Kein vollständiger React-/Vitest-/Vite-Build, kein Node-API-Server, keine Auth-/Sync-Prüfung, keine Freigabe oder Umstellung des RED-Fit-Produktiveinstiegs. Die originalen `progression*.test.js`-Vitest-Suiten sind gespeichert, aber **nicht** als ausgeführt markiert. Die verbleibenden 8.765 Originaldateien und Datenmigration bleiben offen.


## Import-Fortschritt: Coach-API-Module (2026-11-08)

- Commit `f82fa1f1ccbc9215a7f8f58542fcb7d706301899` auf `main`: 16 unveränderte Originalmodule unter `vendor/opengym-upstream/api/coach/` übernommen (Adapter für Anthropic, Gemini, OpenAI und kompatible Endpunkte sowie Coach-Core-Helfer).
- Git-Blob-Hashes der 16 Module im Zielbaum mit den Blob-Hashes des fixierten openGym-Commits `8fb98b16861a2728652302a7e6e30c50548493a0` abgeglichen: **16/16 identisch**.
- Weiterhin **kein** Nachweis, dass diese Teilmodule eigenständig lauffähig sind oder dass die vollständige API bzw. der Frontend-Build funktioniert. RED-Fit-Produktivcode unverändert.
- Nächster Schritt: restlichen Quellstand mit `tools/import-opengym.py` aus dem SHA-256-geprüften Original-ZIP importieren und anschliessend Frontend/API/Tests validieren. RED Morph dient als separate Designreferenz.


## Weitere Coach-Module (2026-11-08)

- Commit `7ac465315d27c54329b759c383946b5620691b5d` importiert acht weitere unveränderte Dateien aus dem fixierten openGym-Commit (Claude-/Codex-/Spawn-Adapter, Cadence, Cohort, Konfiguration, HTTP-Adapter, Library).
- Der Git-Baum von `main` wurde nach dem Commit abgerufen: **128** Dateien unter `vendor/opengym-upstream/`; die acht neuen Blob-SHAs entsprechen dem Quellstand.
- **8.741** zulässige Originaldateien stehen noch aus. Kein nativer Build und kein vollständiger openGym-Serverstart nachgewiesen. RED Morph ist Designreferenz, nicht Trainings-Quellbasis.

## Optionaler Komplettimport inklusive Medien (2026-11-09)

Auf ausdrücklichen Wunsch des Repository-Betreibers ist das Importwerkzeug um die **optionale** Flag `--include-media` erweitert (Commit `196d59df0982dcea49e4d7fe91876cac28ff9485`). Sie nimmt zusätzlich die **13.108** Dateien unter `catalogue/media/` auf, wenn die entsprechenden eigenständigen Nutzungsrechte vorliegen. Der Standardimport ohne Flag schliesst sie weiterhin aus.

Die ursprüngliche `NOTICE.md` benennt Gym visual als Rechteinhaber der Übungsmedien und begrenzt deren Nutzung in anderen Anwendungen. Weder Besitz eines ZIP-Archivs noch Inhaberschaft eines Forks ist ein Nachweis für diese Nutzungsrechte. Vor Veröffentlichung, Cloudflare-Deployment oder Veröffentlichung nativer Installationspakete mit diesen Medien die Rechte gesondert klären.

Auf Windows im geklonten RED-Fit-Repository (PowerShell mit installiertem Python-Launcher):

```powershell
git switch main
git pull --ff-only origin main
py -3 .\tools\import-opengym.py "C:\PFAD\openGym-main(1).zip" --include-media
py -3 .\tools\import-opengym.py "C:\PFAD\openGym-main(1).zip" --include-media --apply
git add -- vendor/opengym-upstream
git commit -m "vendor(opengym): import verified full source with licensed exercise media"
git push origin main
```

Die beiden ZIP-Durchläufe prüfen die bekannte SHA-256 des Originalarchivs, beugen gefährlichen ZIP-Pfaden vor, überspringen byteidentisch bereits importierte Dateien und verweigern abweichende Bestandsdateien. Der Dry-Run ändert nichts. Ohne die originalgetreue ZIP-Prüfsumme wird nichts importiert.

**Stand beim Einführen des Flags:** erst 128 Dateien sind auf `main` importiert. Mit optionalen Medien beträgt der geplante Gesamtumfang **21.977 Dateien** (8.869 Quell-/sonstige Dateien und 13.108 Übungsmedien). Ein vollständiger Upload oder Gerätebuild ist hiermit nicht nachgewiesen.
