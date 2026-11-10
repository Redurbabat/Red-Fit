# Agent 04 — iPhone zuerst: Original-openGym → RED Fit

**Datum:** 09.11.2026 · **Branch:** `agent/redfit-04-ios-android` · **PR:** #13 (bestehende PR; keine zweite PR und kein Selbst-Merge)

## Verbindliche Basis

Die bestehende Original-App unter `vendor/opengym-upstream/frontend/` ist die RED-Fit-Produktbasis. Ihre native iOS-App unter `frontend/ios/App/` wird **weiterentwickelt**, nicht mit `cap add ios` neu erstellt. Das Root-`src/` ist kein neues iPhone-Frontend. Bestehende HealthKit-, Workout-, Widget-, Watch-, Live-Activity- und Offline-Routen bleiben unverändert.

## Tatsächlich geändert

- Original-`frontend/capacitor.config.json`: `appName: RED Fit`. Der zuvor abweichende `appId: ch.duartesantos.opengym` wurde an das **bereits bestehende Xcode-Haupttarget** `PRODUCT_BUNDLE_IDENTIFIER = ch.opengym.app` angepasst. **Keine vollständige Bundle-ID-/App-Group-Migration behauptet.**
- Bestehende `App/Info.plist`, `OpenGymWidgets/Info.plist`, `Watch/Info.plist`: sichtbarer Appname `RED Fit`. Deutsche Watch-Health-Beschreibungen angepasst. Native App-Gruppen, Companion-ID und benötigte URL-Schemes wurden **nicht** verändert, um Deep-Links und Datenpfade nicht stillschweigend zu brechen.
- `frontend/ios/ci/brand-red-fit.swift`: macOS-Generator für das **Standard-iPhone-Icon** und die sechs Launch-Splash-Varianten aus dem bereits im privaten Repository vorhandenen RED-Fit-Icon `public/icons/icon-512.png`. Er verwendet AppKit und erzeugt opake RGB-PNGs. Er ist ein **Build-Schritt**; die Original-PNGs bleiben vor der Ausführung im Git unverändert. Alternative Original-Icons sind noch nicht umbenannt.
- `frontend/scripts/verify-ios-identity.mjs`: statische Source-Guard-Checks für Name, Bundle-ID-Abgleich, alle drei App-Group-Entitlements, Watch-Companion-ID und Existenz wichtiger iOS-Plugins.
- Original-`frontend/package.json`: `npm run ios:brand`, `npm run test:ios-identity`, `npm run test:ios-bundle`, `npm run build:ios`; `build:ios` führt **dieselben originalen mobilen Vite- und Medien-Staging-Schritte** aus, aber gezielt `cap sync ios` statt `cap sync` für alle Plattformen. Das ursprüngliche `build:mobile` bleibt unverändert und ist weiterhin für den bisherigen Gesamtablauf vorhanden. Keine Dependency-Änderung, daher keine `package-lock.json`-Änderung.
- `frontend/scripts/check-ios-mobile-bundle.mjs` + `.test.mjs`: iOS-spezifische Bundle-Prüfung für mobile Build-Metadaten und die bytegenaue Übereinstimmung von HTML/JS/CSS zwischen `dist` und `ios/App/App/public`. Dies prüft bewusst nicht die Android-Shell und erkennt stale Asset-Mischungen.
- Root-`.github/workflows/red-fit-iphone.yml`: **neuer tatsächlich an GitHub Actions sichtbarer Workflow**, weil die Original-`vendor/opengym-upstream/.github/workflows/ios.yml` unter `vendor/` von GitHub Actions nicht als Root-Workflow ausgeführt wird. macOS-Job nutzt das **Original-Xcode-Projekt**, baut Simulator und versucht ein **UNSIGNIERTES** iPhone-`.ipa` als privates 7-Tage-Testartefakt zu sichern. Keine Store- oder Web-Veröffentlichung.

## Prüfung / Grenzen

- Per GitHub-Verbindung gegen den aktuellen Agent-Branch die tatsächlichen Dateien gelesen und **12/12 Source-Assertions** für iOS-Capacitor-Namen, Xcode-Bundle-ID, App-/Widget-/Watch-Namen, App Groups, Companion-ID und Skriptverknüpfung ausgeführt: **BESTANDEN** (deklarativer Quellcodeabgleich, **kein Build**).
- `npm ci`, `npm run build:ios`, `swift ios/ci/brand-red-fit.swift`, `xcodebuild`, Simulatorstart, iPhone-Echtgerät-Workouts und IPA-Signierung wurden **hier nicht ausgeführt**. macOS/Xcode und ein gestarteter GitHub-Actions-/Codemagic-Build wurden bislang nicht nachgewiesen.
- **Sicherheits-/Migrationsvorbehalt:** Xcode verwendet `ch.opengym.app`, App Group `group.ch.opengym.app`, Watch- und Widget-IDs, Deep-Links und mehrere native Swift-Konstanten. Für das spätere eigene `com.redurbabat.redfit` muss die gesamte Identifier-/Keychain-/Health-/Widget-/App-Group-/Watch-/URL-/Daten-Migration zusammen geprüft werden. Nur `appId` oder nur `PRODUCT_BUNDLE_IDENTIFIER` zu ändern wäre gefährlich. Eine freie persönliche Apple-ID stellt zudem nicht automatisch alle nötigen HealthKit-/App-Group-/Widget-Berechtigungen bereit.
- Original-`LICENSE` und `NOTICE.md` unverändert; Lizenz für Gym-visual-Medien gesondert beachten.

