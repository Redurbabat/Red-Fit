# Agent 01 — original openGym / Training / Datenmigration

Datum: 2026-11-09
Branch: `agent/redfit-01-opengym-training`
Basis bei Arbeitsbeginn: `043b7552ef604636262e85dacb3f613f609080e8`; vor der Implementierung auf dem Branch zusätzlich Eigentümerentscheidung `27e296f23fc15469d02e8bd0b9a682e0e5e116ab`.
Verbindlicher aktueller Produktpfad: **originale openGym-App in `vendor/opengym-upstream/`**, nicht der Legacy-Root-`src/`-Core; zuerst iPhone, keine zweite Trainingsruntime. Quelle: `docs/OPEN-GYM-IS-RED-FIT.md`.

## Quellaudit und bereits vorhandener Funktionsweg
- `frontend/src/App.jsx`: HashRouter, geroutete/lazy Ansichten, Store-/UI-Bindings, Login und Synchronisationsstatus. `frontend/src/views/Workout.jsx` nutzt die originalen Trainings-Sheets und unilateral getrennte Eingaben.
- `frontend/src/lib/routines.js`: Trainingsroutinen, Planänderungen, Slot-Ersetzung, Supersätze und Undo. `lib/session-start.js` baut geplante Einheiten, `lib/progression.js` implementiert `off`, `linear`, `greyskull`, `double`, `triple` und `time` mit Beurteilung ausgeführter Ziel-Sätze, Gewichtsschritten, Deload und nachvollziehbaren Vorschlägen.
- `lib/history.js` und `lib/workout-model.js`: Arbeits-/Aufwärmsätze, Unilateralität, Superset- und Verlaufsauswertung, Intensifier, Bodyweight, Pausen. `lib/finish-workout.js` bildet den abgeschlossenen Verlauf aus den ausgeführten Sätzen; auch **ein** erledigter L/R-Schenkel gilt als ausgeführte Arbeit (`hasCompletedWork`).
- `lib/exercises.js`: katalogbasierte Übungen, Equipment, Sprachen, Load-Inkremente und referenzierte Medien (still/clip Pfade). Die 13'108 originalen Gym-visual-Medien sind gesondert lizenziert; Original-`LICENSE` und `NOTICE.md` beibehalten. Keine neuen Medien oder initialen Import-Bundles in diesem Branch. Medien-Lazy-Load und tatsächlicher Offline-Fallback bleiben separat auf Geräteebene zu prüfen.
- `api/server.js`: eigenständiger Node-HTTP-Server mit Passkey/WebAuthn-Auth, pro Nutzer gespeicherten Daten, Sync, Web-Push und Medienpfaden. Auth-/Sync-Pfade hängen nicht automatisch an einem statischen Cloudflare-Worker. Ohne Server-/Netzwerk-Test kein erfolgreicher Sync behauptet.
- Der originale app-interne Weg **Plan/Routine → aktive Einheit → Satz/Tick + Rest → Abschluss → Historie** ist bereits implementiert. Deshalb keine zweite Workout-/Dexie-Runtime erzeugen oder ungetesteten Product-Cutover durchführen.

## Konkretes, ursprünglich produktives Datenverlust-Risiko (geprüft)
`makeSideSet`/ `toggleSide` speichern links/rechts getrennt. Ein Satz erhält sein aggregiertes `done: true` **erst, wenn beide Seiten fertig sind**. Dagegen erkennt `hasCompletedWork` bereits eine vollständig ausgeführte Seite. Zwei Stellen im echten Swap-Pfad prüften zuvor nur `set.done === true`:
1. `frontend/src/sheets.jsx`, `commitActiveSwap`: Dialog für bereits geloggte Arbeit wurde übersprungen.
2. `frontend/src/lib/active-exercise-swap.js`: Ersatz wurde im selben Slot vorgenommen, womit die einseitig geloggte Arbeit überschrieben wurde.

## Implementierung auf originalem openGym
- Beide Swap-Gates verwenden jetzt dieselbe exportierte Fachregel `hasLoggedWork(entry)`, die ihrerseits die vorhandene `hasCompletedWork`-Semantik aus dem Originalmodell benutzt.
- Einseitig abgeschlossene Wiederholungen bleiben im originalen Eintrag erhalten; ohne Einwilligung erfolgt **keine** Mutation. Nach Bestätigung wird die neue Übung **zusätzlich** eingefügt. Superset-Optionen `keep`/`detach` respektieren bestehende Gruppierung. Ungeloggte Sätze dürfen weiterhin direkt ersetzt werden.
- Keine Datenbankänderung, keine Migration, kein geändertes Backupformat, keine Produktiv-Entrypoint-Änderung, keine Änderung an Xcode-/Capacitor- oder UI-Styles. Original-`vendor/` ist aufgrund der neueren Eigentümerentscheidung die fortzuentwickelnde Anwendung.

