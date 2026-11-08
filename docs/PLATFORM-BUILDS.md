# RED Fit – iPhone und Windows (Integrationsstand)

## Architektur
Ein React/TypeScript-Core; Dexie/IndexedDB bleibt lokal, kein verpflichtender Server.
- Web: bestehende Vite-PWA.
- iPhone: Capacitor-Shell (`capacitor.config.json`), Xcode/iOS-Projekt **noch nicht generiert**.
- Windows: Tauri-2-Rust-Shell (`src-tauri/`); noch kein verifizierter Installer.

**Status: Scaffold, keine lauffähigen Native-Releases.** Das reguläre
`package-lock.json` existiert, jedoch fehlen darin weiterhin die nativen
Capacitor-/Tauri-CLI-Pakete. Außerdem fehlen Rust-`Cargo.lock`, Desktop-Icons,
Signierung, generierte iOS-Dateien und native Build-Nachweise.

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

## Native Navigation und App-Updates (2026-11-08)

Die PWA behält Browser-History-Routing (z. B. `/training`) und verwendet
weiterhin ihren Service Worker für Offline-Assets und Update-Prompts.
Native WebViews benötigen dagegen ein verlässliches Dokument unter ihrer
gepackten lokalen Origin. RED Fit wählt deshalb über `detectPlatform()`
automatisch **Hash-Routing** (`#/training`) für iPhone/Capacitor,
Android/Capacitor und Windows/Tauri.

`registerServiceWorker()` läuft **ausschließlich im produktiven Web/PWA**,
nicht im nativen WebView. Das verhindert eine zusätzliche Web-Cache-Schicht,
die sonst nach nativen App-Updates veraltete HTML-/JS-Assets ausliefern könnte.
Native Offline-Funktionalität hängt von den gepackten Web-Assets ab;
ein erfolgreiches Geräte-Update-/Offline-Verhalten ist noch zu prüfen.

In der Windows-Entwicklung zeigen `beforeDevCommand` und `devUrl`
jetzt auf dieselbe IPv4-Origin `127.0.0.1:5173`. Dies verhindert eine
potenzielle `localhost`-Auflösung zu IPv6 bei an IPv4 gebundenem Vite.

Die plattformunabhängige Entscheidung und die Windows-Host-Übereinstimmung
wurden in einem isolierten Node-22.16-Test tatsächlich geprüft:

```bash
node --experimental-strip-types --test tools/native-shell.selftest.mjs
```

**Ergebnis: 7/7 Tests bestanden**, isolierter TypeScript-Check ebenfalls
erfolgreich. Der getestete Quelltext wurde mit den auf GitHub gespeicherten
Dateien per FNV32 abgeglichen. Das prüft den Plattformentscheid und die
Konfiguration, **nicht** die tatsächliche WebView, den Installer oder Xcode.

Auf einem tatsächlichen iPhone-/Windows-Build sind vor Freigabe folgende
zusätzlichen Abläufe auszuführen: Eine tiefe Route öffnen
(`#/training/workout/:workoutId`), App beenden und wieder öffnen, Seite
neu laden, gespeichertes aktives Workout fortsetzen und IndexedDB-Daten
unverändert vorfinden. Windows: nach Installer-Update denselben Ablauf
wiederholen, ohne PWA-Update-Toast. PWA: weiterhin Navigation ohne `#`
und bestätigungsbasiertes SW-Update prüfen.

## Pflichtprüfungen vor Release
1. Vollständiges Backup der bestehenden lokalen Daten erstellen.
2. Vorher/Nachher-Zählung aller Dexie-Stores einschließlich Recovery, Medien, Fotos.
3. Aktives Workout nach App-Kill/Neustart fortsetzen und Timer validieren.
4. Deep Links, lokale Browserhistorie, Kamera-Fallback und Offline-Start testen.
5. PWA-Service-Worker-Verhalten in Capacitor-/Tauri-Origins separat untersuchen.
6. HealthKit-Berechtigungen nur nach ausdrücklicher Aktion anfordern.
7. iPhone: echte Geräte-Tests für Backgrounding, Safe Areas und Touch-Ziele.
8. Windows: Installer, Update, Skalierung, Tastatur und Datenpersistenz testen.
8a. Optionalen separaten Foto-Transfer von iPhone → Windows → iPhone mit
    realen JPEG/HEIC-Bildern, kontrollierten IDs und sicherer Dateifreigabe
    prüfen; Format ist unverschlüsselt und begrenzt (siehe `docs/PHOTO-TRANSFER.md`).
9. Keine Green-Build- oder Installationsbehauptungen ohne tatsächlichen Nachweis.

## Quellen und Rechtliches
Original-ZIP-Archive sind als getrennte Quellensnapshots vorbereitet; Details
und Checksummen in `docs/INTEGRATION-ROADMAP.md`. Einzelne openGym-Konzepte
wurden in neue RED-Fit-Module umgesetzt. wger-Datensätze werden nur auf
ausdrückliche Importaktion mit Quellen-/Lizenznachweis gespeichert.
Insbesondere werden keine eingeschränkt lizenzierten Gym-visual-Medien
in die App eingebaut.