## Nächste Schritte

1. PR #13: CI-Workflow `RED Fit – original iPhone` auf macOS ausführen und **reale** npm-, Pod-, Swift-/Xcode-Ergebnisse prüfen; eventuelle Compilerfehler im bestehenden Originalprojekt beheben. Kein Simulator- oder IPA-Erfolg ohne Logbeleg.
2. Im privaten Build-App-Paket `CFBundleDisplayName`, das generierte AppIcon/Splash, `App.app/PlugIns` und vorhandene Health-/Workout-Brücken tatsächlich kontrollieren.
3. Mit Besitzer/Apple-Signing-Setup die **neue eigene Bundle-ID** und alle Extensions/App Groups für privat signierbares iPhone-Paket festlegen. Nichts signieren oder behaupten, solange Zertifikate/Provisioning fehlen.
4. Erst nach Installerfolg am echten iPhone Training → Sätze → Pause → sperren → entsperren → Fortsetzen → Verlauf und vollständigen Offline-Neustart prüfen. Bestehende Daten vorher sichern.
5. Original-Frontend-Branding und optionale Icon-Varianten mit UI-Agent 02 abstimmen; nicht sein globales Stylesystem überschreiben.

## GitHub-Actions-Nachprüfung (09.11.2026, nach PR-Aktualisierung)