## Teststatus
- Neue Regressionen in `frontend/src/lib/active-exercise-swap.test.js`: einseitig geloggter Satz, bestätigter Swap mit Erhalt im gespeicherten Verlauf, Superset mit beiden Entscheidungen, unverändertes Verhalten bei unberührten und wieder abgewählten Sätzen. Bestehende Swap-Tests bleiben bestehen.
- Isolierter V8-Funktionstest der echten Quellfunktionen mit einem Stub für Superset-Indexierung: Ergebnis im Commitbericht separat protokolliert, **kein** vollständiger Vitest-/React-/iPhone-Test.
- `npm ci`, `npm test` im Original-Frontend, originale iOS-Builds, Offline-/Auth-/Sync- und Gerätesperre-Tests: **NICHT GETESTET** (kein vollständiger Git-Checkout mit installierten Abhängigkeiten oder Xcode). Auch Root-`npm run typecheck`, `lint`, `test`, `build`, `test:offline` **NICHT GETESTET** und nicht Produktpfad.

## Noch offen
1. Original `frontend/`: `npm ci && npm test && npm run build`, einschliesslich neuer Regressionen; danach `build:mobile` auf einem geprüften Build-Host.
2. Mit echtem iPhone/Simulator: einseitigen Satz loggen → Swap-Dialog → Bestätigen → Abschluss → im Verlauf denselben Seitenwert prüfen. Auch Offline/Background/Reload und Supersatzpfade.
3. Backup-Datenherkunft aus Legacy-RED-Fit getrennt dokumentieren und additiv migrieren, bevor alte Daten in openGym übernommen werden; Cross-Device-Auth/Sync- und unabhängige Medienrechte separat freigeben.


## Nachtrag — veraltete Swap-Bestätigung (09.11.2026)
- Zusätzliches Risiko im echten iPhone-/React-Dialogweg: Die Bestätigung eines geloggten Swaps kann später erfolgen, nachdem eine andere Bearbeitung, ein Sync oder ein App-Restore die aktive Einheit oder den Eintrag an demselben Index geändert hat. Der Callback hielt zuvor weiterhin den alten Index und das vorab berechnete Ersatz-Entry; damit konnte er nachträglich die falsche Übung verändern und laufende Timer stoppen.
- `frontend/src/sheets.jsx`: Vor einer bestätigten Mutation werden nun die ursprüngliche Session-ID und der serialisierte Eintrag mit dem **aktuellen** Zustand verglichen. Der originale Store klont `active` bei `update()`, daher ist Referenzidentität ungeeignet. Bei Änderung bricht der Callback ohne Mutation und ohne Timer-Stopp ab und zeigt den **bereits übersetzten** Standard-Hinweis `Something went wrong`. Ein nicht veralteter Callback verhält sich unverändert.
- `frontend/src/sheets.swap.test.jsx`: zwei zusätzliche React/Vitest-Regressionen dokumentieren (a) Satzänderung bei offenem Bestätigungsdialog: Set-Werte und Pausentimer bleiben erhalten, (b) neuer Workout-Datensatz bei offenem Dialog: seine Einträge bleiben unverändert.
- **Jetzt tatsächlich ausgeführt:** Die aktualisierte Callback-Implementierung wurde per GitHub unmittelbar aus `sheets.jsx` abgerufen, der originale JS-Callback isoliert in einer V8-Funktion mit stubbed UI/Store geprüft: **5/5 Assertions bestanden** (unveränderte Session, zwischenzeitlich editiertes Set, neue Session, entfernter Eintrag, anderer Eintrag am Index). Dies ist eine **isolierte Quellfunktionsprüfung**, keine Ausführung des React/Vitest-Tests. Der vollständige Original-Frontend-Test, App-Build und Geräteprüfung bleiben offen.
- **GitHub CI bei PR #12, Commit `02e2474` (vor diesem Nachtrag):** zwei Jobs (`verify`, `offline-regressions`) als **failure** gemeldet. Der Abruf der ursprünglichen Job-Logs antwortete mit 404 `BlobNotFound`, sodass die Ursachen **nicht** bestätigt werden konnten. Die vorhandene Root-CI deckt die Original-openGym-Vitest-Suite nicht ab. Ein aktueller CI-Nachweis für die Nachtragscommits ist nach deren Abschluss erneut erforderlich.
- Weiterhin **nur Agent-Branch `agent/redfit-01-opengym-training`, bestehender Draft-PR #12**, kein Merge/Release. Alle Neuerungen sind in der Original-openGym-App, nicht in der Legacy-PWA.


