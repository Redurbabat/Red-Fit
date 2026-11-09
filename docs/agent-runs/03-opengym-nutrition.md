# Agent 03 — Ernährung in original-openGym (2026-11-09)

**Branch:** `agent/redfit-03-nutrition` · PR gegen `main` · kein Selbst-Merge.

## Verbindliche Ausgangslage
- Eigentümerentscheid aus `docs/OPEN-GYM-IS-RED-FIT.md`: Original-openGym unter `vendor/opengym-upstream/` ist das Produkt, Root-`src/` nur Legacy-Funktionsreferenz. iPhone zuerst, keine öffentliche Veröffentlichung.
- Gelesen: `AGENTS.md`, `CLAUDE.md`, `ARCHITEKTUR.md`, `docs/OPENGYM-BASELINE.md`, Obsidian `00`/`07`/`08`/`09`, Original-`README.md`/`NOTICE.md`, `docs/DIETRY-COOKED-WEIGHT.md`, `docs/MEAL-LOG-INTEGRITY.md`, `docs/BACKUP-MEAL-COLLISION-SAFETY.md`, `docs/2031/DATA_MODEL_V2.md` und RED-Morph-Skill inkl. `references/COMPONENT_CONTRACT.md`.
- Originalcode geprüft: `frontend/src/App.jsx`, `views/Home.jsx`, `components/TabBar.jsx`, `store/useStore.js`, `lib/state-json.js`, `lib/sync-merge.js`, `lib/guest.js`, `lib/mobile.js`, `lib/format.js` und `frontend/package.json`.

## Tatsächliches original-openGym-Datenmodell
- Workout-/Profilzustand wird in `useStore.js` per `gym_state_v1`/Zustand nach `localStorage` geschrieben; auf Mobilgeräten gibt es eine native Dateispiegelung, automatisches Workout-Backup, optionalen Server-Sync und konfliktbehaftete/markierte Merge-Regeln.
- `importBackup` ersetzt/merged einen vollständigen openGym-Zustand. Ein beliebiges neues `S.nutrition`-Feld nur an `DEF` anzuhängen, würde **noch keinen kollisionssicheren Sync/Backup** belegen; `sync-merge.js` ist für Workouts, Routinen etc. spezialisiert.
- Deshalb **keine** Änderungen an `gym_state_v1`, originalem `importBackup`, `sync-merge.js`, Node-API, Workouts oder Health/Widgets.

## Implementierter vertikaler Flow — Stand dieses Branches
1. Neue reine, validierte Ernährungsdomäne `frontend/src/nutrition/model.js`: Lebensmittel pro 100 g, Kalorien/Protein/Kohlenhydrate/Fett, manuelle Barcode-Zeichenfolge (führende Nullen), Mengenberechnung ohne vorzeitiges Runden, Mahlzeiten-Snapshots und lokaler Tages-Key.
2. Neue separate IndexedDB `redfit-nutrition-v1:<scope>` (`nutrition/repository.js`) mit atomarem Anlegen/Löschen. `scope` ist `local` für Gäste und `account:<server-url>:<user.id>` (URL-kodiert) für Konten. Das vermeidet Datenvermischung bei derselben numerischen Konto-ID auf unterschiedlichen selbst gehosteten openGym-Servern. Falls die Native-Paarung fehlt, wird der isolierte Namensraum `unpaired` verwendet (keine Pflichtanmeldung). Der Datenbankname greift nicht in openGym-Workout-Daten ein. Jeder Speichervorgang meldet Fehler und behauptet keinen Erfolg vor bestätigter Transaktion.
3. `views/Nutrition.jsx` und `nutrition/nutrition.css`: Food anlegen → Menge/Meal-Type/Datum → Vorschau → Speichern → Tagesmakros und löschbare Mahlzeiten. Mobile Touch-Ziele >=44 px, iPhone-Bottom-Safe-Area, automatische Scope-Neumontage bei Nutzerwechsel, Offline-Nutzung, keine Pflicht-API.
4. Eigener JSON-Export/Import mit Format `redfit-nutrition` v1, strikter Whitelist-/Zahlenvalidierung und idempotentem Merge. Unterschiedliche Snapshots mit gleicher ID erhalten stabile Recovery-IDs. Import wird vollständig validiert vor einer einzigen IndexedDB-Readwrite-Transaktion. Alte Trainingsdaten werden dabei nie geändert.
5. Minimale Integrationspunkte im **Original**-`App.jsx` (lazy Route `/nutrition`) und `views/Home.jsx` (Ernährungskarte). Keine Änderungen an TabBar, globalem CSS, iOS-/Capacitor-Dateien, Node-API oder Root-PWA.

