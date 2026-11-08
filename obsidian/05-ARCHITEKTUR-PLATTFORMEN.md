---
tags: [red-fit, architecture, ios, android, windows]
updated: 2026-11-08
---
# Architektur: ein Core, vier Ausgabekanäle

**Gemeinsamer produktiver Kern:** React 19, TypeScript strict, Vite, React Router, Dexie/IndexedDB, Zod, CSS-Tokens, Vitest. Bestehende Konventionen: `ARCHITEKTUR.md`, `CLAUDE.md` und `src/services/storage/`.

| Ziel | Verpackung | derzeitiger Nachweis |
|---|---|---|
| Web | bestehende offline-fähige PWA | vorhandene App |
| iPhone/iOS | Capacitor 8, Xcode, WebView | Config/Scaffold, kein verifiziertes IPA |
| Android | Capacitor 8, Android Studio/Gradle, WebView | Plattformdetektion bereits vorhanden; native APK/AAB und Toolchain-Setup ausstehend |
| Windows | Tauri 2 + Rust + WebView2 | Tauri-Gerüst, Icon-Pipeline; kein verifizierter Installer |

**Architekturentscheidung:** Keine separaten Flutter-, Django- und openGym-Server-Runtimes in der endgültigen App; Funktionen in sauber abgegrenzte RED-Fit-Features portieren. Eine App bedeutet eine Bedienoberfläche und einen Fachkern, **nicht** eine identische Binärdatei auf verschiedenen Betriebssystemen. Native Build-Artefakte werden pro Plattform erzeugt.

**Datenregel:** Local-first, keine Pflichtanmeldung; `red-fit` IndexedDB als führender Datenspeicher, ausschließlich via Repositories. Workout-Status, Revisionen, Notizen, Mahlzeiten-Snapshots und Backup sind nicht destruktiv zu migrieren. Pro Gerät bleibt der Speicher lokal; **automatische Synchronisation zwischen iPhone, Android und Windows besteht damit noch nicht**. Gerätewechsel nur per vorhandenem explizitem Backup/Import, solange kein eigenes Konflikt-/Sync-Modell umgesetzt ist.

**Routen:** Web-Browser nutzt BrowserHistory; native Capacitor-/Tauri-WebViews Hash-Routen; nativer PWA-Service-Worker deaktiviert. Siehe `src/core/platform/platform.ts`.

## Build-Gates (noch nicht als erledigt markieren)
```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:offline
```
Native vorbereiten (Node 22+ und Registry): `npm run native:bootstrap && npm run native:check`. Dann iOS auf macOS/Xcode: `npx cap add ios && npx cap sync ios && npx cap open ios`. Android unter Android SDK: `npx cap add android && npx cap sync android && npx cap open android`. Windows auf Windows/Rust/MSVC: `npx tauri build`.

Keine Release-Aussage ohne echte Installation, Neustart, Offline-Test, Trainingsfortsetzung, Backup-Restore und Update-Test auf Zielgerät.
