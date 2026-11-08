---
tags: [red-fit, backlog, tasks]
updated: 2026-11-08
---
# Backlog — nächste sinnvolle Arbeit

## P0 — Baseline und Datenintegrität
- [ ] `main`-Stand, Features, Tests und Abhängigkeiten auf frisch geklontem Checkout verifizieren.
- [ ] `npm ci && npm run typecheck && npm run lint && npm test && npm run build` erfolgreich ausführen; Ergebnis dokumentieren.
- [ ] Die drei Archivfunktionalitäten systematisch gegen RED Fit abgleichen; bereits existierende Funktionen nicht doppelt bauen.
- [ ] Daten-/Backup-Verlusttests: aktive Workouts, Notizen, Mahlzeiten, Foto-Export und ältere Backups.

## P1 — iPhone / Android / Windows
- [x] `@capacitor/android` in den versionierten Bootstrap-Vertrag aufnehmen; 16/16 Native-Bootstrap-Selftests am 2026-11-08 mit Node 22.16 auf bytegleich abgeglichenen `main`-Quellen bestanden (kein App-/Plattform-Build).
- [ ] Android-Capacitor-Lockfile mit Registry-Zugriff erzeugen, natives Projekt via Android Studio generieren; APK/AAB bauen und prüfen.
- [ ] iOS-Capacitor-Runtime/Lockfile installieren, `ios/` per Xcode erzeugen; iPhone-Simulator und Realgerät testen.
- [ ] Tauri Windows MSI/NSIS auf Windows bauen, signierbaren Upgrade-Pfad und IndexedDB-Persistenz prüfen.
- [ ] Datenspeicherung und Update-Lifecycle je Plattform verifizieren; keine behauptete automatische Cross-Device-Synchronisation.

## P2 — fachliche Lücken der drei Quellapps
- [ ] openGym: zusätzliche Progressionsmodi, Workout-Modi, Timer-/Workout-UX und ggf. Erinnerungen modular integrieren (keine Gym-visual-Medien). Gewicht-/Wiederholungs-PRs inklusive Eigengewicht, Null-Wiederholungen- und Abbruchschutz sind seit 2026-11-08 umgesetzt; Gesamtaufgabe bleibt offen.
- [x] Trainingsrekord-Fix: mehr Wiederholungen bei gleicher Höchstlast, Eigengewichts-PR, keine Rekorde aus abgebrochenen/aktiven Workouts, Zusammenfassungsanzeige angepasst; **historische Rekordreihenfolge korrigiert, vollständigen Node-Selbsttest 9/9 bestanden** (2026-11-08, Node 22.16, Originaldateien per Git-Blob verifiziert); Vitest/Build noch offen.
- [ ] wger: Übungstaxonomie/Attributionen, zusätzliche Bibliotheks- und Progressionsfunktionen an aktuelles RED-Fit-Datenmodell anpassen.
- [ ] Dietry: fehlende Ernährungs-/Aktivitätsfunktionen aus ZIP vergleichen, validierte Logik in RED-Fit-Services umsetzen.
- [ ] RED-Morph Designreview eines echten Screens (Today/Workout), dann gezielter Touch-Kit-Transfer nach Test.
- [x] Responsive Bottom Dock nach RED Morph/BBT-Bit (React) inkl. Scroll-Logik und isolierter Unit-Tests implementiert; Vollabnahme offen.
- [ ] Dock auf echtem iPhone/Android prüfen: Richtungswechsel, Safe Areas, Quick Log, Scrollcontainer, Tastatur, große Schrift, Reduce Motion.
- [ ] BBT-Bit-Referenzen für iOS UX/Accessibility/Release-Nachweise berücksichtigen, kein Musikcode.

## P3 — Freigabe
- [ ] Lizenz- und Herkunftsmatrix jeder tatsächlich übernommenen Datei/Datenquelle.
- [ ] iOS/Android/Windows Installer, echte Geräte-Tests, Screenshots, Datenschutz und veröffentlichbare Releasekonfiguration (falls überhaupt gewünscht).
- [ ] Hier, in [[08-STATUS-UND-TESTS]] und [[09-CHAT-HANDOFF]] jeweils neue Nachweise aktualisieren.

**Nicht stillschweigend als erledigt deklarieren:** Vollintegration, App-Store-IPA, Android-APK, Windows-Installer oder automatischer Gerätesync.
