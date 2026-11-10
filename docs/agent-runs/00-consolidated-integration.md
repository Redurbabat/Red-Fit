# RED Fit — konsolidierte Integration (Draft)

Stand 10.11.2026. `main` unverändert. **Original-openGym** unter `vendor/opengym-upstream/frontend/` ist die Produktbasis; Root-`src/` bleibt Legacy-Referenz.

## Quellen

- PR #11: `8110296904fba578a2a73e7c7374c38728791fdb`
- PR #12: `af0aa0daf7432705ad82a52981fa3a91dbf810ca`
- PR #13: `a10087174af0ee6fcd705647ed4267b872ed344d`
- PR #14: `e433d3ba87924e783fa74313f24940f698b3b5f0`
- PR #15: `db1f3b2043595853b67a2a03d6a12b62c4c588df`

## Explizite Konfliktlösung

- `vendor/opengym-upstream/frontend/src/components/TabBar.jsx`: Agent-02-React/RED-Morph-Variante mit vorhandener Agent-04-Native-`redfit:native-dock`-Brücke, fünf Tabs, Web-Fallback und Bewegungs-/A11y-Verhalten. Nativen iPhone-Echtgerätetest nicht vorwegnehmen.
- `vendor/opengym-upstream/frontend/src/views/Home.jsx`: Agent-02-Home, Week-Strip/RED-Morph und A11y + Agent-03-Ernährungskarte und `/nutrition`-Navigation; Branding aus Agent 02/04 erhalten.
- `obsidian/08-STATUS-UND-TESTS.md`: Agent-03-Nutrition- und Agent-04-IPA-Nachweise mit Integrationsstatus kombiniert.

Alle übrigen geänderten Pfade aus fünf Agentenbranches als unveränderte Git-Blobs integriert; Ursprungs-PRs als offene Nachverfolgung stehen lassen, nicht automatisch schliessen.

## Getrennte Build-Nachweise vor der Integration

- Agent 04: Root-CI `42733049988` success; iOS-Simulator-XCUITest `42733050029` failure, weil Home nach Onboarding nicht gefunden wurde.
- Agent 02: kombinierter Simulator-Workflow `42732459798` success; Root-CI `42732459853` Lintfehler (alte `setNotes.ts`-Regex).
- Agent 03: Ernährungsworkflow `42715980363` success.
- Agent 05: openGym-Frontend-QA `42706564048` success.
- Fix für die alte Root-Lintregel ist im Agent-04-Code enthalten, aber die integrierte CI muss dies bestätigen.

## Noch zu testen

1. Root `npm ci && npm run typecheck && npm run lint && npm run test && npm run build`.
2. `cd vendor/opengym-upstream/frontend && npm ci && npm run test && npm run build`; angepasster iOS-Build/QA-Skripte.
3. iPhone-Simulator-XCUITest (besonders Onboarding/Home), native Navigation, Watch/Widgets, aktive Workouts/Satz-Undo, Offline-Start, Ernährung/Backup.
4. Apple-Signing, fünf native Targets, App-Groups und echte iPhone-Installation: **nicht abgeschlossen**. Android/Windows ebenfalls offen.

## Schutzmassnahmen

GitHub meldet Repository-Sichtbarkeit `public`, die Projektdoku verlangt `private`; vor Weitergabe von Installationsartefakten klären. Keine Secrets, persönlichen Daten, öffentlichen Cloudflare-/Store-Deploys oder ungeprüften Datenmigrationen. Bestehende LICENSE/NOTICE und separate Medienrechte erhalten.

## Verifizierte Integrations-QA (10.11.2026)

- PR #17 remains draft. Comparison of each source head against integration head 9740f4bc: behind=0 for PR #11 (8110296), #12 (af0aa0d), #13 (a100871), #14 (e433d3), #15 (db1f3b2).
- CI at previous integration head: root CI [42769494297](https://github.com/Redurbabat/Red-Fit/actions/runs/42769494297) success, combined iOS simulator workflow [42769494490](https://github.com/Redurbabat/Red-Fit/actions/runs/42769494490) success.
- Failed frontend runs: [42769494380](https://github.com/Redurbabat/Red-Fit/actions/runs/42769494380), [42769494569](https://github.com/Redurbabat/Red-Fit/actions/runs/42769494569), [42769494242](https://github.com/Redurbabat/Red-Fit/actions/runs/42769494242). In these logs Vitest incorrectly discovers three native node:test files in frontend/scripts and reports 'No test suite found'. The native Node tests are executed separately by node --test; they must not be deleted.
- Fix: frontend/vite.config.js excludes precisely those three scripts from Vitest and preserves configDefaults.exclude (commit ffe2902e8a24cc348601af60d960de8edb5728d0). The next integrated CI run must verify this fix; no green claim yet.
- Additional failure: nutrition full suite had Tour.test.jsx:513 'expected c-media to be c-save' (1 of 7980 actual Vitest tests failed). RED-Morph run completed 7980/7980 actual tests successfully; intermittent behavior suspected but not yet proven.
- Native iPhone [42769494341](https://github.com/Redurbabat/Red-Fit/actions/runs/42769494341) failed XCUITest OpenGymUITests.test0REDFitNativeTabBarKeepsOriginalNavigation: OpenGymUITests.swift:67, 'home never showed after the onboarding choice'. Simulator/device unsigned build steps preceding the UI smoke test succeeded; not a signed/installable IPA.
- Direct local npm/Xcode tests were not run: this environment cannot resolve github.com for git clone ('Could not resolve host'). Only linked GitHub Actions logs are independent executed test evidence.
- Outstanding: verify CI after fix, diagnose native onboarding/Home, ensure workout/nutrition/backup integration, actual iPhone signing and install, keep repo private before releasing artifacts, then Android/Windows QA.
