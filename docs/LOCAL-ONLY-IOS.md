# RED Fit: iPhone first and local app data

Owner instruction: 10 November 2026. Continue PR #17 on `integration/red-fit-opengym-iphone-20261110`. The product remains the original React/Capacitor app in `vendor/opengym-upstream/frontend/`. No deployment or merge to main is part of this change.

## Integration and references

The current source PR heads were re-read through GitHub and confirmed with `git merge-base --is-ancestor` against the integration branch:

| PR | Area | Integrated head |
| --- | --- | --- |
| #11 | RED Morph interface | `8110296904fba578a2a73e7c7374c38728791fdb` |
| #12 | Training and unilateral integrity | `af0aa0daf7432705ad82a52981fa3a91dbf810ca` |
| #13 | Original iPhone/Watch/widgets | `a10087174af0ee6fcd705647ed4267b872ed344d` |
| #14 | Original-app QA | `e433d3ba87924e783fa74313f24940f698b3b5f0` |
| #15 | Offline nutrition and backups | `db1f3b2043595853b67a2a03d6a12b62c4c588df` |

The local [RED Fit iOS skill](../skills/red-fit-ios/SKILL.md) adapts the relevant RED Morph design and RED Bit Apple/testing references with pinned provenance. It does not copy a music engine, invent locally installed proprietary Apple skills or replace the app with SwiftUI. Existing Bordeaux/ivory assets remain the brand.

| Existing component | Decision | Reason |
| --- | --- | --- |
| Original training store, file mirror, history and import identifiers | KEEP | Preserve workouts, in-progress sessions and old backups |
| Native iOS 26 iPhone navigation | REWORK | Root `UITabBarController` outside the single retained WKWebView; React owns routes and workouts |
| Browser/older-platform RED Morph dock | KEEP | Accessible fallback; no claim of native material |
| Optional server, AI, web analytics, online maps, Health sharing and system speech | REWORK | Present build operates locally and refuses these transfers |
| Nutrition account namespace | KEEP | Former account meals stay readable without authenticating |
| Frozen two-commit Agent-02 simulator comparison | ARCHIVE as manual workflow | It does not test the current integrated head; current iPhone workflow does |

## Enforced data policy

`main.jsx` imports the one-way `local-only-bootstrap.js` before loading the app. There is no environment variable or imported preference that enables network services in production. Original transport unit tests can exercise the inactive modules in isolation; production always loads the bootstrap. Dedicated tests explicitly activate the real policy.

- Boot restores the existing local training copy, keeps prior account/server identity only to locate nutrition records, enters local guest operation and does not restore remote authentication or AI configuration. Pairing files, credentials, original owner markers, workouts and stashes are not deleted or sent anywhere.
- Server API access, blob uploads, beacons, sockets, external navigation and native HTTP are refused before transmission. Packaged assets and same-origin read-only static resources remain usable. Redirects on fetch are refused and credentials/referrers are omitted.
- A build-time Content Security Policy blocks remote images, media, scripts, frames and forms. Analytics variables and remote catalogue media bases are refused at build time.
- Native reminder background requests, map search and animation downloads have independent guards. Apple-hosted automatic asset packs are disabled. The obsolete `opengym.ch` associated-domain entitlement is removed; old in-app URL parsers and storage/import IDs remain compatible.
- Automatic Health read/write sharing and spoken cues are disabled under the policy. Native notification sounds, durable training state and the existing local app features remain available.
- On iOS, the app marks Documents and Library as excluded from system backup. This is an app-level backup exclusion request, not proof of a particular device's iCloud configuration. Manual exports still open an explicit file/share flow chosen by the person.

Scope of the claim: RED Fit does not automatically send training/nutrition data to service providers through these app paths. Device/OS services, previously shared copies and destinations deliberately chosen in a system share sheet remain outside this control. A browser-delivered website also necessarily contacts its own hosting origin for static app files; the installed iPhone app reads those files from its local shell. No personal user dataset is used by the tests or committed to GitHub.

## Apple dock and first launch

The native dock now uses the complete `UITabBarController` as the iPhone window root. The old standalone `UITabBar` was a subview of the bridge's root WKWebView and the actual simulator failed to find it as a native bar. Five native route hosts retain and move the same original Capacitor controller, preserving one WKWebView and its training/nutrition state. UIKit owns glass material, shape, selection, safe-area layout and the configured `.onScrollDown` behavior; `setContentScrollView` points at the real WK scroll view. No CSS glass is substituted for the native control. SF Symbols, localized titles, `redfit-tab-*` identifiers and the existing `redfit:native-dock` event remain.

