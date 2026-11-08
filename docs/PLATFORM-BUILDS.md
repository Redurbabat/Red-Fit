# RED Fit – iPhone und Windows (Integrationsstand)

## Architektur
Ein React/TypeScript-Core; Dexie/IndexedDB bleibt lokal, kein verpflichtender Server.
- Web: bestehende Vite-PWA.
- iPhone: Capacitor-Shell (`capacitor.config.json`), Xcode/iOS-Projekt **noch nicht generiert**.
- Windows: Tauri-2-Rust-Shell (`src-tauri/`); noch kein verifizierter Installer.

**Status: Scaffold, keine lauffähigen Native-Releases.** Das reguläre
`package-lock.json` existiert, jedoch fehlen darin weiterhin die nativen
Capacitor-/Tauri-CLI-Pakete. Außerdem fehlen Rust-`Cargo.lock`, Signierung,
generierte iOS-Dateien und native Build-Nachweise. Die Windows-Icondateien
werden nun bei Bedarf aus dem bereits enthaltenen PWA-Icon generiert.

## iPhone (auf macOS)
Voraussetzungen: ein passendes aktuelles Xcode, Apple-Toolchain, Node.js sowie ggf.
ein Apple-Developer-Konto für Gerätedistribution.

```bash
npm run native:plan
npm run native:bootstrap
npm run native:check
npm ci
npm run typecheck && npm run test && npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

`native:bootstrap` installiert explizit Capacitor 8.6.0 und Tauri CLI 2.12.4
und prüft danach `package.json` sowie `package-lock.json`. **Beide
Manifestdateien müssen gemeinsam gepusht werden**; eine npm-Installation wurde
hier mangels Registry-Netzwerk nicht ausgeführt.
Details: [Nativer Dependency-Bootstrap](NATIVE-DEPENDENCY-BOOTSTRAP.md). Bundle-ID `com.redfit.app` ist ein
**Platzhalter**, der vor dem Signieren mit einer verfügbaren eigenen ID zu ersetzen ist.
Native APIs (HealthKit/Notifications/Camera) sind noch **nicht** eingebunden.
`src/core/platform/platform.ts` meldet Health-Daten ausdrücklich als nicht unterstützt.

## Windows
Voraussetzungen: Windows + Microsoft C++ Build Tools, Rust und WebView2, Node.js,
Tauri-CLI. Gerüst: `src-tauri/Cargo.toml`, `build.rs`, `src/main.rs`,
`tauri.conf.json`, minimale Capability.

```bash
npm run native:bootstrap
npm run native:check
npm ci
npm run typecheck && npm run test && npm run build
npx tauri dev
npx tauri build
```

Nach der geprüften Bootstrap-Installation müssen `package.json` und
`package-lock.json` gemeinsam versioniert werden. Der Rust-/MSVC-Build
und die tatsächlichen MSI-/NSIS-Installer müssen weiterhin auf Windows geprüft
werden. Das Icon-Generatorgerüst ist vorhanden und lokal getestet.
Tauri-Core-Berechtigungen sind minimal; Datei-/Health-Plugins werden nicht
vorsorglich freigegeben.

## Offline verifizierbarer nativer Dependency-Bootstrap

`tools/nativeDependencies.mjs` verwaltet die explizit gepinnten
Capacitor-/Tauri-Pakete und prüft die beiden npm-Manifeste inklusive der
aufgelösten Lockfile-Pakete. `tools/bootstrap-native.mjs` bietet einen
`--plan`-, `--install`- und `--check`-Modus (auch als npm-Skripte
`native:plan`, `native:bootstrap` und `native:check`). Fehlschläge
beim Installieren stellen Manifest und Lockfile zurück.

In isolierter Linux-Testumgebung mit Node 22.16 liefen
`node --test tools/native-deps.selftest.mjs` erfolgreich: **14/14 Tests**.
Enthalten sind korrekte Versionen, fehlende/mangelhafte Lockfile-Pakete,
Konflikte, nicht verändernder Planmodus und Rollback nach fehlgeschlagenem
Mock-npm. Die verwendeten lokalen Quelltexte wurden mit den GitHub-Dateien
per Länge und FNV32 abgeglichen. Dieser Nachweis **installiert keine
Abhängigkeiten** und ist kein nativer Build.

Die Registry ist aus der ausführenden Umgebung nicht erreichbar; für einen
fertigen `package-lock.json`-Commit muss `native:bootstrap` in einem
Repository-Checkout mit funktionierender npm-Netzwerkverbindung laufen.
Siehe [Nativer Dependency-Bootstrap](NATIVE-DEPENDENCY-BOOTSTRAP.md).

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

## Windows: reproduzierbare RED-Fit-Icons (2026-11-08)

Beim Review stellte sich heraus, dass `src-tauri/icons/` fehlte und keine
Dateipfade in der Tauri-Bundle-Konfiguration angegeben waren. Die eigentliche
RED-Fit-PWA enthält bereits `public/icons/icon-512.png`; dieses vorhandene
Branding wird wiederverwendet, kein anderes Logo und keine externen Assets.

```bash
# Ohne npm-Install, Bildbibliothek oder Netzwerk; braucht Node 22:
npm run desktop:icons
# Alternativ direkt: node tools/prepare-windows-icons.mjs

# Isolierter Test des PNG-/ICO-Generators:
npm run test:native-icons
```

Dabei entstehen in `src-tauri/icons/`: `32x32.png`, `128x128.png`,
`128x128@2x.png`, `icon.png` (512 px) und `icon.ico` mit den
Windows-Layern **32, 16, 24, 48, 64 und 256 px**. PNGs werden als 8-Bit-RGBA
ausgegeben, der ICO-Container bindet mehrere PNG-Layer ein. Bildskalierung
verwendet bilineare Interpolation mit vorverarbeitetem Alpha, um dunkle
Kanten zu vermeiden. Falsches Quellformat, CRC-Fehler und zu kleine
Quellicons führen zum Abbruch statt unbemerkt Ersatzbilder zu produzieren.

`tauri.conf.json` ruft `desktop:icons` automatisch vor
`beforeDevCommand` und `beforeBuildCommand` auf; `bundle.icon` verweist
auf die erzeugten Ressourcen. Die Binärdateien werden absichtlich
**nicht versioniert**, sondern können deterministisch neu generiert werden.
Beim direkten Aufruf von `cargo build` zunächst
`node tools/prepare-windows-icons.mjs` ausführen (Cargo startet keine
Tauri-CLI-Vorbereitung).

Am 2026-11-08 wurden mit einem synthetischen RGBA-512-Icon tatsächlich
**6/6 isolierte Node-Tests bestanden** (PNG-Roundtrip, korrupte PNG-CRC,
zu kleines Bild, Skalierung/Alpha, ICO-Auflösungen und Generierung aller
Dateien). Das echte private Repository-Bild konnte in dieser Umgebung
nicht als Binärdatei abgerufen werden; ein Windows-Installer wurde
**nicht** erzeugt. Mit dem vorhandenen PWA-Icon vor Ort erneut ausführen.

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