## Qualität / Tests — genau benannte Evidenz
- Auf den direkt vom GitHub-Branch erneut gelesenen und SHA-referenzierten **committeten** Dateien: sieben `model.test.js`-Testfälle in einem leichten JavaScript/V8-Adapter ausgeführt: **7/7 bestanden**. Dieser Adapter implementiert die verwendeten Vitest-Assertions; dies ist **kein** echter Vitest-Lauf mit dem Projekt-Lockfile.
- Zusätzlich Syntax von `model.js` und `repository.js` in V8 geprüft; `scope.js` wurde als bytegenaues Repository-Git-Blob (`fc4972a09a6be7c4ff3b8253991f5f9ab210441e`) unter Node.js 22.16.0 mit `node --check` geprüft; **8/8 unabhängige Node-Assertions** für Gäste, URL-Normalisierung, Server-, Nutzer- und Pfadtrennung, Web-Origin, Native-unpaired und Geheimnisausschluss bestanden (separater manueller Prüflauf; die committierten Vitest-Tests `scope.test.js` wurden noch nicht mit Vitest ausgeführt); Routing-, Home-Button-, per-Account-Scope- und Backup-Import/Export-Integrationsanker gegen den Branch-Quelltext geprüft: alle vorhandenen Anker bestätigt.
- **Nicht ausgeführt:** `npm ci`, `npm test`/echtes Vitest, Vite-Build, React/JSX-Compiler, realer IndexedDB-Transaktionstest, iOS-Simulator, physisches iPhone, Capacitor-/IPA-Build. Kein erfolgreiches Geräte-Backup/Restore oder Server-Sync behauptet.

## CI-Status beim PR-Öffnen (zusätzlicher Prüfversuch)
- GitHub-Actions-Run `42703051887` für den Branch: **completed / failure**. Jobs `verify` (`129452578493`) und `offline-regressions` (`129452579085`) meldeten jeweils `failure`.
- Beide Jobs gaben über die Job-Steps-Schnittstelle **0 Schritte** zurück; Job-Logs waren mit HTTP 404/`BlobNotFound` nicht abrufbar. Aus diesem Ergebnis lässt sich **kein App-Test-Fehler und kein ausgeführter npm-Test beweisen**; CI bleibt rot, Ursache (Runner/Workflow/Plattform) muss anhand GitHub Actions untersucht werden. Vor PR-Merge vollständige Test- und Buildbelege nachreichen.

## Offene Risiken / Freigabeblocker
- **Wichtig für Nutzer:** Die originalen openGym-Backups, Auto-Backups, der native State-Mirror und der Server-Sync beinhalten die neue Ernährungsdatenbank **noch nicht**. Ernährung muss vor Gerätewechsel, App-Löschung oder Neuinstallation **separat über den Ernährungsscreen exportiert** werden. Kein unbemerkter Cutover ohne getestete Migration/Backup-Integration.
- Account-Scope trennt jetzt zusätzlich die normalisierte **Server-Basis-URL**. Die ältere kurzzeitig im Agent-Branch eingeführte `account:<user.id>`-IndexedDB wird **nicht automatisch verschoben**: eine automatische Zuordnung ohne ursprüngliche Server-ID wäre unsicher. Für bereits im alten Agent-Build angelegte Ernährungseinträge ist vor Umstellung ein expliziter JSON-Export und Import in den neuen Scope erforderlich. Für App-/Server-URL-Wechsel bleibt ein dokumentierter Migrationspfad offen.
- OpenGym-Legacy-`src/features/nutrition`/-`recipes`/-`shopping` ist weiterhin lesend Referenz, **noch keine Datenmigration** der dortigen Dexie-Stores. Rezeptplanung, Einkaufslisten, Roh-/Gekocht-Yield, Barcode-Kamera, Tagesziele, serverseitiger Ernährungssync, gemeinsame Sicherung und E2E sind Folgeaufgaben.
- Koordinationshinweis an Agent 02 (UI) / Agent 04 (iPhone): `App.jsx` und `Home.jsx` wurden nur um Route und Startkarte ergänzt. Vor einem Merge Konflikte mit Navigation/Branding abstimmen; nicht per Reset verwerfen.
- Kein `main`-Push, keine App-Store- oder öffentliche Web-Veröffentlichung, keine Secrets.

