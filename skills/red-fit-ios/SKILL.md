---
name: red-fit-ios
description: Develop and verify RED Fit's existing iPhone app, native Apple navigation and local data protection using the RED Morph and RED Bit interaction and testing references.
---

# RED Fit: iPhone, native navigation and local data

Work in `vendor/opengym-upstream/frontend/`. Read the root `AGENTS.md` and current Obsidian handoff. The root `src/` PWA is a reference, not another product to rebuild. Integration is PR #17, branch `integration/red-fit-opengym-iphone-20261110`; inspect its current head before pushing.

## Product invariants

- iPhone/iOS is the first delivery target. Keep original training, nutrition, Watch, widgets, durable saves and legacy import identifiers. Never clear data or regenerate a blank native shell.
- The owner requires local operation. `src/main.jsx` must import `local-only-bootstrap.js` before the app. Do not add a build flag, imported setting, analytics script or stored account that disables the one-way policy. Native HTTP and background tasks need their own checks because CSP cannot govern them.
- Keep account-scoped nutrition readable through `localProfile`; turning off server authentication must not switch existing meals to an empty guest database. Preserve former credentials/files without using them or exporting them.
- Native iOS excludes Documents and Library from system backup. Manual file exports remain explicit. Do not promise control over the user's OS, Siri, Health, iCloud settings or destinations they select in a share sheet. No app-data upload in CI; test only synthetic profiles.
- iOS excludes Google ML Kit through its plugin allowlist and CocoaPods; QR/1D codes use the existing local camera/photo decoder. Keep the post-sync native dependency guard and IPA checks; JavaScript transport guards cannot stop an SDK's own telemetry. Never restore ML Kit to fix a scan UI.
- Never change budgets, payment methods, spending limits or runner tiers to enable a bill. The owner explicitly prohibits that. Read current visibility; do not change it. Standard public-repository CI is the currently used route. Only encrypted owner-recipient IPA exports may leave a public run; no plaintext IPA.

## Apple dock and RED Morph

- iOS 26 iPhone uses `REDFitNativeTabController: UITabBarController` as the window root, wrapping the original storyboard bridge. Its five route hosts retain one shared Capacitor controller/WKWebView. Route/workout state stays in React; native taps send intentions. Do not put a standalone bar inside the WKWebView or create a WebView per tab.
- Keep stable native accessibility identifiers, localized labels, VoiceOver selection and touch targets of at least 44 pt. Hide native navigation during modal, keyboard and permission flows.
- System minimization is configured with `tabBarMinimizeBehavior` and the actual WK scroll view is identified through `setContentScrollView`. Preserve UIKit's default glass appearance and layout. Do not claim native shrinking without simulator/device evidence.
- Use existing Bordeaux/ivory brand assets and semantic tokens. Opaque content, glass on floating chrome; calm at rest. Respect reduced motion/transparency and avoid idle loops. Read the relevant reference before changing gestures, layering or motion.
- Inventory existing components as KEEP / REWORK / ARCHIVE / DELETE-CANDIDATE before substantial design edits. Avoid copying music/streaming subsystems into a fitness app.

## Verification

Run focused privacy, storage, nutrition and `TabBar.native-dock` Vitest suites, build `VITE_MOBILE=1`, then run `node tools/opengym-qa/local-only-browser.mjs` from the root against the built original frontend. The browser harness uses an isolated synthetic profile and checks outbound requests plus food persistence. It cannot validate native iOS appearance.

Use `.github/workflows/red-fit-iphone.yml` on macOS for Xcode compilation, unsigned device IPA integrity and XCUITest. Complete/skip the optional tour before searching the accessibility-hidden Home content. Prefer stable accessibility IDs over inferred descendant text. Preserve `.xcresult` evidence only under the repository's artifact policy.

Report separately: source guards, web bundle, simulator build, device build, unsigned IPA validation, XCUITest and actual signed installation. A successful JavaScript test or unsigned IPA is not an installed iPhone app. Signing credentials are never committed.

For Windows test runs, use a temporary directory inside the ignored `.red-fit-qa/` workspace folder if the sandbox's system temp directory refuses atomic renames. Keep that workaround out of production data code.

## Sources and limits

This is a RED-Fit-specific adaptation of ideas, not a claim that proprietary Xcode-exported skills were installed.

- [RED Morph skill](https://github.com/Redurbabat/RED-Morph/blob/d8d251268899ab0b73770427f86b72f4a546c6d9/skills/red-morph/SKILL.md): material hierarchy, controlled state, interaction/accessibility contracts, evidence and safe cleanup.
- [RED Bit iOS testing](https://github.com/Redurbabat/RED-Bit/blob/b571aab97c77dbb502ae81caf90550f6ebb43a55/.agents/skills/bbt-ios-testing/SKILL.md): stable accessibility, simulator/device evidence and truthful test status.
- [RED Bit Apple/Xcode](https://github.com/Redurbabat/RED-Bit/blob/b571aab97c77dbb502ae81caf90550f6ebb43a55/.agents/skills/bbt-apple-xcode/SKILL.md): availability checks, native navigation continuity, no invented Apple skill exports or signing results.
- [Apple UITabBar](https://developer.apple.com/documentation/uikit/uitabbar), [UIKit Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/284/), [backup exclusion](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup).