## Nachtrag — veralteter Exercise-Picker bei App-Restore (09.11.2026)
- **Neu geprüftes Problem:** Die Bestätigungsprüfung in `commitActiveSwap` deckt nur Veränderungen **nach** dem Öffnen des Konfirmationsdialogs ab. Während der Exercise-Picker und das Konfigurations-Sheet offen bleiben, kann sich dieselbe Session/Übungsposition durch Sync, Restore oder Bearbeitung verändern. `swapTo()` verwendete bislang den inzwischen veralteten Index und konnte eine andere Übung ersetzen, bevor die bisherige Bestätigungsprüfung überhaupt begann.
- **Fix im originalen openGym:** `vendor/opengym-upstream/frontend/src/sheets.jsx` merkt sich Session-ID und den serialisierten ausgewählten Eintrag beim Öffnen des Pickers. Beim tatsächlichen Commit — sowohl Quick-Add als auch nach Konfigurations-Sheet — wird der aktuelle Zustand erneut geprüft. Bei veraltetem Kontext wird der Picker geschlossen, eine vorhandene Fehlermeldung angezeigt und **weder `commitActiveSwap` ausgeführt noch ein Timer gestoppt**. Der bereits vorhandene spätere Konfirmationsschutz bleibt bestehen.
- **Regressionstests ergänzt:** `vendor/opengym-upstream/frontend/src/sheets.swap.test.jsx` testet einen geänderten Satz bei offenem Picker und einen gewechselten Workout-Datensatz bei offenem Konfigurations-Sheet.
- **Tatsächlich ausgeführt:** Originalfunktion `swapActiveWorkoutExercise` aus dem GitHub-Branch als JavaScript-Quelle extrahiert und in V8 mit isoliert gestubbtem Store/Picker/UI ausgeführt: **7/7 Szenarien bestanden**: normaler Quick-Swap, zwischenzeitlich geänderter Eintrag, andere Session beim Pick, andere Session beim Konfigurations-Save, geänderter Eintrag beim Save, gelöschtes aktives Workout, inhaltsgleicher State-Klon. Das testet den tatsächlichen Quellcode, **nicht** die React/Vitest-Suite und **nicht** die iOS-App.
- **Noch offen:** `cd vendor/opengym-upstream/frontend && npm ci && npm test && npm run build` mit installierten Abhängigkeiten, danach echte iPhone-Resume-/Offline-/History-Regression. `.github/workflows/ci.yml` enthält nur Root-PWA-Checks und prüft die originale openGym-Frontend-Suite nicht. PR #12 bleibt bis zur Abnahme Draft; kein Merge, kein Deploy.


