# RED Fit — iOS/Android Capacitor bridge contract

Status as of 2026-11-09: **TypeScript interfaces and isolated Node tests only**. No optional native plugins are installed, no iOS or Android project has been generated, and neither an IPA nor an APK exists.

## Implemented in Agent 04

- src/core/platform/mobileBridges.ts: guarded haptics with browser vibration fallback; explicit Camera.takePhoto for Capacitor Camera 8.1+ (URI and webPath returned, no full-resolution base64 claim); deduplicated lifecycle subscriptions using document events plus optional Capacitor App; Android hardware Back only when explicitly subscribed. Late native listener subscriptions are cleaned up.
- src/core/platform/mobileFileExport.ts: user-triggered text/JSON backup export. Native Filesystem Cache + OS Share when genuinely registered; temporary private file deleted even if sharing is cancelled. Otherwise use Web Share, or browser-only download. Native WebViews without share capability report unsupported instead of pretending an export succeeded. Filenames are validated; UTF-8 encoded correctly.
- Existing src/services/barcode/barcodeService.ts and manual barcode entry are unchanged; no mandatory scanner. HealthDataProvider remains unsupported pending vetted plugin, permissions and device tests.
- Capacitor application ID proposed as com.redurbabat.redfit on both iOS and Android. Verify signing/provisioning and existing app sandboxes before installing. This identifier is not an Apple Team ID or a provisioning profile.

## Native plugin registration is pending

The repository currently has no installed @capacitor/app, @capacitor/haptics, @capacitor/camera, @capacitor/filesystem or @capacitor/share. After verifying compatible versions, install and sync those selected plugins, import their actual JavaScript exports and call registerMobilePlugins({ App, Haptics, Camera, Filesystem, Share }) from the app entry point. An installed native binary without registered JS exports is not enough. Do not request HealthKit/Health Connect or camera permissions on app launch. Camera results are temporary; persist photos via the existing media repository before restarting the app. Android camera activity termination additionally requires appRestoredResult handling before release.

## Bootstrap on a networked native machine

Use the existing branch agent/redfit-04-ios-android. Run in order:

1. node --experimental-strip-types --test tools/mobile-bridges.selftest.mjs
2. npm run native:plan
3. npm run native:bootstrap (updates package.json and package-lock.json together, requires npm network)
4. npm run native:check && npm ci
5. npm run typecheck && npm run lint && npm run test && npm run build
6. npm run test:native-deps

iOS: on macOS/Xcode, after dependencies are installed run npx cap add ios, npm run ios:icons, npx cap sync ios and build/test in Xcode with a valid Apple provisioning profile. Android: with Android Studio/SDK/JDK, run npx cap add android, npx cap sync android, build in Gradle and test on a device/emulator. Check in actual generated native project files only after review; never commit generated build outputs, credentials or signing keys. Do not create a Codemagic signing pipeline without working and permitted provisioning.

## Required real-device verification (pending)

iPhone, iPad, Android phone and tablet: safe area (already implemented via viewport and CSS), status bar, keyboard resize, 44pt taps, large text, accessibility/screen reader, Reduce Motion, orientation, hardware Back and hash deep links. Test offline cold start, active workout and Dexie database persistence through app backgrounding, forced termination and update. Test denied/cancelled camera permission, manual barcode fallback, native export, temporary file deletion and media recovery. No automatic device sync or cloud publication.

Always distinguish: configuration; web build; native simulator build; real-device test; signable IPA; built APK. This branch has only the first (partial) state and isolated code tests. Existing routing/PWA service-worker rules were retained; Windows/Tauri and styling paths are owned by other agents.

Source contracts: AGENTS.md, ARCHITEKTUR.md, docs/PLATFORM-BUILDS.md, docs/NATIVE-DEPENDENCY-BOOTSTRAP.md, docs/2031/MOBILE_DESIGN.md, RED Morph native UX/motion and BBT iOS/release skills. Official Capacitor API documentation: https://capacitorjs.com/docs/apis/app, https://capacitorjs.com/docs/apis/camera, https://capacitorjs.com/docs/apis/filesystem.