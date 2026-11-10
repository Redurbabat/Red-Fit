# Agent 04 — iOS and Android native shell (2026-11-09)

Repository: Redurbabat/Red-Fit (private)
Assigned branch: agent/redfit-04-ios-android
Starting commit: 043b7552ef604636262e85dacb3f613f609080e8
Scope: Capacitor, src/core/platform, related tests and this report; never push main, never merge PR.

## Sources reviewed

Repo AGENTS.md, CLAUDE.md, ARCHITEKTUR.md, obsidian/00-START-HERE.md, obsidian/09-CHAT-HANDOFF.md, obsidian/07-BACKLOG.md, obsidian/08-STATUS-UND-TESTS.md, docs/PLATFORM-BUILDS.md, docs/NATIVE-DEPENDENCY-BOOTSTRAP.md, docs/2031/INTEGRATIONS.md and MOBILE_DESIGN.md, native bootstrap scripts, existing platform routing and barcode/timer modules. RED Morph skill, native SwiftUI UX and motion guides, and provided BBT iOS testing/release/Xcode skill references. Original Apple skills exported from Xcode were not accessible and were not claimed as installed. The single React/Vite/Dexie core and current UI were preserved.

## Changes committed to this branch

- src/core/platform/mobileBridges.ts: native host/plugin registration, haptics fallback, Camera 8.1+ takePhoto contract, app lifecycle observer, opt-in Android Back.
- src/core/platform/mobileFileExport.ts: explicitly requested native temporary file share, guaranteed deletion after share resolve/reject, Web Share/download fallback and safe filename checks.
- tools/mobile-bridges.selftest.mjs: 17 isolated tests.
- capacitor.config.json: proposed app ID com.redurbabat.redfit (both mobile platforms).
- docs/MOBILE-BRIDGES.md: build/setup instructions, plugin gaps, native test matrix.

No changes to other agents' workflows, native Tauri paths or UI CSS. No copied BBT music/SwiftUI runtime.

## Verifications actually executed

- Node.js 22.16.0: node --experimental-strip-types --test tools/mobile-bridges.selftest.mjs -> **17 passed / 0 failed**, with locally reconstructed feature files. Tests cover native host detection, plugin registration, haptics/fallback, current camera API and permission rejection, lifecycle disposal, Android Back, invalid filenames, UTF-8 backup share, cancellation cleanup and browser fallback.
- TypeScript 5.8.3: isolated strict noEmit compile of both new TypeScript modules with DOM libs and bundler resolution -> **passed**. This is not a full app-wide TypeScript/Vite build.
- npm registry probe for @capacitor/core@8.6.0 -> **EAI_AGAIN** (registry.npmjs.org DNS unreachable). Native packages and reproducible npm lockfile could not be installed/generated in this environment.

## Blocked or not attempted (do not claim passed)

npm run native:bootstrap, native:check, npm ci, app-wide typecheck/lint/test/build, test:native-deps and npx cap sync: no complete package-installed repo checkout with working npm registry. No ios/** or android/** generation, native Gradle/Xcode build, simulator, physical iPhone/Android, Codemagic signing, IPA, APK or store publication. Optional native plugins are not installed, registered at runtime or integrated into screens. Current lifecycle subscriptions provide an API, not proof of actual data recovery. Android camera appRestoredResult is an outstanding integration task.

## Next steps

On a networked machine checkout this branch, run the existing native bootstrap, commit BOTH package.json and package-lock.json together, then run npm ci and all configured quality gates. On macOS/Xcode generate and verify ios/**, on Android Studio/SDK verify android/** and Gradle. Review optional plugin versions, register their JS exports and integrate specific production flows with explicit permissions, test on devices, verify app identity/provisioning and backup migration. Update this document after real evidence and keep a single PR against main, without merging it.

Status levels: configuration **partial**; isolated TS contract **tested**; Web production build **unverified**; native simulator **unverified**; device **unverified**; signable IPA **unavailable**; built APK **unavailable**.

## Pull Request

PR #13 gegen main wurde als Draft erstellt: https://github.com/Redurbabat/Red-Fit/pull/13 . Beim anschliessenden GitHub-Metadatenabruf: open, nicht gemergt, mergeable=true; das sagt nichts über fehlende native Buildtests aus. Kein Merge, keine Änderung an main.