## RED Morph KEEP / REWORK / ARCHIVE / DELETE-CANDIDATE
| Entscheidung | Pfade | Grund |
|---|---|---|
| KEEP | original openGym `store/useStore.js`, original Backup/Sync, iOS-Quellen und TabBar | Bestehende Funktionalität und Nutzerdateien schützen |
| REWORK | neuer Ernährungsscreen/Scoped CSS | Echter funktionaler iPhone-Flow vor zusätzlicher Animation; vollständige visuelle Geräte-QA offen |
| ARCHIVE (nur konzeptionell) | Root-`src/features/nutrition` und Legacy-PWA | Code weiterhin erhalten und als spätere sichere Migrationsreferenz lesbar |
| DELETE-CANDIDATE | keine | Keine unüberprüfte Löschung |

## Konkrete nächste Schritte
1. Agent 04 verifiziert original-iPhone-Runtime; Agent 03 führt **im selben Branch/PR** danach echten `npm ci && npm test && npm run build` und iPhone-Meal-/Backup-Roundtrips aus.
2. Erst nach Backup-Migrationstest JSON-/Native-Export der Ernährung mit dem originalen openGym-Backup und Auth-/Sync-Pfad zusammenführen; keine alten Workout-Daten überschreiben.
3. Danach Rezepte, Mahlzeitenplanung, Einkaufslisten und optional Dietry-Gekocht-Konversion als additive Module mit Tests integrieren. Originalmedienhinweise und AGPL/NOTICE nicht entfernen.

## Fortsetzung — Account-Isolation und Test (2026-11-09)
- Neu: `frontend/src/nutrition/scope.js` + `scope.test.js`; `views/Nutrition.jsx` liest zusätzlich `useStore(s => s.sync?.server)` und erhält eine URL-normalisierte, kontenbezogene IndexedDB. Kein Passwort, Token oder URL-Query im Scope.
- **Ausgeführt:** Git-Blob-kongruentes `scope.js` mit Node v22.16.0 syntaktisch geprüft; 8/8 eigene Node-Assertions bestanden. Dies ist kein realer Browser-/Native-IndexedDB-Test. Vitest-Testfälle committed, nicht ausgeführt.
- **Nicht ausgeführt:** npm-/Vite-/Capacitor-Build, integrierte Login-/Logout- und Geräte-Migration. Kein PR-Merge.

## Fortsetzung — native Ernährungssicherung (2026-11-09)

### Implementiert
- Neue Datei `frontend/src/nutrition/native-backup.js`: vor jedem Schreiben wird ein vollständiges, mit `validateBackup` geprüftes Nutrition-JSON hergestellt. Der Ordner unter `Directory.Documents` ist pro Nutrition-Scope SHA-256-hashbasiert; Pfad enthält keine Konto-ID, Server-URL oder Geheimnisse.
- Nach erfolgreich abgeschlossener IndexedDB-Änderung (Lebensmittel hinzufügen, Mahlzeit eintragen/löschen, JSON importieren) erstellt `views/Nutrition.jsx` im nativen App-Build **zusätzlich** eine tägliche JSON-Datei `RED-Fit/Ernaehrung/<sha256>/redfit-nutrition-YYYY-MM-DD.json`. Ein anderer Tag bekommt eine andere Datei. Fehlgeschlagene Dateioperationen werden als **Warnung** angezeigt und machen eine bereits erfolgreich gespeicherte IndexedDB-Mahlzeit nicht nachträglich zu einem angeblichen Fehler.
- Ein synchrones `busyRef` verhindert doppeltes Speichern durch schnelle Mehrfachbetätigung.
- Die UI weist ausdrücklich darauf hin, dass diese automatisch im **App-Dokumentenordner** erstellten Dateien **keinen Schutz vor App-Deinstallation** garantieren und vor Gerätewechsel/App-Löschung über einen separaten manuellen JSON-Export oder eine externe Kopie gesichert werden müssen. Native Speicherung wurde nicht als erfolgreich auf dem Gerät bezeichnet.
- Neues Vitest-File `native-backup.test.js` mit 10 weiteren Regressionstests in Branch/PR; **Vitest noch nicht ausgeführt**.

### Tatsächlich durchgeführte Prüfungen
- Node.js 22.16.0: `node --check native-backup.js` bestanden.
- Source-Identität überprüft: Der mit Node geprüfte Inhalt hat Git-Blob SHA-1 `8e66bc7e01e6ce8c9abb9febbff0401470ece486`, identisch mit GitHub-Branch.
- `node --test backup.test.mjs` auf diesem identischen Modul mit lokalem *Test-Doppel* für `model.js` (weil echte Vitest-/Capacitor-Abhängigkeiten nicht installiert sind): **10/10 bestanden**. Geprüft: deterministische SHA-256-Verzeichnisse, Konto-/Serverisolation, Tagesrotation ohne überschreiben älterer Tage, Pfadvalidierung, erfolgreiches Schreiben in mock `Directory.Documents`, JSON-/Schema-Ablehnung vor Schreibversuch, Storage-/Crypto-/Plugin-Fehler. **Kein echter iOS-Filesystem-/IndexedDB-Roundtrip, kein Vitest-Test und kein iPhone-Build.**
- Die produktiven UI-Integrationspunkte wurden am GitHub-Branch geschrieben. Ein React/JSX-Compilerlauf fehlt weiterhin.

