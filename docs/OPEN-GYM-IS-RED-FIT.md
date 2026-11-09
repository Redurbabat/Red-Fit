# Eigentümerentscheidung: Original-openGym ist RED Fit — iPhone zuerst

**Gültig ab 2026-11-09; Vorrang vor älteren RED-Fit-Integrationsplänen.**

## Was tatsächlich gebaut wird

- RED Fit ist eine **direkte Fortentwicklung und Umbenennung der originalen openGym-App**, kein neues Produkt auf Basis der bisher unter `src/` aufgebauten RED-Fit-PWA.
- Das vollständige originale openGym-Projekt liegt byteidentisch in **`vendor/opengym-upstream/`** (21'977/21'977 Git-Blobs geprüft). Dieses Verzeichnis ist die **aktive neue Entwicklungsbasis**; insbesondere `vendor/opengym-upstream/frontend/`, `api/`, `catalogue/`, `scripts/`, `frontend/ios/`, `frontend/android/`. Der Ordnername `vendor` ist historisch, kein Signal, den Originalcode nur als Bibliothek zu behandeln.
- Zuerst **Original-openGym auf dem iPhone unter dem Namen RED Fit lauffähig und installierbar machen** (Capacitor/iOS/Xcode/Codemagic, eigener App-Identifier nach Prüfung, Icons, Splash, Build, Offline-Start, Training und Datenhaltung). Originalen iOS-Quellbaum **weiterverwenden**, nicht neue leere Capacitor-Shell anlegen.
- Die bisherige eigenständige PWA im Repo-Root (`src/`, Root-`package.json`, `src-tauri/`) ist **Legacy/Referenz für spätere Übernahme der Ernährung und ggf. Windows-Adaption**. Sie ist **nicht** das finale Produkt und darf keinen neuen parallelen Laufzeit-Core erzwingen.
- RED Morph (`Redurbabat/RED-Morph`) ist die **Design-/Motion-Referenz** für die **bestehenden openGym-Ansichten**, nicht Grundlage eines separaten UI-Neubaus. RED-Bit nur als iPhone-Qualitäts-/Build-Skill-Referenz.
- Nach dem iPhone-Mindestprodukt: openGym-Training stabilisieren, Ernährungsfunktionen aus Legacy RED Fit/Dietry selektiv **in openGym** einbauen, danach Android und Windows aus derselben Fachlogik ableiten.
- **Privates Projekt:** keine App-Store-Veröffentlichung, kein öffentlicher Cloudflare-/GitHub-Pages-Deploy ohne ausdrückliche Freigabe. Private Nutzung hebt etwaige Rechte Dritter für Gym-visual-Übungsmedien nicht automatisch auf; Original-`LICENSE` und `NOTICE.md` bewahren.

## Bereits vorhandene Original-App (nicht erneut erzeugen)

- `vendor/opengym-upstream/frontend/package.json`: React 19, Vite 8, Capacitor 8, `build:mobile`.
- `vendor/opengym-upstream/frontend/capacitor.config.json`: **noch** `appName: "openGym"`, `appId: "ch.duartesantos.opengym"`; Identität kontrolliert auf RED Fit umstellen, ohne Apple-Signing oder Bundle-ID zu erfinden.
- `vendor/opengym-upstream/frontend/ios/App/App.xcodeproj/`: bereits umfangreiches originales Xcode-Projekt inkl. nativer Workout-/Health-/Widget-/Live-Activity-Integration. Kein Blanko-Projekt darüber generieren.
- Original-Backend `vendor/opengym-upstream/api/` existiert. Offline-Modus und eventuelle optionale Auth/Sync-Abhängigkeiten anhand **echter** Codepfade prüfen, nicht annehmen, dass ein statischer Worker den Node-Server ersetzt.

## Arbeitsmodus der fünf Agenten

**Ein GitHub-Repository:** `Redurbabat/Red-Fit`. **Jeder Agent nur sein vorhandener Branch**, eine einzige PR gegen `main`, keine Selbst-Merges; Commits direkt auf eigenen Branch sind erlaubt. Beginnen mit `AGENTS.md`, dieser Entscheidung, `CLAUDE.md`, `ARCHITEKTUR.md`, Obsidian-Handoff, Original-App-Code, relevanten RED-Morph-/Apple-Skills. Vor Arbeiten Branch von aktuellem `main` abgleichen. Bestehende Nutzer- und Trainingsdaten nicht löschen.

1. **iPhone zuerst – Agent 04**: `agent/redfit-04-ios-android`. Original-Capacitor-/iOS-App, RED-Fit-Branding, Codemagic, verifizierbarer IPA-Build; **iOS hat Vorrang vor Android**. Besitz an `frontend/ios/**`, `frontend/capacitor.config.json`, iOS-spezifischen Buildskripten und Signing-Doku.
2. **UI / RED Morph – Agent 02**: `agent/redfit-02-red-morph-ui`. Bestehendes openGym-React-UI und Styles gezielt verbessern, keine neue App; nicht in iOS-Xcode-/Capacitor-Konfiguration schreiben.
3. **Training – Agent 01**: `agent/redfit-01-opengym-training`. **Vorhandene** openGym-Trainingsfunktionen prüfen/verbessern statt aus Legacy PWA ein zweites Workout-System portieren; vor allem `frontend/src/lib/`, Tests, trainingsspezifische Screens.
4. **Ernährung – Agent 03**: `agent/redfit-03-nutrition`. Ernährung der Legacy RED-Fit-PWA/Dietry als Referenz nehmen, **in Original-openGym integrieren**; keine neue parallele App, keine Root-PWA als Produktionsziel.
5. **Windows / QA – Agent 05**: `agent/redfit-05-windows-quality`. Packaging/Audit auf Original-openGym-Basis, Android sekundär nach iPhone, CI/Tests; Root-Tauri nur als Referenz, keine konkurrierende Windows-App gegen die openGym-Laufzeit.

## Minimale Abnahmekriterien iPhone

1. Original-openGym-Frontend ist unter RED Fit gebaut (kein leeres Starterprojekt, keine zweite Produkt-Runtime).
2. Sichtbarer Name, Icons, Bundle-ID/Signing-Pfade sind konsistent; bestehende Original-Entitlements und native Features nicht versehentlich entfernen.
3. Workout starten, Satz speichern, Pause, App sperren/öffnen, Fortsetzen und Verlauf funktionieren; Offline-Start verifiziert.
4. iPhone-Test auf echtem Gerät oder Simulator, Build-Logs, IPA/Signierung nachweisen. Ohne macOS/Xcode/Codemagic-Zugang Build nur als **vorbereitet** markieren.
5. Keine unerlaubte Veröffentlichung, keine Geheimnisse im Git; nur getestete Branch-PRs freigeben.

**Alle älteren Aussagen „openGym nur als Vendor/Referenz“, „erst neue RED-Fit-PWA bauen“ oder „volle 21'977 Dateien fehlen noch“ sind überholt.** Lies den tatsächlichen aktuellen Code. Nicht blind an älteren technischen Regeln der Legacy-PWA festhalten.
