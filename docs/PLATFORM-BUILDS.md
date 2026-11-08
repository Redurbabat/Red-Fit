# RED Fit – iPhone und Windows (Integrationsstand)

## Architektur
Ein React/TypeScript-Core; Dexie/IndexedDB bleibt lokal, kein verpflichtender Server.
- Web: bestehende Vite-PWA.
- iPhone: Capacitor-Shell (`capacitor.config.json`), Xcode/iOS-Projekt **noch nicht generiert**.
- Windows: Tauri-2-Rust-Shell (`src-tauri/`); noch kein verifizierter Installer.

**Status: Scaffold, keine lauffähigen Native-Releases.** Die npm-Pakete/Lockfiles,
Rust-Cargo-Lockdatei, App-Icons, Signierung und native Build-Nachweise fehlen noch.

## iPhone (auf macOS)
Voraussetzungen: ein passendes aktuelles Xcode, Apple-Toolchain, Node.js sowie ggf.
ein Apple-Developer-Konto für Gerätedistribution.

```bash
npm ci
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npm run typecheck && npm run test && npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Diese Paketinstallationen müssen in einem getrennten Commit mit aktualisierter
`package-lock.json` gesichert werden. Bundle-ID `com.redfit.app` ist ein
**Platzhalter**, der vor dem Signieren mit einer verfügbaren eigenen ID zu ersetzen ist.
Native APIs (HealthKit/Notifications/Camera) sind noch **nicht** eingebunden.
`src/core/platform/platform.ts` meldet Health-Daten ausdrücklich als nicht unterstützt.

## Windows
Voraussetzungen: Windows + Microsoft C++ Build Tools, Rust und WebView2, Node.js,
Tauri-CLI. Gerüst: `src-tauri/Cargo.toml`, `build.rs`, `src/main.rs`,
`tauri.conf.json`, minimale Capability.

```bash
npm ci
npm install -D @tauri-apps/cli
npm run typecheck && npm run test && npm run build
npx tauri dev
npx tauri build
```

Diese Installationen aktualisieren `package-lock.json`. Noch fehlen die
zu prüfenden Windows-Icons/Installer-Metadaten und der tatsächliche MSVC-Build.
Tauri-Core-Berechtigungen sind minimal; Datei-/Health-Plugins werden nicht
vorsorglich freigegeben.

## Pflichtprüfungen vor Release
1. Vollständiges Backup der bestehenden lokalen Daten erstellen.
2. Vorher/Nachher-Zählung aller Dexie-Stores einschließlich Recovery, Medien, Fotos.
3. Aktives Workout nach App-Kill/Neustart fortsetzen und Timer validieren.
4. Deep Links, lokale Browserhistorie, Kamera-Fallback und Offline-Start testen.
5. PWA-Service-Worker-Verhalten in Capacitor-/Tauri-Origins separat untersuchen.
6. HealthKit-Berechtigungen nur nach ausdrücklicher Aktion anfordern.
7. iPhone: echte Geräte-Tests für Backgrounding, Safe Areas und Touch-Ziele.
8. Windows: Installer, Update, Skalierung, Tastatur und Datenpersistenz testen.
9. Keine Green-Build- oder Installationsbehauptungen ohne tatsächlichen Nachweis.

## Quellen und Rechtliches
Original-ZIP-Archive sind als getrennte Quellensnapshots vorbereitet; Details
und Checksummen in `docs/INTEGRATION-ROADMAP.md`. Einzelne openGym-Konzepte
wurden in neue RED-Fit-Module umgesetzt. wger-Datensätze werden nur auf
ausdrückliche Importaktion mit Quellen-/Lizenznachweis gespeichert.
Insbesondere werden keine eingeschränkt lizenzierten Gym-visual-Medien
in die App eingebaut.
