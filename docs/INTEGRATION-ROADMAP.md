# RED Fit – Integration der drei Quellen (Stand: 2026-11-08)

## Ziel
Eine gemeinsame React/TypeScript-Fachlogik für eine iPhone-App (Capacitor), eine Windows-App (Tauri 2) und die vorhandene PWA. Bestehende offline-first-Daten, Workout-Resume und Backup bleiben erhalten.

## Quelldateien (lokale Originalarchive)
| Archiv | SHA-256 | Umfang | Rolle |
|---|---|---|---|
| openGym-main.zip | `7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09` | 213 MB / 22 387 ZIP-Einträge | Trainings-Workflows, mobile Plattformideen |
| wger-master.zip | `774806d37af477646fc2205c8e687337281c32e279a02ee3b654ebdd1b6717ac` | 9,1 MB / 1 564 ZIP-Einträge | Übungstaxonomie, API-/Datenmodell-Referenz |
| dietry-main.zip | `047b1c3ce2de972f5e24ed91be8fd340a54ac63e01cf8d986989da32fcba516b` | 3,8 MB / 473 ZIP-Einträge | Energiebedarf, Mahlzeiten, Aktivitäten |

Die Archive selbst sind **nicht im Repository**: das openGym-Archiv überschreitet die GitHub-Einzeldateigrenze, und Teile der Fremdmedien sind ausdrücklich nicht frei zur Wiederverwendung. Die Prüfsummen identifizieren die geprüften lokalen Originale. **Kein vollständiges Fork-Merging.**

## Lizenz- und Sicherheitsgrenzen
- openGym: AGPL-3.0-or-later; `catalogue/media/`-Assets sind gesondert lizenziert und ausdrücklich **nicht** für unabhängige Apps freigegeben. Nicht kopieren, hotlinken oder für KI-Verarbeitung nutzen.
- wger: AGPL-3.0-or-later. Fremden Quellcode nicht ohne gesonderte Lizenzentscheidung integrieren.
- Dietry: MIT; Lizenzhinweise bei jeder tatsächlichen Codeübernahme erhalten.
- RED Fit: In `CLAUDE.md` ist die direkte Fremdcodeübernahme untersagt. Daher zunächst eigene Adapter und fachliche Berechnungen; die Originalprojekte dienen als Quellenanalyse.
- Zugangsdaten, Token, Datenbank-Dumps und Nutzerinformationen niemals übernehmen.

## Integrationszuordnung
| Zielbereich | Basis | Quelleninspiration | Vorgehen |
|---|---|---|---|
| Workout und Trainingspläne | `src/features/training/`, Workout-Repositories | openGym, wger | bestehende Funktionen zuerst abgleichen; Lücken gezielt implementieren |
| Übungs-Taxonomie | `src/models/exercise.ts` und Katalog | wger | eigene Normalisierungsadapter, stabile IDs, Herkunft prüfen |
| Kalorien-/Energiebedarfsberechnung | `src/services/calculations/` | Dietry | eigenständige Mifflin-St-Jeor-/TDEE-Berechnung, isoliert getestet |
| Ernährung und Mahlzeiten | `src/features/nutrition/` | Dietry, wger | vorhandene Food-Items/100-g-Quelle und Meal-Snapshots behalten |
| iPhone | React + Vite | openGym Capacitor-Konzept | minimale Capacitor-Shell, sichere Native Bridges |
| Windows | React + Vite | vorhandene RED-Fit-PWA | Tauri 2-Shell, Desktop-spezifische UI später |
| Synchronisierung | lokal via Dexie | – | optional; erst nach Daten- und Konfliktmodell |

## Architekturregeln
1. Existing `main` unberührt; Entwicklung im Feature-Branch mit Review.
2. Persistierte Nutzerdaten niemals destruktiv migrieren.
3. Ein aktives Workout bleibt ein atomar gespeicherter, resumierbarer Datensatz.
4. Einheitliche Datenmodelle; Plattform-APIs hinter `src/core/platform/`.
5. Vor Release: `npm run typecheck && npm run lint && npm run test && npm run build`, anschließend echte iPhone-/Windows-Tests.
6. Kein Backend-Zwang, keine fremde App oder UI als paralleles Teilprodukt.
7. Plattformpakete erst nach Prüfung der Runtime-/Build-Kompatibilität festschreiben.

## Verwendete Skills
Die elf lokal bereitgestellten `bbt-*`/`swiftui-*`-Skill-Dateien wurden gelesen. Sie beschreiben überwiegend ein **anderes Musikplayer-Repository** und sind keine RED-Fit-Quellmodule. Relevante allgemeine Prinzipien: iOS-Builds und reale Tests separat kennzeichnen, Accessibility, Reduce Motion, 44pt-Touch-Ziele, sichere Build-Konfiguration. Vollständige aus Xcode exportierte Apple-Skills wurden **nicht** bereitgestellt; deren Installation wird nicht behauptet.

## Status
- [x] Quellenarchive identifiziert und Risiken überprüft
- [x] Vorhandene RED-Fit-Architektur gesichtet
- [ ] Portierte Features einzeln implementiert und getestet
- [ ] Capacitor-/iOS-Build auf macOS geprüft
- [ ] Tauri-/Windows-Build auf Windows geprüft
- [ ] Offline-, Backup- und Geräte-Regressionen abgeschlossen
