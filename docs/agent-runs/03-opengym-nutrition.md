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
2. Neue separate IndexedDB `redfit-nutrition-v1:<scope>` (`nutrition/repository.js`) mit atomarem Anlegen/Löschen. `scope` ist `local` für Gäste, `account:<user.id>` für Konten (keine Pflichtanmeldung). Der Datenbankname greift nicht in openGym-Workout-Daten ein. Jeder Speichervorgang meldet Fehler und behauptet keinen Erfolg vor bestätigter Transaktion.
3. `views/Nutrition.jsx` und `nutrition/nutrition.css`: Food anlegen → Menge/Meal-Type/Datum → Vorschau → Speichern → Tagesmakros und löschbare Mahlzeiten. Mobile Touch-Ziele >=44 px, iPhone-Bottom-Safe-Area, automatische Scope-Neumontage bei Nutzerwechsel, Offline-Nutzung, keine Pflicht-API.
4. Eigener JSON-Export/Import mit Format `redfit-nutrition` v1, strikter Whitelist-/Zahlenvalidierung und idempotentem Merge. Unterschiedliche Snapshots mit gleicher ID erhalten stabile Recovery-IDs. Import wird vollständig validiert vor einer einzigen IndexedDB-Readwrite-Transaktion. Alte Trainingsdaten werden dabei nie geändert.
5. Minimale Integrationspunkte im **Original**-`App.jsx` (lazy Route `/nutrition`) und `views/Home.jsx` (Ernährungskarte). Keine Änderungen an TabBar, globalem CSS, iOS-/Capacitor-Dateien, Node-API oder Root-PWA.

## Qualität / Tests — genau benannte Evidenz
- Auf den direkt vom GitHub-Branch erneut gelesenen und SHA-referenzierten **committeten** Dateien: sieben `model.test.js`-Testfälle in einem leichten JavaScript/V8-Adapter ausgeführt: **7/7 bestanden**. Dieser Adapter implementiert die verwendeten Vitest-Assertions; dies ist **kein** echter Vitest-Lauf mit dem Projekt-Lockfile.
- Zusätzlich Syntax von `model.js` und `repository.js` in V8 geprüft; Routing-, Home-Button-, per-Account-Scope- und Backup-Import/Export-Integrationsanker gegen den Branch-Quelltext geprüft: alle vorhandenen Anker bestätigt.
- **Nicht ausgeführt:** `npm ci`, `npm test`/echtes Vitest, Vite-Build, React/JSX-Compiler, realer IndexedDB-Transaktionstest, iOS-Simulator, physisches iPhone, Capacitor-/IPA-Build. Kein erfolgreiches Geräte-Backup/Restore oder Server-Sync behauptet.

## CI-Status beim PR-Öffnen (zusätzlicher Prüfversuch)
- GitHub-Actions-Run `42703051887` für den Branch: **completed / failure**. Jobs `verify` (`129452578493`) und `offline-regressions` (`129452579085`) meldeten jeweils `failure`.
- Beide Jobs gaben über die Job-Steps-Schnittstelle **0 Schritte** zurück; Job-Logs waren mit HTTP 404/`BlobNotFound` nicht abrufbar. Aus diesem Ergebnis lässt sich **kein App-Test-Fehler und kein ausgeführter npm-Test beweisen**; CI bleibt rot, Ursache (Runner/Workflow/Plattform) muss anhand GitHub Actions untersucht werden. Vor PR-Merge vollständige Test- und Buildbelege nachreichen.

## Offene Risiken / Freigabeblocker
- **Wichtig für Nutzer:** Die originalen openGym-Backups, Auto-Backups, der native State-Mirror und der Server-Sync beinhalten die neue Ernährungsdatenbank **noch nicht**. Ernährung muss vor Gerätewechsel, App-Löschung oder Neuinstallation **separat über den Ernährungsscreen exportiert** werden. Kein unbemerkter Cutover ohne getestete Migration/Backup-Integration.
- Account-Scope trennt Gäste und IDs. Bei verschiedenen selbst gehosteten Servern mit *identischer* Konto-ID reicht die Scope-Definition noch nicht für eine garantiert eindeutige Server-Namespace-Zuordnung: vor Mehrserverbetrieb erweitern und migrieren.
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