### Offene Risikobedingungen
- Der native Dateipfad ist noch nicht mit der tatsächlichen iOS-Dateien-App, Android-Gerätespeicherung, den Dateifreigabe-Entitlements oder Geräte-Backup-Einstellungen getestet.
- Ein daily Snapshot ist **zusätzlich**, aber nicht das bestehende openGym-Workout-Backup: automatische Sicherung nur nach Änderungen über den Nutrition-Screen, nicht nach Aktionen in anderen noch zu bauenden Modulen. Kein automatischer Restore.
- Das bestehende openGym-Autobackup/JSON-Import/Server-Sync enthält weiterhin keine Ernährung; deshalb keine falschen Versprechen für Gesamt-Backup. Die Funktion muss vor einem Release mit iOS/Android-Dateiberechtigungen und Rückimport geprüft werden.
- Die Dateisicherungen sind lokal unverschlüsselte JSON-Inhalte. Wer Zugriff auf die Dateien hat, kann die Mahlzeiten lesen. Ein SHA-256-Dateiordner ist **keine Verschlüsselung**.
- Keine Codeänderungen in fremden Agenten-Branches, originalen iOS-/Capacitor-Dateien, Workout-State, Root-PWA, `api/`, `sync-merge.js` oder bisherigen Backup-Verträgen.

**Nächste Aufgabe:** echten Vitest-/Vite-Build und den Roundtrip auf dem iPhone nachholen; danach gezieltes Import-/Migrationskonzept für das gemeinsame openGym-Backup mit rückwärtskompatibler Validierung vorsehen.

### CI-Kontrolle nach dem neuen Commit
- GitHub Actions PR-Run `42705252620` für diesen Branch: `completed/failure`. Jobs `offline-regressions` (`129460238743`) und `verify` (`129460239298`) melden beide Fehler.
- **Diagnose:** Beide Jobs geben per GitHub-API **0 Steps** zurück; beide Logabrufe liefern **HTTP 404 / BlobNotFound**. Ein fehlgeschlagener Node-, Vitest- oder Vite-Befehl lässt sich deshalb nicht nachweisen. CI gilt weiterhin als **nicht bestanden**; vollständige Runner-/Build-Ursache muss separat geklärt werden.


## Fortsetzung — lokale Wiederherstellung mit Rückfall auf letzte gültige Sicherung (2026-11-09)

### Produktänderung
- `frontend/src/nutrition/native-backup.js`: `readLatestNutritionDocumentBackup(scope)` liest nur im SHA-256-Verzeichnis des aktiven Accounts (einschliesslich Server-Basis-URL) in `Directory.Documents`. Filtert ausschliesslich Dateien mit sicheren Namen und korrekten Kalendertagen, überspringt Verzeichnisse. Prüft JSON und `validateBackup` vor jeder Übergabe an den Import, begrenzt gelesene JSON-Strings auf 64 MiB. Bei beschädigter jüngster Datei wird der nächste gültige ältere Tagesstand gesucht; ist kein gültiger Stand vorhanden, erscheint eine nachvollziehbare Fehlermeldung.
- `views/Nutrition.jsx`: iPhone/Android-Schaltfläche „Letzte Gerätesicherung wiederherstellen“. Bestätigungsdialog mit konkretem Sicherungsdatum; anschliessend ausschliesslich der bestehende **zusammenführende** `importNutrition` (nicht `clear`/Overwrite) über den bekannten UI-Speicherpfad. Das lokale Dokumentenbackup ersetzt keinen externen Export und keinen OpenGym-Server-Sync. Die UI verspricht nicht mehr, der native Ordner sei zwingend in der iOS-Dateien-App sichtbar.
- `native-backup.test.js`: fünf neue Vitest-Testfälle (nun 15 im File) für neueste gültige Datei, kaputte neueste Datei/ältere gültige, Schemafehler, fehlendes Verzeichnis und Filename-/Pfadfilter. **Vitest nicht ausgeführt.**