## Nachtrag — verschobene identische Übungen beim Swap (09.11.2026)
- **Tatsächlich reproduziert:** In `swapActiveWorkoutExercise` eine Übung an Index 1 aus `[Rudern, Bankdrücken A, Bankdrücken B]` gewählt; bei offenem Picker A gelöscht, wodurch das inhaltlich identische B an Index 1 rückt. Der bisherige `JSON.stringify(live.entries[index])`-Vergleich war weiterhin gleich; der ursprüngliche Quellcode rief irrtümlich `commitActiveSwap` auf (**Repro: commits=1, toast=0**).
- **Korrektur:** `frontend/src/sheets.jsx` schützt sowohl den Picker-/Konfigurations-Commit als auch die spätere Bestätigung nun mit dem Snapshot der **gesamten `active.entries`-Liste** plus Session-ID. Damit werden solche Einfügungen, Löschungen und nachweislich geänderte Reihenfolgen erkannt, auch wenn eine identische Übung an denselben Index rückt. Auf abgewiesenem Pfad wird kein aktiver Workout-Datensatz geändert und kein Work-/Rest-Timer gestoppt.
- **Neue Tests:** `frontend/src/sheets.swap.test.jsx` enthält zwei zusätzliche Regressionen für (a) verschobene identische Übung bei offenem Picker und (b) dieselbe Situation bei offenem Bestätigungsdialog; vorhandene Tests werden beibehalten.
- **Tatsächlich ausgeführt:** Frisch aus GitHub geladene Produktionsfunktionen `swapActiveWorkoutExercise` und `commitActiveSwap` wurden in V8 isoliert mit gestubbter UI/Store-Infrastruktur getestet. **11/11 Szenarien bestanden:** zwei reguläre Swap-Pfade, gleiche serialisierte Store-Kopie, geänderte Session, geänderte andere Zeile und der nun abgelehnte Duplicate-Shift in Picker- sowie Bestätigungspfad. Dies ist kein React-/Vitest- oder iPhone-Test.
- **Offene Abnahme:** Original-Frontend `npm ci && npm test && npm run build`, Echtegerät/Simulator und Background-/Offline-Regressionen. Agent 05 hat bereits eine separate Original-openGym-QA-Workflowdatei auf seinem **eigenen** Branch (PR #14); hier keine zweite CI-Datei erzeugt. Der CI-Run des Agent-01-Branches endete mit beiden Jobs als failure, aber **ohne Runner-Zuordnung und ohne Steps** (`runner_id=0`, `steps=[]`, `total_ms=0`); das belegt kein fehlgeschlagenes Frontend-Testresultat. PR #12 bleibt Draft und ungemergt.


## Nachtrag — Timer nach iPhone-Lock/App-Neustart an Workout binden (09.11.2026)

### Reproduzierter Fehler
Die originale `ownerSet`-Funktion prüfte nur Übungs-ID, Exercise-Index und Set-Index. Ein aus `localStorage` stammender Halte-Timer für Workout A konnte bei einer neuen aktiven Einheit B mit derselben Übung an derselben Position erfolgreich einen Satz von B finden und nach Ablauf falsch als erledigt speichern. **Vorher-Reproduktion mit originalem `ownerSet`: `incorrectlyAccepted=true`.** Der originale `restoreRest` prüfte nur, ob irgendeine aktive Session existiert; ein alter Pausentimer konnte daher auch in einer anderen Einheit wieder auftauchen.

### Implementierung in original-openGym
- `frontend/src/store/useUI.js`: `startRest` speichert die ID der aktiven Session im Timer. `saveRest` persistiert sie, `restoreRest` validiert die ID beim Neustart; bei Abweichung wird der gespeicherte Timer verworfen. `followNativeRest` übernimmt die bestehende ID, soweit verfügbar.
- `startWork` erweitert das **kopierte** Owner-Metadatenobjekt um `sessionId`, ohne das Eingabeobjekt zu mutieren. `saveWork` persistiert den Owner unverändert wie zuvor. `ownerSet` verweigert einen Timer-Owner mit nicht passender `sessionId`, auch beim Ablauf während eines App-Neustarts.
- **Rückwärtskompatibilität:** Bereits gespeicherte Timer ohne das neue Feld werden wie bisher akzeptiert. Kein DB-Schema, keine Migration, keine iOS-/Capacitor-Dateien, keine neue Runtime oder Dependency.
- Die Zuordnung nativer Timer-Events ohne bereits vorhandenen In-App-Timer und ohne Session-ID im nativen Event bleibt separat geräteabhängig zu überprüfen.

### Ergänzte Original-Regressionstests
- `frontend/src/store/useUI.rest-reload.test.js`: Session-ID im gespeicherten Rest, erfolgreicher Pausen-Restore in derselben Einheit und Abweisung einer anderen Einheit bei pausiertem/laufendem Rest (drei neue Testfälle).
- `frontend/src/store/useUI.work-reload.test.js`: Session-ID auf neuem Work-Owner, gültiger Restore sowie Abweisung neuer Einheit bei pausiertem/laufendem Hold ohne fälschliches Ticken des Satzes (drei neue Testfälle).

### Tatsächlich ausgeführte Prüfung
- V8-Tests der frisch aus GitHub geladenen originalen `ownerSet`, `saveRest`, `restoreRest` und `restoreWork`: **17/17** Tests erfolgreich, u. a. altes/neues Session-Objekt, gültige und veraltete pausierte/laufende Timer, abgelaufener Hold, kompatible Legacy-Timer, persistierter Session-Key.
- `startRest`/`startWork` als extrahierte **originale** Methoden mit minimalen Store-/UI-Stubs aufgerufen: **2/2** Checks erfolgreich (Session-ID wird beim Start korrekt gesetzt; übergebener Owner wird nicht mutiert).
- V8-Syntax-Parse nach Entfernen der Import-/Export-Deklarationen für die drei geänderten Dateien: **3/3 Dateien bestanden**. Dies ist eine Syntax- und isolierte Funktionsprüfung, **kein** vollständiger Vitest-/App-Build.
- **Nicht ausgeführt:** `npm ci && npm test && npm run build` im Originalfrontend, realer Lock/Background-Resume auf iPhone, Native-Notification-Tests, IPA und Sync/E2E. Fehlender GitHub Actions Runner (`steps=[]` im vorherigen PR-Lauf) ist kein bestandener Build.
- Änderungen verbleiben auf `agent/redfit-01-opengym-training` im vorhandenen **Draft-PR #12**, kein Merge, keine öffentliche Veröffentlichung.

### Nächster Schritt
Den originalen Frontend-Test mit Node 22 und NPM-Abhängigkeiten über den QA-Gate von Agent 05 (PR #14) auf einem funktionierenden Runner ausführen. Danach iPhone: gleiche/andere Workout-ID mit denselben Set-Indizes nach Sperre/Neustart prüfen, auch mit Pausen- und Halte-Timer.