The iPhone workflow includes the short source commit in the app's About/version text. An already installed IPA does not change after a Git push; install the corresponding new signed build to receive the new native root controller. The user reports iOS 26.6.1, which is above the API floor.

The former iPhone run `42862422488` built the simulator app and unsigned device IPA and passed IPA integrity, then failed while waiting for Home after onboarding. The next run `42877430917` passed those builds again and reached Home, but failed with **native iPhone system tab bar is missing**. The root-container change addresses that second failure. The test retains native screenshots and logs its accessibility hierarchy on failure; a cropped empty-profile Home dock image can be exported without an IPA, exercise thumbnails or real records. Local-only startup directly restores local data instead of offering a server connection.

## Verification and remaining delivery work

Local evidence uses Windows/Node 22, locked dependencies and synthetic data:

- **114/114** focused privacy, previous-account/native-mirror, native-dock routing, nutrition, Health and speech Vitest tests (12 files).
- Mobile-flavour Vite production build and Safari 15.5 syntax check.
- 23 original native bundle/identity/tab-bar guards; 14 QA harness/baseline tests; 10 progression/provenance tests.
- `node tools/opengym-qa/local-only-browser.mjs`: actual built original app, four dock destinations, 80 g = 296 kcal, persisted after reload, offline navigation, rejected fetch/API/socket/window and remote-image attempts; **zero external requests and zero server API requests** in the isolated browser run. This is not a simulator or native traffic capture.

The clean Linux run [42999856109](https://github.com/Redurbabat/Red-Fit/actions/runs/42999856109) on `64ec9b32` passed **8,006/8,006 tests in 666 files**, then both web and mobile builds. Its downloaded `report.json` and test log were checked. This supersedes the earlier Windows attempt affected by POSIX/path/CRLF assumptions. Temporary-directory workarounds stay in ignored `.red-fit-qa/` folders.

The current `.github/workflows/red-fit-iphone.yml` additionally runs the privacy tests, builds the real original app on macOS, validates the actual unsigned IPA, and runs native XCUITest. Check its result on this commit before asserting native success. Private-repository evidence includes `.xcresult`; public repositories never receive a plaintext IPA from this workflow. The obsolete nutrition/Agent-04 temporary merge job is removed: native QA uses the actual integrated head in this one iPhone workflow.

On 11 November, run [42996454883](https://github.com/Redurbabat/Red-Fit/actions/runs/42996454883) at `c2df7900` was refused **before any build steps** by the Actions budget while the repository was private. After the repository independently became public, [42998639557](https://github.com/Redurbabat/Red-Fit/actions/runs/42998639557) started on the standard `macos-26` runner and passed simulator compilation, device compilation and actual IPA integrity. Its native UI result must be read from the run. No budget, payment method, spending limit or repository visibility was changed by this work. The owner prohibits charge-enabling settings changes. The private `codemagic.yaml` alternative remains available but was not started.

### Owner-only unsigned IPA export

Manual runs accept `ipa_recipient`, a base64 DER/SPKI **public** RSA key (3072 bits or stronger). The runner encrypts the validated IPA using a fresh AES-256-GCM key wrapped with RSA-OAEP/SHA-256. Only ciphertext and a public envelope are uploaded for one day; the private key never leaves the owner's computer. Automatic PR runs do not export an encrypted IPA without a recipient. This protects the build archive, not signing or installation; no app records are supplied to CI.

From the repository root, generate a recipient under the ignored local QA folder, supply the contents of `recipient.txt` to the manual workflow, then decrypt the downloaded artifact locally:

```text
node tools/opengym-qa/private-ipa-artifact.mjs keygen .red-fit-qa/ipa-recipient
node tools/opengym-qa/private-ipa-artifact.mjs decrypt artifacts/encrypted-ipa .red-fit-qa/ipa-recipient/private.pem artifacts/RED-Fit-UNSIGNED.ipa
```

Keep `private.pem` locally until the export is recovered. It must never be committed, pasted into workflow inputs or uploaded. The export test checks round-trip, tampering, wrong recipients and refusal to overwrite an existing key/export.

Still required for installable delivery: native UI acceptance, valid Apple signing, a signed IPA or TestFlight build, real iPhone acceptance (including backup exclusion, data continuity, native traffic and VoiceOver), and any migration between the earlier and new bundle IDs. Android/Windows packaging follows the iPhone priority. No signing credentials are fabricated, exposed or committed.

Apple references: [UITabBar](https://developer.apple.com/documentation/uikit/uitabbar), [UIKit Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/284/), [backup exclusion](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup).