### Unabhängiger ausgeführter Test
- GitHub-Quellstände exakt gegen lokale Dateien mittels `git hash-object` abgeglichen: `model.js` `a7c446de8fc872b568285be2d8a6fe754fef3b98` und `native-backup.js` `45d89b373497f9d360c910da814a69ec68325368`; beide stimmen mit den SHA-1-Blobs auf dem GitHub-Branch überein.
- `node --check model.js` und `node --check native-backup.js`: bestanden unter Node.js v22.16.0.
- `node --test restore.test.mjs` auf den **exakten Domänen- und Backup-Modulen** (KEIN Ersatz-Domänenvalidator), mit in-memory Test-Doppel ausschliesslich für die native Filesystem-Plugingrenze: **10/10 Tests bestanden, 0 Fehler**. Belegt unter anderem Schreib-/Lese-Roundtrip, richtiges Datum und korrekte Mahlzeiten, Konto-/Serverisolation, intakte ältere Kopie, Fallback bei beschädigter neuester Datei, Validierung vor Schreibzugriff, Verzeichnis-/Pfadsicherheit, Schutz bestehender Datensätze beim Merge.
- Lokale Node-Testdatei liegt unter `/mnt/data/nutrition_restore_check/restore.test.mjs`; das Repository enthält die eigenständigen 15 Vitest-Fälle. Die Node-Läufe nutzen **kein** iOS-Capacitor-Plug-in und sind kein echter Geräte- oder React-Render-Test.

### Verbleibende Blocker
- iPhone/IPA/TestFlight-/Dateifreigabe- und echter WebView-/IndexedDB-Dateisystem-Roundtrip fehlen. Ohne native Umgebung kann die neue `Filesystem.readdir/readFile`-Integration nicht als auf iOS verifiziert gelten.
- GitHub-Actions-CI weiterhin nicht als bestanden nachgewiesen (letzter geprüfter Run `42705252620` mit Jobfehlern ohne abrufbare Logs).
- Getrennte lokale Nutrition-Datenbank und originales openGym-Workout-Backup/Server-Sync sind weiterhin **nicht** vollständig integriert.
- Weitere Rezept-, Wochenplan- und Einkaufslistenfunktionen stehen aus. Ein manuell exportiertes JSON bleibt die sichere Massnahme für Gerätewechsel/Deinstallation.


## Fortsetzung — Rezeptkomposition und Portionen direkt in original-openGym (2026-11-09)

### Implementiert
- `frontend/src/nutrition/model.js`: `validateRecipe` und `makeRecipeFood`. Rezepte bestehen aus 1–50 Zutaten mit unveränderlichen Portions-/Mengen- und Nährwert-Snapshots. `yieldGrams` ist das zubereitete Gesamtgewicht; die Makros je 100 g werden korrekt aus den Zutaten plus Zubereitungsverlust/-gewinn errechnet (keine pauschale Gleichsetzung Roh- und Kochgewicht). `validateFood` prüft Rezeptintegrität, Lebensmittel- und Zutatenwerte, und entfernt unbekannte Importfelder.
- **Keine DB-Migration erforderlich:** Ein Rezept bleibt ein normales `food` mit optionalem, geprüftem `recipe`-Feld. Der ursprüngliche `foods`-IndexedDB-Store und das JSON-Format `redfit-nutrition/version:1` bleiben erhalten; ältere Lebensmittel und Backups weiterhin gültig.
- `views/Nutrition.jsx`: einklappbarer, iPhone-bedienbarer Rezepteditor. Zutaten aus lokalem Lebensmittelkatalog hinzufügen/entfernen; Rezeptname, Portionen und optionales zubereitetes Gewicht einstellen; Rezept speichern, Zutaten anzeigen, direkt **eine Portion** für aktuellen Mahlzeitentyp/Tag erfassen oder Rezept als Lebensmittel auswählen. Benutzt weiterhin `saveFood`, `saveMealEntry`, `refresh` und den additiven nativen Snapshot-Pfad. Kein Internetkonto, keine Backendänderung.
- `nutrition/nutrition.css`: ausschliesslich gekapselte Stilregeln für neue Rezeptfelder/Listen, 44px-Touchziele und eingeklappte Standardansicht; keine globale TabBar-/Dock-Änderung.
- `nutrition/recipes.test.js`: zehn Vitest-Regressionen zu Rezeptsumme, Kochgewicht, Portion/Meal-Eintrag, Legacy-v1-Backup, Rezept-JSON-Roundtrip, manipulierten Nährwerten, ungültigen Zutaten/Mengen/Portionen und Merge-Kollisionen. **Im Branch vorhanden, echtes Vitest nicht ausgeführt.**