- **Original-iPhone-Workflow:** Run [42702410198](https://github.com/Redurbabat/Red-Fit/actions/runs/42702410198), `conclusion: failure`. Der GitHub-Jobeintrag `ios` (Job `129450279735`) enthält **keine ausgeführten Steps** (`steps: null` / Stepabfrage leer); der Log-Abruf lieferte `404 BlobNotFound`. Damit gibt es **keinen Beleg für einen gestarteten npm-, Swift- oder Xcode-Schritt** und insbesondere **keinen Compilerfehlernachweis**.
- **Allgemeine CI:** Run `42702410066` ebenfalls `failure` ohne Stepaufzeichnungen in den beiden Jobs. Das deutet auf ein übergeordnetes GitHub-Actions-/Runner-Problem hin, ist aber **keine bestätigte Ursache**. In GitHub Actions die konkrete Run-Fehlermeldung und gegebenenfalls private Runner-/Budget-/Billing-Regeln prüfen.
- Der iPhone-Build und das unsigned IPA bleiben ausdrücklich **NICHT BESTANDEN / NICHT ERZEUGT**.

## Neu ausgeführter Arbeitsschritt: iOS-only Build-Stabilisierung (09.11.2026)

**Problem im überprüften Originalcode:** `build:mobile` führt `cap sync` ohne Plattformfilter aus und `check-mobile-bundle.mjs` nimmt sämtliche vorhandenen Shell-Verzeichnisse (auch Android) in die Prüfung auf. Ein iPhone-only Runner würde damit unnötig eine bereits vorhandene Android-Shell synchronisieren/prüfen. Die neue `build:ios`-Pipeline synchronisiert deshalb **nur iOS**, ohne das originale `build:mobile` zu verändern.

**Tatsächlich ausgeführte, belegte Tests in isolierter Node-22.16-Umgebung:**
- `node --test scripts/check-ios-mobile-bundle.test.mjs` → **5/5 PASS**. Fälle: gültiges iOS-Bundle, abweichendes JS im iOS-Copy, falsches Web-HTML im iOS-Copy, fehlendes iOS-Copy, ignorierte Android-Shell beim iOS-only-Build.
- Die beiden neuen Prüfsourcen im lokalen Test stimmen über `git hash-object` **byteidentisch** mit den GitHub-Blobs überein: `check-ios-mobile-bundle.mjs` = `87b08c1609d3e18979fd2b53439ea07c8fec7570`; `check-ios-mobile-bundle.test.mjs` = `dc089dce9c3cf47fac3a9035243694dd52ac3b41`. Der importierte Original-`checkCopy`-Check wurde lokal entsprechend dem gelesenen Original-`check-mobile-bundle.mjs` bereitgestellt.
- Die im GitHub-Branch gespeicherte `brand-red-fit.swift`-Quelle stimmt über `git hash-object` mit `9bcb1cefb385863ffb359a3d7f3560ea84b26681` überein. `swiftc -frontend -parse ios/ci/brand-red-fit.swift` mit Swift 6.2.1/Linux → **EXIT 0**. Das bestätigt nur die Syntax, **keine** AppKit-Auflösung, macOS-Ausführung, PNG-Generierung oder Xcode-Asset-Kompilierung.
- Der Root-iOS-Workflow ruft die fünf Node-Tests nun vor `npm ci` als eigenständigen Step auf, **falls GitHub Actions wieder Jobs ausführt**.

**CI-Blocker weiterhin:** Auf GitHub-Actions-Läufen `42702855024` (iOS) und `42702855185` (allgemein) enden alle Jobs nach wenigen Sekunden mit `failure` und ohne aufgezeichnete Steps. Die Ursache ist über die verfügbaren GitHub-Run-/Job-Metadaten noch nicht ermittelbar; kein Code-/Compilerfehler belegt. Es gibt weiterhin **kein IPA**. Der Besitzer muss die GitHub Actions Run-UI/Account-Runner-Ausführung prüfen, um den Build zu entsperren.

## Codemagic-Alternative für den nicht startenden GitHub-macOS-Runner (09.11.2026)

- **Neu:** Root-`codemagic.yaml` auf diesem Branch. Der Workflow `red-fit-iphone-unsigned` baut **manuell**, ohne Webhook, ohne App-Store-Veröffentlichung und ohne Signierungs-Secrets das **bereits vorhandene originale** `vendor/opengym-upstream/frontend/ios/App/App.xcworkspace`.
- Codemagic-Einstellungen: `working_directory: vendor/opengym-upstream/frontend`, `mac_mini_m2`, Xcode `26.5`, Node `v22.11.0`. Die Pipeline führt `npm run test:ios-bundle`, `npm ci`, `npm run build:ios`, die **originalen** drei `ios/ci/add-*.rb`-Integrationsskripte und ein natives `xcodebuild CODE_SIGNING_ALLOWED=NO` aus. Nur bei erfolgreichem App-Build wird eine unsignierte `RED-Fit-UNSIGNED.ipa` gepackt und als privates Artefakt vorgesehen.
- **Dokumentation (kein Buildnachweis):** Laut Codemagic-YAML-Referenz muss `codemagic.yaml` im Repository-Root liegen. Ohne `triggering.events` ist der Start ausschliesslich manuell. Für Monorepos unterstützt Codemagic `working_directory`. Ein solches unsigniertes IPA ist **nicht auf einem physischen iPhone installierbar**: Für private Installation sind gültige Apple-Signatur, App-ID und passende Provisioning-Profile (bei Extensions für jede relevante Extension) notwendig.
- **Blocker:** Ein tatsächlicher Codemagic-Build benötigt eine Codemagic-Verbindung mit Leserechten für das private Repository und eine **manuelle Auswahl von Branch `agent/redfit-04-ios-android` und Workflow `red-fit-iphone-unsigned`**. In dieser Sitzung besteht **kein Codemagic-Build-Zugriff/kein bestätigter Codemagic-Run**, keine IPAs und keine erfolgreiche Xcode-Kompilierung. Die Konfiguration alleine reicht nicht.
- Codemagic-Dokumentation (am 09.11.2026 geprüft): https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/ ; https://docs.codemagic.io/getting-started/adding-apps/ ; https://docs.codemagic.io/yaml-code-signing/signing-ios/ .

## 09.11.2026 – Konkreter iOS-Identity-Testfehler korrigiert

- **Ist-Codefehler:** Der bisherige `verify-ios-identity.mjs` nutzte das literal `/PRODUCT_BUNDLE_IDENTIFIER\\\\s*=\\\\s*.../g` (zwei Backslashes im JavaScript-RegExp-Literal). Das würde `PRODUCT_BUNDLE_IDENTIFIER = ...;` aus dem realen `project.pbxproj` **nicht** erkennen und den `build:ios`-Abschluss fälschlich abbrechen lassen. Der Parser nutzt jetzt korrekt `/PRODUCT_BUNDLE_IDENTIFIER\\s*=\\s*.../g`; optional gequotete Werte werden ebenfalls erkannt.
- **Umsetzung:** `verifyIOSIdentity(baseDir)`, `parseProjectBundleIds` und `plistString` sind isoliert testbar; der ursprüngliche CLI-Aufruf bleibt bestehen und prüft die reale Xcode-Konfiguration. Der Identitätsvertrag für App, Watch, Widgets, App Groups und vier native Swift-Plugins wurde nicht gelockert.
- **Neue Tests:** `frontend/scripts/verify-ios-identity.test.mjs` mit **7/7 lokal ausgeführten erfolgreichen Tests** über echte temporäre Dateien; Node.js `v22.16.0`, Befehl `node --test scripts/verify-ios-identity.test.mjs`, Resultat `pass 7, fail 0`. Geprüft: 2 gültige Schreibweisen der Bundle-ID, fehlender Key, plist-Parsen mit maskierten Schlüsseln, komplette gültige native Identität, falsche Capacitor-ID, abweichende Widget-App-Group, fehlender Workout-Bridge-Plugin.
- **Byteidentität des Tests:** Lokal `git hash-object` → `c13986b183daef71837c8f31415123ac47ca0643`, identisch zum GitHub-Blob des neuen Testskripts. Der lokal geprüfte Parser `verify-ios-identity.mjs` stimmt ebenfalls mit `d37af8bdf09f34605397b0b2334bdef8366fcfa8` überein. `node --check` bestanden.
- **CI:** `npm run test:ios-identity-unit` im Original-`frontend/package.json` ergänzt und als eigenständige native Dependency-unabhängige Prüfung vor `npm ci` in GitHub Actions und Codemagic eingebunden. Keine Signing-Secrets, keine neue Abhängigkeit, kein zusätzliches Frontend.
- **Grenzen:** Diese Tests sind ein **lokaler Node-Regressionstest mit Fixture**, **kein** erfolgreicher vollständiger Original-iOS-Build. Codemagic-Build nicht ausgelöst. Letzter zuvor geprüfter Actions-Lauf `42704867580` wartete auf einen Runner; bei weiteren Commits sind neue Run-IDs möglich.

## 09.11.2026 – Original-Apple-Watch-App ebenfalls mit RED-Fit-Icon

- **Tatsächliche Branding-Lücke:** `frontend/ios/ci/brand-red-fit.swift` überschreibt bereits das iPhone-Icon und sechs Splash-Dateien, aber bisher **nicht** die Icon-Ressource des originalen Watch-Zieles `ios/App/Watch/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`. Die Watch trug deshalb weiterhin das Upstream-App-Icon, obwohl die Anzeige bereits `RED Fit` hiess.
- **Implementiert auf demselben Agent-Branch:** Der vorhandene Swift-Generator rendert jetzt auch das original von der Watch-App erwartete 1024×1024-`AppIcon-1024.png` aus derselben bestehenden RED-Fit-Iconquelle. Keine neue Watch-App, keine Änderungen an Watch-/iOS-Bundle-IDs, App-Groups, Plug-ins, Signierung oder Upstream-Lizenzen.
- **Durchgeführte statische Source-Checks im GitHub-Branch:** **6/6 bestanden**: Watch-Dateiname entspricht `Watch/Assets.xcassets/AppIcon.appiconset/Contents.json`; Watch-Sollgrösse 1024×1024; iPhone-Icon-Dateiname stimmt weiterhin; alle sechs Splash-Bezeichner decken die originale Manifest-Struktur ab; Generator greift nicht in Entitlements ein; Watch-Pfad ist die vorhandene Assets.xcassets-Struktur. Script-Git-Blob `d7dbb42d83c0ff223da76074b3cfafce77f9c29a`.
- **CI-Diagnose aktualisiert:** GitHub-Actions-iOS-Run `42706261215` endete mit `failure`, Job `129463740746` mit `cancelled`, **null aufgezeichneten Steps** und **0 ms billable macOS**; Logs über API nicht verfügbar (`404 BlobNotFound`). **Kein** Swift-/Xcode-Fehler bewiesen. Die ausstehende **manuelle Codemagic-Ausführung** ist weiterhin nötig.
- **Noch nicht verifiziert:** Swift-Generator auf macOS ausführen, tatsächliche PNG-Datei ansehen, Xcode Asset Catalog kompilieren, native iPhone-/Watch-App starten und signieren. Der Source-Check bestätigt nur die vorhandenen Referenzen, nicht das Ergebnis eines macOS-Builds.

## 09.11.2026 – Tatsächliche macOS-GitHub-Builds und gezielte Fehlerbehebung

### Nachweis: Build #42709878389
- Erfolgreich: Original-Vite-Build, Katalog-Staging (6’554 Übungs-Stills und 6’554 Animationen), `cap sync ios`, `pod install`, exakte iOS-Webbundle-Prüfung.
- Tatsächlicher Fehler: Swift-Assetgenerator `Cannot create RGB bitmap` im früheren `NSBitmapImageRep`-Initialisierer. Der Generator rendert deshalb jetzt mit einem 32-bit Core-Graphics-RGB-Kontext (`noneSkipLast`, kein Alpha), bestehende Ausgabe-Dateinamen unverändert.

### Nachweis: Build #42710638856
- Erfolgreich: Beide Vorab-Regressionstests, `npm ci`, vollständiger ursprünglicher Mobile-Build mit den Medien, CocoaPods, **RED-Fit-Branding für iPhone + Apple Watch + Splash**, Einbinden aller Original-Apple-Erweiterungen, **vollständiger Xcode-Simulator-Build**.
- Noch fehlgeschlagen: Geräteschritt durch globales `xcodebuild -sdk iphoneos` bei eingebetteter `OpenGymWatchWidgets`-Erweiterung. Das global forcierte iOS-SDK bewirkte Watch-Widget-SwiftUI-Fehler `Gauge is only available in iOS 16`, `accessoryCorner is unavailable in iOS` usw., weil Watch-Code unter dem falschen SDK kompiliert wurde.
- **Korrektur auf diesem Agent-Branch:** `-sdk iphoneos` im iOS-Geräteschritt sowohl aus Root-GitHub-Workflow als auch `codemagic.yaml` entfernt. Die explizite `-destination 'generic/platform=iOS'` bleibt für das Haupt-App-Ziel bestehen. Xcode kann jetzt seine tatsächlichen SDKROOT-Einstellungen für die Watch-Subtargets verwenden. Keine Watch-Swift-API geändert, keine Watch-Features deaktiviert. **Der folgende Geräte-Build muss die Korrektur erst bestätigen.**
- QA-Artefakt aus dem fehlgeschlagenen Build ist ein ZIP mit Simulator-/Gerätelogdateien, **keine fertige IPA**: https://github.com/Redurbabat/Red-Fit/actions/runs/42710638856/artifacts/13716031712 .

### Allgemeine Root-CI
- Build #42709878652: Typecheck erfolgreich, Lint-Fehler in `src/services/workout/setNotes.ts` `no-control-regex`.
- Korrektur: derselbe ASCII-Control-/DEL-Filter ohne den verbotenen Regex-Ausdruck, `setNotes.test.ts` ergänzt. Auf dem isolierten Node-22-Runner **65’544 Eingabewerte** (inkl. aller 65’536 UTF-16-Code-Units) mit der ursprünglichen Funktion verglichen: **alle Ausgaben identisch**.
- In neuer Root-CI #42710638645: Typecheck und Lint erfolgreich, Offline-Regressionen erfolgreich, übrige Tests zum letzten Prüfzeitpunkt noch laufend.
- **Begrenzung:** Noch keine erfolgreiche Geräte-IPA, kein signiertes oder auf echtem iPhone getestetes Paket. Branch bleibt PR #13 (Draft, ungemergt).

## 09.11.2026 – ERSTER ERFOLGREICHER ORIGINAL-iPHONE-BUILD (UNSIGNIERT)

**GitHub Actions #42711457712: `completed/success`, iOS-Job `success`.** Die originale openGym-iOS-App wurde auf dem privaten PR-Branch in beiden Zielumgebungen tatsächlich mit Xcode 26.6 kompiliert: zuerst **iPhone Simulator**, danach **iPhone-Gerät (arm64, Debug, CODE_SIGNING_ALLOWED=NO)**. Watch-App, Watch-Widgets, iPhone-Widgets, Live-Activity-Erweiterung und Background-Assets-Integration wurden davor mit den originalen Upstream-Ruby-Integrationsskripten eingebunden. Der Geräte-Build **`** BUILD SUCCEEDED **`** ist im Buildprotokoll nachweisbar.

Die Pipeline packte aus dem tatsächlich gebauten `Debug-iphoneos/App.app` ein **`RED-Fit-UNSIGNED.ipa`** und prüfte `test -s`. Das GitHub-Artifact-Upload meldete **3 Dateien** und Erfolg; Artifact-ID **`13716626340`**, Grösse des gesamten ZIP-Artefakts **215’738’220 Bytes**. Es enthält den Geräte-/Simulator-Build-Log und das unsigned IPA. Das ist ein **privates Build-Artefakt**, keine App-Store-Veröffentlichung, kein durch Apple signiertes IPA und **noch nicht auf einem echten iPhone installiert oder getestet**.

- Build-Run: https://github.com/Redurbabat/Red-Fit/actions/runs/42711457712
- ZIP-Artifact: https://github.com/Redurbabat/Red-Fit/actions/runs/42711457712/artifacts/13716626340
- Erfolgsgrund: `-sdk iphoneos` nicht global erzwingen; `-destination 'generic/platform=iOS'` lässt Watch-Subtargets unter watchOS bauen, wie schon beim Simulator-Erfolg. Das ist jetzt **in GitHub Actions real mit Erfolg bestätigt**.
- Für installierbares RED Fit sind die **eigenen** Bundle-IDs, App-Groups und Apple-Entitlements für alle integrierten Ziele (App, Widgets, Watch, Watch-Widgets, Background Asset Downloader) sowie die passende Signierung/Provisionierung nötig. Das bisher unverändert erhaltene `ch.opengym.app` schützt Upstream-Architektur, ist aber nicht zwingend für ein neues unabhängiges Red-Fit-Signing geeignet. **Nicht ohne saubere Migration umstellen.**

## Allgemeine Root-CI nach erstmaliger erfolgreicher Xcode-Kompilierung

- Root-CI `42711456012` bestand **Typecheck, Lint und Offline-Regressionsjob**, scheiterte jedoch in `npm run test`. Root-Vitest sammelte ungewollt auch die separaten OpenGym-Upstream-Vitest-Dateien aus `vendor/opengym-upstream`; dadurch traten falsche Root-Pfade und fehlende Upstream-Dependencies (u. a. `@capacitor/core`) auf.
- **Gezielte Korrektur:** `vite.config.ts` enthält nun `exclude: [...configDefaults.exclude, "vendor/**"]` aus `vitest/config`. So bleibt das Root-RED-Fit-Testset erhalten, während die originalen openGym-Tests weiterhin in ihrer **eigenen** `vendor/opengym-upstream/frontend`-Umgebung ausführbar sind. Noch nicht durch den nächsten CI-Testlauf bestätigt, daher nicht als bestanden melden.

## 09.11.2026 – Vollständig gruene Root-CI und Apple-Signing-Vorabprüfung

- **Echte Root-CI nach Korrektur:** GitHub Actions `42713685287` ist **completed / success**. Beide Jobs `offline-regressions` und `verify` erfolgreich; `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test` und `npm run build` erfolgreich. Vitest: **36/36 Testdateien und 263/263 Tests bestanden**. Build: Vite erfolgreich in 5,18 s. Nachweis: https://github.com/Redurbabat/Red-Fit/actions/runs/42713685287 .
- Der letzte Blocker war die unvollständige `Blob`-Implementierung der Testumgebung für sechs sensible Foto-Backup-Tests. **Test-only** verwendet `src/services/backup/photoBackupService.test.ts` während dieser Suite `node:buffer`-`Blob` und stellt den ursprünglichen globalen Wert danach wieder her; produktiver Foto-/Backup-/Privacy-Code unverändert. Erfolgreicher Head `cb12e7439dca0041e0901fe6ea403015e9205ec4`.
- **Unsignierte IPA bereits bestätigt:** iOS-Run `42711457712` Erfolg, Artifact `13716626340` mit `RED-Fit-UNSIGNED.ipa`; das Artifact umfasst drei Dateien und ist nicht selbst eine signierte IPA. Simulator und Device sind **kompiliert**, nicht auf einem iPhone ausgeführt. Der neue iOS-Run auf der neuesten CI-Änderung ist keine Voraussetzung für den bereits belegten Build.

### Konkrete Identitäten und Berechtigungen vor der Installation

| Ursprüngliches natives Ziel | Aktuelle Bundle-ID (noch Upstream) | Sonderfall |
| --- | --- | --- |
| iPhone App | `ch.opengym.app` | HealthKit, NFC, App Groups, Background Assets, Universal Links `opengym.ch` |
| Home-/Lockscreen-Widgets und Live Activity | `ch.opengym.app.widgets` | App Group |
| Apple Watch App | `ch.opengym.app.watchkitapp` | HealthKit, App Group, Companion Bundle-ID |
| Apple Watch Widgets | `ch.opengym.app.watchkitapp.widgets` | App Group |
| Background Asset Downloader | `ch.opengym.app.AnimationPacksDownloader` | App Group, ExtensionKit |

Die gemeinsame App Group ist aktuell `group.ch.opengym.app`. Diese fünf IDs sind in den originalen Ruby-Integrationsskripten (`ios/ci/add-watch-app.rb`, `add-widgets.rb`, `add-asset-downloader.rb`) und der vorhandenen Xcode-Konfiguration festgelegt. Das originale Release-Skript `scripts/ios/finish-ipa.sh` prüft ebenfalls explizit diese IDs. **Es genügt deshalb nicht, nur die Capacitor-`appId` umzubenennen.** Für RED Fit unter eigener Apple-Identität müssen alle Ziele, Entitlements, Companion- und App-Group-Referenzen sowie die Signing- und Release-Checks zusammen migriert werden. Eine Veränderung der App ID kann vorhandene lokale Daten und Keychain-/App-Group-Zugriffe beeinflussen; vorher Migrationsentscheidung und Geräte-Backup erforderlich.

**Lizenzen:** `vendor/opengym-upstream/NOTICE.md` unterscheidet ausdrücklich den AGPL-Code von der separat lizenzierten Gym-visual-Übungsmediathek. Ein nichtkommerzieller Fork darf die unmodifizierten 180-px-Medien mit Notice behalten; eine eigenständige kommerzielle Verwertung oder weitere Weitergabe kann eine eigene Lizenz von Gym visual erfordern. Vor einer Veröffentlichung von RED Fit als separater App muss die Medienlizenz geklärt werden.

**Offen und freigabepflichtig:** eigene Bundle-ID und App-Group-Namenskonvention (z. B. `com.redurbabat.redfit` / `group.com.redurbabat.redfit`) sowie Signierweg (Entwicklerteam mit passenden Provisioning Profiles oder eingeschränkte private Installation). Ohne Signatur ist das jetzt gebaute IPA nicht direkt installierbar. Apple-ID-Passwörter und Zertifikat-Privatschlüssel gehören nicht in Chat, Dokumentation oder Git.


## 2026-11-10 – Exakte IPA-Nachprüfung nach vollständigem erfolgreichen GitHub-Build

- **Echter macOS-Xcode-Lauf:** GitHub Actions `42718097186`, Commit `791495ce94dd1270b09eb0557bc45125e80dbcf1` – **completed/success**. Alle iOS-Schritte bestanden: originaler Mobile-/CocoaPods-/Branding-Build, Asset-/Identity-Tests, native Glass-Dock-Tests, Xcode-Simulator- und iOS-Geräte-Build, anschliessende echte `verify-unsigned-ipa.py`-Paketprüfung und Artifact-Upload. Begleitende Root-CI `42718096994`: **completed/success**.
- **GitHub-Artifact:** `13718993845`, privates ZIP mit `unsigned/RED-Fit-UNSIGNED.ipa`, `simulator.log`, `device.log`, ZIP-Gesamtgrösse `215792159` Bytes. Quelle: https://github.com/Redurbabat/Red-Fit/actions/runs/42718097186/artifacts/13718993845 .
- **Direkte Prüfung des heruntergeladenen realen IPAs:** `217875794` Bytes; SHA-256 `95e46cb065a0d9bae5e01d593732f5aa42c002351979656a750dd7ba4cff963c`; `13668` ZIP-Einträge; **0 doppelte Einträge, CRC-Prüfung aller ZIP-Einträge erfolgreich**. Originales ausführbares Programm `Payload/App.app/App`, `Assets.car`, Web `public/index.html` und 149 `public/assets/*.js`-Einträge vorhanden.
- **Exakte fünf eingebettete Apple-Ziele per realer `Info.plist`-Inspektion:** iPhone `ch.opengym.app` (Anzeigename `RED Fit`); Watch `ch.opengym.app.watchkitapp` (`RED Fit`, Companion-ID `ch.opengym.app`); iPhone-Widgets `ch.opengym.app.widgets` (`RED Fit`); Watch-Widgets `ch.opengym.app.watchkitapp.widgets` (`RED Fit`); Background-Assets `ch.opengym.app.AnimationPacksDownloader` (`RED Fit animations`). Branding-Lücke der früheren IPA ist somit **im neuen Paket behoben**, nicht bloss auf Quellcode-Ebene.
- **Grenze der Abnahme:** Es handelt sich um eine **unsignierte Debug-Geräte-IPA**, nicht um ein signiertes, provisioniertes und auf dem iPhone installiertes Build. Native Features (Health, Watch, Widgets, Offline-Satzspeichern, Sperre/Resume) wurden **nicht auf echtem Gerät** geprüft. Eigene Apple-Signing-Identität, nötige App-Group-/Extension-Profile und tatsächliche Gerätesignierung/-installation bleiben offen. Keine Profile, Apple-ID-Zugangsdaten oder Secret Keys im Repository speichern.
- **PR-Zustand:** Bestehende PR #13 bleibt Draft/unmerged, keine Änderung an `main`.


## 2026-11-10 – Fünf-Target-Signing-Vorabprüfung erweitert

**Ausgangslage:** Der tatsächliche GitHub-Actions-iOS-Run 42718097186 hatte die originale iPhone-App und vier eingebettete Ziele bereits erfolgreich als **unsignierte** IPA gebaut und das Paket kontrolliert. Offen ist die Installation unter einer eigenen, autorisierten Apple-Signing-Identität. Eine Änderung ausschliesslich der Haupt-App-ID würde die separaten Extensions brechen.

**Konkret auf diesem Agent-Branch geändert:**
- `vendor/opengym-upstream/frontend/scripts/verify-ios-identity.mjs` kontrolliert jetzt zusätzlich zu Haupt-App/Watch/iPhone-Widgets **alle fünf Anzeigenamen**, die in drei Original-Ruby-Integrationsskripten definierten Ziel-Bundle-IDs, die vom Watch-Target abgeleitete Watch-Widget-ID, die App-Group-Entitlements der Watch-Widgets und des Background-Asset-Downloaders sowie dessen `BAAppGroupID`. Die bestehenden HealthKit-/Workout-/Widget-Swift-Plugins und Xcode-Konfiguration wurden nicht verändert.
- `vendor/opengym-upstream/frontend/scripts/verify-ios-identity.test.mjs` erweitert die realistische temporäre Fixture um beide zusätzlichen Ziele und die drei Ruby-Skripte; **vier neue Regressionstests** für inkonsistente IDs, Gruppen und Anzeigenamen (11 Tests insgesamt).

**Prüfstatus:** Neue Dateien unmittelbar von GitHub zurückgelesen und auf die neuen Validierungsstellen kontrolliert. Beim letzten Abruf liefen die neuen GitHub-Workflows `42724559732` (original iPhone) und `42724559568` (Root CI) noch; **ihr Testergebnis wird ausdrücklich nicht vorweggenommen**. Ohne erfolgreichen aktuellen CI-Nachweis sind die vier neuen Tests nur implementiert. Keine signierte IPA oder Echtgerätabnahme.

**Sicherheit:** Die GitHub-Repositories-API meldete zum Prüfzeitpunkt für `Redurbabat/Red-Fit` **`visibility: public`**, obwohl die Projektdokumente ein privates Repository voraussetzen. Das ist ein Zugriffs-/Lizenzrisiko, insbesondere mit separat lizenzierten Übungsmedien. Repo-Sichtbarkeit und Medienrechte vor jeder weiteren Verteilung mit dem Besitzer klären; keine Veröffentlichung wurde ausgelöst.

**Weiter offen:** eigene Haupt-/Widget-/Watch-/Watch-Widget-/Downloader-IDs, App Group, Entitlements und dazu passende Apple-Provisioning-Profile festlegen, Migration/Backups planen, Codesigning, private Installation und reale iPhone-Offline-/Workout-/Sperrtests. Branch liegt gegenüber `main` zurück; keine fremden Änderungen per Force-Push überschreiben.


### 2026-11-10 – Artefakt-Upload bei öffentlichem Repository gesperrt

Da die GitHub-API das Repository als `public` meldet und das Original-iPhone-IPA separat lizenzierte Übungsmedien enthält, wurde in `.github/workflows/red-fit-iphone.yml` ausschliesslich der `upload-artifact`-Step mit `if: always() && github.event.repository.private` geschützt. **Xcode-/Unit-Builds bleiben unverändert; eine IPA wird aus dieser Pipeline bei öffentlichem Repo aber nicht mehr als herunterladbares Actions-Artefakt ausgegeben.** Das ist kein Ersatz für eine tatsächliche private GitHub-Repository-Einstellung, löscht keine älteren Artefakte und gewährt keine Medienlizenz. Vor neuem privaten Download Repository-Sichtbarkeit verifizieren.

CI-Nachtrag: Für den vorherigen Commit `36fd08837fc86d83973ef0496c9a6bdb13931bfd` meldete die allgemeine CI `42724559568` `completed/success`; die iPhone-Vorabstufen einschliesslich `Test RED Fit native identity and entitlement guard` waren im Job `129526736912` bereits erfolgreich. Der iPhone-Run `42724559732` wurde anschliessend durch neueren Branch-Run **cancelled**, daher **kein** neuer Gesamt-Xcode-/IPA-Erfolgsnachweis. Nach Schutzänderung gestartet: iOS-Run `42724847324` (`pending` beim Abruf), Root-CI `42724847428` (`in_progress`). Die **ältere** erfolgreich gebaute unsigned IPA aus Run `42718097186` bleibt der letzte vollumfänglich nachgewiesene Paket-Build.


## 10.11.2026 – Nutzer bestaetigt IPA auf iPhone; Apple-System-Dock statt handgezeichneter Glas-Kapsel

**Nutzerangabe:** Eine RED-Fit-IPA ist bereits auf seinem iPhone installiert. Das ist eine Nutzerbestaetigung, **kein in GitHub oder per XCUITest nachvollzogener Geraetetest** und betrifft nicht automatisch die hier neu eingebauten Dock-Aenderungen. Die vorherige Aussage, eine Installation sei grundsaetzlich nicht erfolgt, ist daher als historischer Entwicklungsstand zu lesen. Signingmethode und tatsaechliche installierte Revision sind noch nicht belegt.

**Referenzen gelesen:** `Redurbabat/RED-Morph` – `skills/red-morph/SKILL.md`, `STYLE_CONTRACT.md`, `docs/native-swiftui/UX_RULES.md`, `MOTION.md`; `Redurbabat/RED-Bit` – `RootView.swift`, `docs/apple-native-ui-adoption.md`, `docs/DESIGN_SYSTEM.md`, `bbt-liquid-motion`, `bbt-ios-testing`, `bbt-apple-xcode`, `bbt-release` plus lokal bereitgestellte SwiftUI-Komponenten-/UX-/Motion-Skills. Apple bestaetigt `UITabBar` als eigenstaendig nutzbares **systemeigenes** Steuerelement; bei `UITabBarController` ist iOS-26-Liquid-Glass offiziell vorgesehen. Die **exakte visuelle Uebereinstimmung eines standalone `UITabBar` mit einer kompletten System-`TabView`** ist ohne realen iPhone-Screenshot/UITest noch nicht belegt.

### Keep / Rework / Archive

| Knoten | Entscheidung | Grund |
| --- | --- | --- |
| Original `MainViewController: CAPBridgeViewController` mit nur einem `WKWebView` | KEEP | Training, Daten, Plugin-Lifecycle und Offline-Session beibehalten |
| Original `src/components/TabBar.jsx` als Routing-/Start-Logik | KEEP | Ein einziger React Router; keine zweite Datenhaltung |
| Von Agent 04 handgebauter `REDFitGlassDock` auf SwiftUI-`Capsule.glassEffect` | REWORK | Wunsch: **echtes Apple-iPhone-Systemdock**, keine manuell gezeichnete Kopie |
| `UITabBar` auf iOS 26+ mit nativen `UITabBarItem` + SF Symbols | KEEP als neue Implementierung, Geraeteabnahme offen | Apple UIKit selbst zeichnet die Leiste und verwaltet Auswahl / Accessibility |
| Root-RED-Fit-PWA / andere Agent-Branches | UNCHANGED | Nicht neues Produkt oder parallele Navigation bauen |

### Aenderungen auf Branch `agent/redfit-04-ios-android`

1. `vendor/opengym-upstream/frontend/ios/App/App/MainViewController.swift`: `REDFitGlassDock` und `UIHostingController` entfernt. Stattdessen ein **echtes `UITabBar`-System-Control** mit originalen fuenf Bereichen Home/Plan/Start/Stats/Exercises; System-SF-Symbole und die echte iOS-Bar-Darstellung. Bestehende native Plugins/Bridge/Workout-Session nicht veraendert. Bei iOS <26 / iPad / Android / Browser gilt unveraendert die originale HTML-Leiste.
2. `vendor/opengym-upstream/frontend/src/components/TabBar.jsx`: Die native Leiste benutzt weiterhin den originalen Router und die Start-/Resume-Funktion. Der aktuelle Workout-Screen waehlt jetzt korrekt den nativen **Start**-Tab statt faelschlich Exercises. Vorhandene `t(...)`-Uebersetzungen fuer Tabs und originaler Sync-Warnzustand gehen an UIKit (native Badge statt selbst gezeichneter Punkt).
3. `vendor/opengym-upstream/frontend/src/components/TabBar.native-dock.test.jsx`: Regression gegen Routing und lokalisierten native-dock-Status ergaenzt.
4. `vendor/opengym-upstream/frontend/scripts/verify-native-tabbar.test.mjs`: vier neue **strukturelle** Node-Checks (echte Apple-`UITabBar` statt nachgebautes Glas, fuenf native Tabs, unveraenderte Swift-Plugins, Modal-/Tastatur-Ausblendung). GitHub-iOS-Workflow und Codemagic fuehren sie vor dem Build aus.

**Testgrenzen:** Node-Source-Guards und originale Web-Routing-Tests sind keine iOS-Screenshot- oder SwiftUI-Animationsbeweise. Apple-Originalkontrolle heisst hier UIKit-`UITabBar`, **nicht** eine 1:1-Portierung von RED-Bits Musik-`TabView` mit Player-`tabViewBottomAccessory`: ein solches fremdes Musik-Navigationssystem wuerde eine zweite Runtime oder einen instabilen WKWebView-Umbau erzwingen. `UITabBarController`-spezifisches automatisches Scroll-Minimizing ist daher **nicht implementiert**. Beim Test am iPhone visuelle Form, Touch/VoiceOver, Dark/Light, Keyboard, Sheet und Workout-Sperre pruefen.

**Ausstehend:** aktuelle iOS-Actions-/Root-CI fuer diesen Commit vollstaendig fertig pruefen, neu gebautes IPA sicher zum bereits installierten Build zuordnen und auf dem echten iPhone verifizieren. Bei `public`-Repository kein neues lizenziertes IPA-Artefakt hochladen; Repo-Sichtbarkeit pruefen. PR #13 bleibt Draft / kein Merge.
