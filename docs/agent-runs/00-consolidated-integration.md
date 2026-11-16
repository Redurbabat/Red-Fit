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

## RED Fit — iOS native Apple dock & new bundle identity (10.11.2026)

- **Native Apple dock confirmed in source:** `vendor/opengym-upstream/frontend/ios/App/App/MainViewController.swift` creates the real UIKit `UITabBar`, with five `UITabBarItem`s (Home/Plan/Start/Stats/Exercises), available on iPhone/iOS 26+. This is Apple UIKit, **not SwiftUI TabView**, and is bridged to original React Router via `redFitDock`/ `redfit:native-dock`. A source audit is not a passing on-device XCUITest.
- **App ID migration prepared together:** iOS/Capacitor/Xcode primary identifier `ch.redurbabat.redfit` replacing `ch.opengym.app`. Embedded Apple targets derive `.widgets`, `.watchkitapp`, `.watchkitapp.widgets`, `.AnimationPacksDownloader`, and `.uitests`; the shared App Group is `group.ch.redurbabat.redfit`. The Watch companion, Background Assets, BGTaskScheduler, Swift stores, entitlement plists and CI integrity fixture all reference the new IDs.
- **Safeguards:** The original deep link URL schemes `opengym://` and `opengym-watch://` remain temporarily for existing widget/NFC/share routing (URL schemes are not the app's bundle identifier). `applinks:opengym.ch` remains a **legacy associated-domain entitlement pending audit**; a new bundle ID does not automatically own or activate that domain. No migration, old-app uninstall, or data deletion is performed.
- **Release limitations:** Changing bundle ID installs as a **new iOS app**. Any data stored by the old bundle ID / App Group will **not** automatically transfer; export/verify backup before installing or removing the old app. All new bundle IDs, App Group, capabilities and matching provisioning profiles require real Apple signing setup. An unsigned CI IPA is **not** installable as delivered. Until native tests and signing complete, PR #17 stays Draft and no artifact is published.

## 2026-11-10 — RED Fit identity and navigation follow-up

Continued on the same PR #17 branch, starting from `a7be58befb1552c125f78d157f773692b586e99b`.
All current source PR heads (#11 `8110296`, #12 `af0aa0d`, #13 `a100871`, #14 `e433d3b`, #15 `db1f3b2`) were verified as ancestors with `git merge-base --is-ancestor`.

The owner's final logo direction is a completely original abstract mark: no R, no monogram and no dumbbell; warm ivory on burgundy, three flowing forms. The earlier red letter/fitness sketches are not included in the repository. Sources and component inventory: [brand integration](../design/RED-FIT-BRAND-INTEGRATION.md).

Product copy and locale packs, browser metadata, generated iPhone/Watch/Android icons and splash, print/share branding, exported filenames and source/update links now use RED Fit. Historical licenses, protocol/storage keys and existing import handlers remain compatible. Old media ZIP backups are accepted alongside the new RED Fit name. A new Health origin guard prevents self-import after the bundle-ID change.

The real UIKit bar remains the iPhone/iOS 26 control. React owns workout/router state. First-run modal coverage now includes dialogs outside `modal-root`; nutrition selects Home. Browser accessibility evidence showed Home's `Today` is a button label, not a standalone accessible text; native QA now finds the real button, dismisses the optional tour, and captures accessibility evidence on failure. This is a targeted test/bridge correction, **not** a claim of a passed iOS simulator run.

Local evidence on Linux/Node 24:
- 218 offline regression tests passed.
- 23 Node native structure/bundle/identity tests passed; real identity verifier passed.
- 89 focused brand/backup/Health/dock tests passed and 28 additional export tests passed.
- Original web and mobile-flavour production builds passed; Safari 15.5 syntax gate passed.
- Chromium smoke passed for first launch, 320/390/430/1024px layouts and >=44px dock targets, all five routes, a food/80g meal yielding 296kcal, persistence after reload, Home selection from Nutrition, offline navigation, reduced motion and no page exceptions. This tests the mobile-flavour browser bundle, not UIKit rendering or an offline native cold launch.
- Legacy root: 268 tests, typecheck, lint and build passed.
- Complete original frontend run: 7983 passed; one obsolete FIT filename expectation failed. Updated that expectation to the already-correct RED Fit export name and reran both full affected suites: 36/36 passed. No production change after that run; do not misreport this as a single all-green full-suite execution.
- Final integration follow-ups: 45/45 focused tests and 9/9 QA-harness fixture tests passed; the harness accepts the renamed original package while still refusing the legacy root app.
- macOS run [42851915523](https://github.com/Redurbabat/Red-Fit/actions/runs/42851915523) at production revision `b3d58a99` passed simulator, unsigned device build and actual IPA validation. Its UI test was cancelled when superseded by a new branch head; no native UI pass claimed. Later differences are test/harness/docs only.

Release boundaries: Linux has no Xcode. The new native onboarding assertion and icon compilation still require the macOS workflow; native minimization, real iPhone/Watch UX, signing/install, Android and Windows installers remain unverified. PR #17 remains Draft; no main merge, no release, no manual deployment and no IPA uploaded. Existing external Cloudflare build failures are not treated as a successful deployment.
