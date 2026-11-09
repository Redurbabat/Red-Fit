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
