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
