# RED Fit – native Capacitor-/Tauri-Abhängigkeiten reproduzierbar installieren

## Warum das erforderlich ist

Auf dem Feature-Branch liegen die Capacitor-Konfiguration für iPhone und das
Tauri-2-Gerüst für Windows bereits im Quellcode. Das bestehende `package-lock.json`
enthält aber **noch keine nativen CLI-Pakete**. Das bestehende `npm ci` kann
deshalb weder `npx cap` noch `npx tauri` bereitstellen.

Das Tool `tools/bootstrap-native.mjs` installiert die fehlenden Paketversionen
bewusst **nur nach ausdrücklichem Aufruf**, prüft Manifest und Lockfile und
verändert weder `main` noch native Signing-Dateien oder die IndexedDB-Daten.

### Versionen (stabiler Stand 2026-11-08)

| Package | Gepinnte Version | Gruppe |
| --- | --- | --- |
| `@capacitor/core` | `8.6.0` | dependencies |
| `@capacitor/ios` | `8.6.0` | dependencies |
| `@capacitor/android` | `8.6.0` | dependencies |
| `@capacitor/cli` | `8.6.0` | devDependencies |
| `@tauri-apps/cli` | `2.12.4` | devDependencies |

Die vier Capacitor-Pakete (Core, iOS, Android und CLI) erhalten **dieselbe** Version. Es werden
reproduzierbare exakte Versionen statt `latest` oder `^8` eingetragen.

Offizielle Referenzen:
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/updating/8-0
- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/start/create-project/

## Einmaliger Bootstrap auf einem Rechner mit Internet

Im lokalen Checkout von
`feat/unified-iphone-windows-integration`, Node.js **22 oder neuer**:

```bash
# Zeigt ausschließlich die geplanten Installationsbefehle:
npm run native:plan

# Installiert exakt die oben genannten vier Pakete und erzeugt Lockfile-Einträge:
npm run native:bootstrap

# Prüft package.json und package-lock.json ohne Netzwerkanfrage:
npm run native:check

# Prüft nach der Installation alle Web-/React-Qualitätsgates:
npm ci
node tools/verify-local.mjs --skip-install
```

Nach dem Bootstrap müssen **`package.json` und `package-lock.json`
zusammen** in einem geprüften Commit auf den Feature-Branch. Beide Dateien
werden bei einer fehlgeschlagenen npm-Installation automatisch auf den
ursprünglichen Stand zurückgeschrieben. npm kann dabei bereits Dateien
unter `node_modules/` verändert haben; nach erfolgreichem Bootstrap daher
immer `npm ci` für einen sauberen Zustand ausführen.

Bereits abweichende Versionen im Projekt werden **nicht stillschweigend
überschrieben**; zuerst müssen sie geprüft werden. `native:check` prüft
die Metadaten, nicht die Existenz einer nativen Binary, die Gültigkeit einer
Signatur oder einen erfolgreichen Tauri-/Xcode-Build.

### iPhone – zusätzliche Schritte auf macOS

Xcode 26 oder neuer, iOS-Simulator, ggf. Apple-Developer-Signierung
vorbereiten; die offizielle Capacitor-8-Umgebung benötigt Node.js 22+.

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

`ios/` ist noch nicht generiert. Die tatsächlichen Xcode-Projekte,
Entitlements, Bundle-ID, Signing und Tests auf Simulator/echtem iPhone müssen
nach der Generierung geprüft werden.

### Android – zusätzliche Schritte mit Android Studio

Voraussetzungen: Node.js 22+, Android Studio, Android SDK mit unterstützter
Build-Tools-/JDK-Konfiguration, Android-Emulator oder echtes Testgerät.

```bash
npm run native:bootstrap
npm run native:check
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
npx cap add android
npx cap sync android
npx cap open android
```

`android/` ist ein generiertes natives Projekt und liegt derzeit nicht als
verifizierter Android-Build vor. Gradle-Sync, Package-ID, Berechtigungen,
Signing, APK/AAB, Offline-Wiederanlauf, IndexedDB-Persistenz und Updates auf
Emulator/Realgerät prüfen. Keine Health-Connect-/Benachrichtigungsfunktion
ohne implementierte Bridge und Nutzerberechtigung behaupten.

### Windows – zusätzliche Schritte auf Windows

Rust mit MSVC-Toolchain, Visual Studio Build Tools mit C++-Komponenten,
WebView2 und den Tauri-Voraussetzungen installieren.

```powershell
npm run desktop:icons
npm run build
npx tauri build
```

Tauri erzeugt MSI/NSIS nur nach einem erfolgreich geprüften Rust-/MSVC-Build.
`src-tauri/Cargo.lock` wird beim ersten auflösbaren Rust-Build erzeugt und
muss für reproduzierbare Builds mitversioniert werden.

## Unabhängige Bootstrap-Prüfung

```bash
node --test tools/native-deps.selftest.mjs
```

**Lokal ausgeführt am 2026-11-08 auf Linux mit Node 22.16: 14/14 Tests
bestanden.** Die geprüften Dateien wurden mit dem GitHub-Stand über Größe
und FNV32 verglichen. Der Test umfasst Manifest-/Lockfile-Abgleich,
korrekte Versionen, Fehlerfälle, Plan-/Prüfmodus und Rücksetzen nach
absichtlich fehlgeschlagener Installation. Es wurden **keine echten
npm-Pakete in diesen Tests installiert**.

Die npm-Registry war in der ausführenden Umgebung nicht erreichbar
(`EAI_AGAIN` / DNS-Auflösung fehlgeschlagen). Deshalb sind die nativen
Abhängigkeiten **noch nicht im Repository-Lockfile**, und es wurde
**weder ein iOS- noch ein Windows-Binary** gebaut. Die bestehende GitHub-CI
scheitert vor der Runner-Zuweisung (siehe `docs/CI-RECOVERY.md`).