### Tatsächlich ausgeführte Prüfung
- Das `model.js` direkt aus dem GitHub-Branch (Quellblob `b7d121de11f3e7273a425ce53a398155da295d1f`) wurde in der JavaScript-V8-Laufzeit aus dem originalen Source-Text geladen und mit **10 eigenen tatsächlichen Assertions** geprüft: Makros pro 100g, zubereitetes Gewicht, v1-Backup-Roundtrip inkl. Rezeptdetails, Meal-Logging, unverändertes Legacy-Food, Manipulationsschutz, leeres Rezept, fehlerhafte Portionen/Ertrag und importierte ID-Kollisionen. **10/10 bestanden.** Das ist weder Vitest noch ein Vite-/React-/iOS-Build.
- Den integrierten UI-Quelltext nach Änderung gegen GitHub-Fassung auf sichtbare Funktions- und Layoutanker kontrolliert; kein JSX-Compiler-/Touch-Gerätetest durchgeführt.
- Die bisherigen 10/10 Node-Tests für native Backup-Wiederherstellung (separate frühere Fortsetzung) wurden **nicht** erneut ausgeführt und nicht als neue Belege gezählt.

### Offen
- GitHub Actions CI-Runner liefert weiterhin keine nutzbaren Schritte; Lauf des originalen openGym-Frontend `npm ci && npm test && npm run build:mobile` und iPhone-Simulator fehlen.
- Rezepte speichern bislang Zutaten-Snapshots, nicht eine separate versionierte Rezeptbibliothek mit Bearbeitung/Vervielfältigung. UI-Editor, visuelle Qualitätskontrolle sowie reale 1-Portion-Interaktion auf iPhone prüfen.
- Wochenplanung, Einkaufslisten, Migration aus altem Root-RED-Fit, vollständiger gemeinsamer Workout-/Nutrition-Backup-/Server-Sync weiterhin offen.


## Fortsetzung — 7-Tage-Planung, Einkaufslisten und sichere Datenmigration (2026-11-09)

### Codeänderungen im ORIGINAL-openGym
- `frontend/src/nutrition/model.js`: `makePlannedMeal` erstellt unabhängige, validierte Nährwert-Snapshots; bei Rezepten werden Zutaten nach Portionen relativ zum zubereiteten Gesamtgewicht korrekt umgerechnet. `planDates` liefert sieben lokale Kalendertage (auch Monats-/Jahreswechsel), `shoppingListOf` addiert offene Zutaten je Lebensmittel. `validatePlannedMeal` trennt `planned`/`done` und hält verknüpfte Tagebuch-ID fest.
- `frontend/src/nutrition/repository.js`: **additives** IndexedDB-Schema-Upgrade **v1 → v2** unter *demselben* DB-Namen `redfit-nutrition-v1:<scope>`, ohne existierende `foods`/`entries` zu löschen. Neues Store `plans` mit Tagesindex. `completePlannedMeal` erstellt Tagebucheintrag und markiert Plan als erledigt innerhalb derselben `readwrite`-Transaktion. Zweite Bestätigung darf keine zweite Kalorienbuchung auslösen; Rollback bei Fehlern.
- `exportNutrition` schreibt jetzt `redfit-nutrition/version:2` mit `foods, entries, plans`. `validateBackup` und `importNutrition` akzeptieren weiterhin **alte v1-Dateien** ohne Pläne, bewahren beim v1-Import bereits vorhandene v2-Pläne und führen v2-Datensätze ohne globale Löschung zusammen. Native Tagesdatei-Sicherung/Restore benutzt denselben generischen Validierungspfad und kann daher v1/v2 JSON lesen.
- `frontend/src/views/Nutrition.jsx`: Wochenansicht, Plan anlegen/entfernen, Tagebuch-Übernahme, Anzeigen erledigter Pläne, Shoppingliste nur aus offenen geplanten Mahlzeiten. Einkaufsliste offline als Textdatei über native Share-Sheet / Browserdownload exportierbar; nach Tagebuch-Übernahme springt die Eintragsübersicht auf den gebuchten Tag. Datumsfeld-Reset wird abgefangen. Manueller Datei-Import bleibt bewusst grössenbegrenzt, Limit an den Snapshot-Reader auf **64 MB** angepasst.
- `nutrition.css`: gekapselte kompakte iPhone-/Responsive-Stile, weder original-TabBar noch Workout-Views verändert.

