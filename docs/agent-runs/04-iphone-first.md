# Agent 04 — iPhone zuerst: Original-openGym → RED Fit

**Datum:** 09.11.2026 · **Branch:** `agent/redfit-04-ios-android` · **PR:** #13 (bestehende PR; keine zweite PR und kein Selbst-Merge)

## Verbindliche Basis

Die bestehende Original-App unter `vendor/opengym-upstream/frontend/` ist die RED-Fit-Produktbasis. Ihre native iOS-App unter `frontend/ios/App/` wird **weiterentwickelt**, nicht mit `cap add ios` neu erstellt. Das Root-`src/` ist kein neues iPhone-Frontend. Bestehende HealthKit-, Workout-, Widget-, Watch-, Live-Activity- und Offline-Routen bleiben unverändert.

## Tatsächlich geändert

- Original-`frontend/capacitor.config.json`: `appName: RED Fit`. Der zuvor abweichende `appId: ch.duartesantos.opengym` wurde an das **bereits bestehende Xcode-Haupttarget** `PRODUCT_BUNDLE_IDENTIFIER = ch.opengym.app` angepasst. **Keine vollständige Bundle-ID-/App-Group-Migration behauptet.**
- Bestehende `App/Info.plist`, `OpenGymWidgets/Info.plist`, `Watch/Info.plist`: sichtbarer Appname `RED Fit`. Deutsche Watch-Health-Beschreibungen angepasst. Native App-Gruppen, Companion-ID und benötigte URL-Schemes wurden **nicht** verändert, um Deep-Links und Datenpfade nicht stillschweigend zu brechen.
- `frontend/ios/ci/brand-red-fit.swift`: macOS-Generator für das **Standard-iPhone-Icon** und die sechs Launch-Splash-Varianten aus dem bereits im privaten Repository vorhandenen RED-Fit-Icon `public/icons/icon-512.png`. Er verwendet AppKit und erzeugt opake RGB-PNGs. Er ist ein **Build-Schritt**; die Original-PNGs bleiben vor der Ausführung im Git unverändert. Alternative Original-Icons sind noch nicht umbenannt.
- `frontend/scripts/verify-ios-identity.mjs`: statische Source-Guard-Checks für Name, Bundle-ID-Abgleich, alle drei App-Group-Entitlements, Watch-Companion-ID und Existenz wichtiger iOS-Plugins.
- Original-`frontend/package.json`: `npm run ios:brand`, `npm run test:ios-identity`, `npm run build:ios`; das bestehende `build:mobile` bleibt erhalten und wird weiterverwendet. Keine Dependency-Änderung, daher keine `package-lock.json`-Änderung.
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