### Geprüfte Ergebnisse — tatsächliche Ausführung
- **21/21** eigenständige JavaScript-V8-Prüfungen der originalen GitHub-`model.js`-Fassung (Git-Blob `b12ec4b3ccc2135990f547727673f27773fac7bd`): v1/v2, Wochendaten, Rezepte, Einkaufsmengen, Planstatus, Manipulationsschutz, ID-Kollision.
- **11/11** eigenständige V8-Prüfungen der originalen GitHub-`repository.js`-Fassung (Git-Blob `37283d08191ed01c8431e19ce98ef8f3b05b06d7`) unter *simulierter IndexedDB*, einschliesslich v1→v2 Upgrade, unveränderten Trainings-/Tagebuchdaten, atomarem Abschluss, doppeltem Abschluss, v1-Import und v2-Idempotenz, isoliertem Konto, Fehler-/Transaktionsrollback und Löschung offener Planung. **Simulierte IndexedDB ist kein echter WKWebView-/Safari-Roundtrip.**
- Neu im Branch eingecheckt, aber **nicht als Vitest ausgeführt**: `nutrition/planning.test.js` mit 12 Testfällen und `nutrition/repository.test.js` mit 10 Testfällen auf eigenständigem IndexedDB-Test-Doppel ohne neue npm-Abhängigkeiten.
- Danach Test-Quellen sowie `model.js`/`repository.js` von GitHub erneut gelesen; JavaScript-Syntax aller vier Dateien mit `new Function` nach Entfernen von Import-/Export-Zeilen erfolgreich geprüft. Dabei einen fehlerhaften Vitest-Assertion-Ausdruck tatsächlich entdeckt und im Branch korrigiert.
- **Nicht nachgewiesen:** CI, echtes Vitest (`npm test`), Vite-Build/JSX-Compiler, iOS/Android-Dateisystem, tatsächlicher IndexedDB-Upgrade im WKWebView, reale Einkaufsliste-Sharing-Aktion.

### Versions- und Wiederherstellungsrisiken
- **Downgrade nicht automatisch:** Ältere Agent-Testbuilds, die dieselbe IndexedDB nur als Version 1 öffnen, können eine auf v2 aktualisierte DB nicht ohne Migration öffnen (`VersionError`). Der Upgradepfad darf daher nicht unbedacht zurückgerollt werden.
- **Backup-Vorwärtskompatibilität begrenzt:** Ein neuer v2-JSON-Export lässt sich mit älteren v1-only-Importer-Builds nicht einlesen. Dies ist kein Datenverlust, aber für Downgrades ist ein expliziter Migrationspfad nötig. Alte v1-Backups bleiben unter der neuen Version lesbar.
- Shopping ist derzeit ein **abgeleiteter** Einkaufszettel aus offenen Planungen, kein separater synchronisierter Checklisten-Speicher mit bereits-gekauft-Markierung; beim Abschliessen einer Mahlzeit verschwindet ihre Zutatenmenge aus der offenen Einkaufsliste.
- Originale openGym-Workout-Backups, Server-Sync und Workout-State enthalten Ernährung/Planung **noch nicht**. Manuelle externe Sicherung bleibt vor Gerätewechsel/App-Löschung notwendig.
- Keine Änderung an fremden Agenten-Branches, Root-PWA, originaler iOS-Projektarchitektur oder den originalen openGym-Workout-Backup-Verträgen.

### Nächster Verifikationsschritt
`npm ci && npm test && npm run build:mobile` im originalen openGym-Frontend unter funktionierendem CI/iOS-Runner, danach reales iPhone-Szenario: altes v1-Ernährungstagebuch → v2-Migration → Rezept/Plan → Einkaufsliste → als gegessen eintragen → native Backup-Datei exportieren/neu importieren. Erst mit echtem Roundtrip freigeben.


### CI-Fehler jetzt konkret lokalisiert (Run `42710138031`)
- `offline-regressions`: **success**. `verify`: **failure**.
- Nachweislich erfolgreich im `verify`-Job: `npm ci` (Root-Projekt, 512 Pakete installiert) und `npm run typecheck`. **Fehlgeschlagen**: `npm run lint` bei `src/services/workout/setNotes.ts:10:14` wegen ESLint `no-control-regex` (der vorhandene reguläre Ausdruck `/[\\u0000-\\u001f\\u007f]/g`). Die Schritte `npm run test` und `npm run build` wurden danach **übersprungen**, sind nicht bestanden.
- Der Root-Workout-Datei-Blob ist auf `main` und `agent/redfit-03-nutrition` identisch: `7217d9cf9736c03bd7d921ba0a33b4b4b7aa1669`. Fehler ist somit **nicht von Agent 03 eingeführt**. Root-`src/` gehört laut Agent-Dateihoheit nicht zu diesem Ernährungsauftrag; bewusst keine Änderung an Workout-Code vorgenommen.
- Wichtig: Selbst ein später erfolgreicher Root-Build beweist nicht automatisch den **separat installierten original-openGym-Frontend-Build** unter `vendor/opengym-upstream/frontend/`. Für iPhone-Freigabe müssen die Vitest-/Vite-/Capacitor-Tests dort separat laufen.
- Benötigte Koordination: Root-Workout-Lintfehler im zuständigen Agenten-/Hauptbranch beheben und einen nachweislichen Build des originalen openGym-Frontends ausführen. PR #15 bleibt bis dahin offen.


## Fortsetzung — echte Vitest- und Vite-Build-Prüfung im ORIGINAL-openGym (2026-11-09)

### Vorgehen und tatsächliche Ergebnisse
- Neu: `.github/workflows/opengym-nutrition.yml` im bestehenden Agent-03-Branch/PR #15. Arbeitet **ausschliesslich** unter `vendor/opengym-upstream/frontend/`, wird von PR-Änderungen an Ernährung/UI/Workflow ausgelöst und läuft getrennt vom Root-`ci.yml`. Keine Änderungen an originalem Workout-State oder Root-Workout-Lint.
- GitHub Actions **Run `42710935902`, Job `129479962784`: completed / success**. Echte Runner-Schritte und Logs abgerufen und geprüft:
  1. `npm ci --no-audit --no-fund`: **success** im originalen openGym-Frontend.
  2. `npx vitest run src/nutrition`: **6 Testdateien, 61/61 Tests bestanden** (planning 12, native-backup 15, repository 10, recipes 10, model 7, scope 7). Vitest **v4.1.12** im GitHub-Runner.
  3. `VITE_MOBILE=1 npm run build`: **success**, Vite **v8.3.5**, **475 transformierte Module**, eigenständige `dist/assets/Nutrition-*.js` und `Nutrition-*.css` erzeugt. Build-Zeit 2.06 s.
  4. Nachgelagerte Assertion prüft `dist/index.html` auf **`opengym-flavor=mobile`** und existierende JS-Assets: **success**, Log: `Original openGym mobile-flavour bundle verified`.
- Vite meldete nur **nicht-blockierende Warnungen** zu grossen Chunks und einer dynamischen Capacitor-Import-Aufteilung. Kein tatsächlicher iOS-Binärbuild, Xcode-Signing, `cap sync`, WKWebView-/Geräte-, UI- oder automatisierter Apple-Files-App-Test wurde durchgeführt.

### CI-Einordnung
- Die ältere Root-`.github/workflows/ci.yml` bleibt durch **vorbestehendes** Root-Workout-ESLint-Problem blockiert: `src/services/workout/setNotes.ts:10:14` `no-control-regex`. Der neue separate openGym-Test ist erfolgreich, aber behebt **nicht** diesen Root-CI-Fehler.
- Noch offen vor PR-Merge/Release: vollständiges ursprüngliches openGym-Regressionssuite (`npm test` im Original-Frontend, nicht nur `src/nutrition`), nativer `cap sync`/Xcode-iPhone-Build und tatsächlicher Datenbank-v1→v2-/File-Backup-Roundtrip auf iPhone, Cross-Agent-Navigation und gemeinsames Workout-/Nutrition-Backup.
- Angelegt und nachgeprüft: PR #15 bleibt offen, nicht gemergt; `main` unangetastet. Kein Zugriff auf externe persönliche Ernährungs-/Trainingsdaten nötig.


## Fortsetzung — vollständige originale openGym-Testregression (2026-11-09)

- `.github/workflows/opengym-nutrition.yml` wurde erweitert: Nach den gezielten `npx vitest run src/nutrition`-Tests läuft nun die **vollständige** originale openGym-Frontend-Testsuite `npm test` im selben isolierten Unterprojekt, **vor** dem `VITE_MOBILE=1 npm run build`-Schritt. Damit können bestehende openGym-Funktionen bei Regressionen den Build stoppen, ohne vom älteren Root-App-Lint abhängen zu müssen.
- Neuer GitHub-Actions-Run **`42711524409`**, Job **`129482008371`** wurde tatsächlich gestartet. Verifizierte Steps: Checkout und `npm ci` **success**, gezielte Nutrition-Vitest-Suite erneut **success**. Die neue vollständige `npm test`-Suite war bei der letzten Abfrage **in_progress**; Build und Bundlekontrolle **pending**. Dies ist **noch kein erfolgreich abgeschlossener Volltest**.
- Der Download von Logs während des laufenden Jobs gab **404 BlobNotFound**; daraus lässt sich keine konkrete Testursache ableiten. Endergebnis, genaue Testanzahl sowie Build-Erfolg müssen anhand der endgültigen GitHub-Actions-Steps und Logs nachgetragen werden.
- Keine Änderungen an alten Root-Workout-Dateien, originalen Trainingsdaten, API oder nativer iOS-Signierung.
