# RED Fit – Integration der drei Quellen (Stand: 2026-11-08)

## Ziel
Eine gemeinsame React/TypeScript-Fachlogik für eine iPhone-App (Capacitor), eine Windows-App (Tauri 2) und die vorhandene PWA. Bestehende offline-first-Daten, Workout-Resume und Backup bleiben erhalten.

## Quelldateien (lokale Originalarchive)
| Archiv | SHA-256 | Umfang | Rolle |
|---|---|---|---|
| openGym-main.zip | `7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09` | 213 MB / 22 387 ZIP-Einträge | Trainings-Workflows, mobile Plattformideen |
| wger-master.zip | `774806d37af477646fc2205c8e687337281c32e279a02ee3b654ebdd1b6717ac` | 9,1 MB / 1 564 ZIP-Einträge | Übungstaxonomie, API-/Datenmodell-Referenz |
| dietry-main.zip | `047b1c3ce2de972f5e24ed91be8fd340a54ac63e01cf8d986989da32fcba516b` | 3,8 MB / 473 ZIP-Einträge | Energiebedarf, Mahlzeiten, Aktivitäten |

Die Originalarchive sind **noch nicht im GitHub-Repository**: openGym überschreitet GitHubs gewöhnliche Einzeldateigrenze und enthält gesondert lizenzierte Medien. Prüfsummen identifizieren die geprüften lokalen Originale. Quellcode soll, wo lizenzrechtlich möglich, als getrennter Quellenbaum übernommen werden; die produktive Integration erfolgt modulweise.

## Lizenz- und Sicherheitsgrenzen
- openGym: AGPL-3.0-or-later; `catalogue/media/`-Assets sind gesondert lizenziert und ausdrücklich **nicht** für unabhängige Apps freigegeben. Nicht kopieren, hotlinken oder für KI-Verarbeitung nutzen.
- wger: AGPL-3.0-or-later. Direkte Portierungen nur mit den AGPL-/Attributionspflichten; Nutzung im privaten Repository ersetzt nicht die Lizenzprüfung bei Veröffentlichung.
- Dietry: MIT; Lizenzhinweise bei jeder tatsächlichen Codeübernahme erhalten.
- RED Fit: In `CLAUDE.md` ist die direkte Fremdcodeübernahme untersagt. Daher zunächst eigene Adapter und fachliche Berechnungen; die Originalprojekte dienen als Quellenanalyse.
- Zugangsdaten, Token, Datenbank-Dumps und Nutzerinformationen niemals übernehmen.

## Integrationszuordnung
| Zielbereich | Basis | Quelleninspiration | Vorgehen |
|---|---|---|---|
| Workout und Trainingspläne | `src/features/training/`, Workout-Repositories | openGym, wger | Aufwärmsatz- und Supersatz-System implementiert; weitere Modi/Progression offen |
| Übungs-Taxonomie | `src/models/exercise.ts` und Katalog | wger | Attributionspflichtiger JSON-Import, Quellen-ID und Konverter für 789 Übungen |
| Kalorien-/Energiebedarfsberechnung | `src/services/calculations/` | Dietry | eigenständige Mifflin-St-Jeor-/TDEE-Berechnung, isoliert getestet |
| Ernährung und Mahlzeiten | `src/features/nutrition/` | Dietry, wger | 100-g-Quelle/Snapshots behalten, schätzbedingte Unsicherheit ergänzt |
| iPhone | React + Vite | openGym Capacitor-Konzept | minimale Capacitor-Shell, sichere Native Bridges |
| Windows | React + Vite | vorhandene RED-Fit-PWA | Tauri 2-Shell-Gerüst, responsive Desktop-Sidebar implementiert |
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
- [x] openGym-Aufwärmsatz-Rampenberechnung (Quellkonzept) + Workout-Vorschau und Unit-Tests als Code gepusht, CI noch offen
- [x] Dietry-inspirierte Energiebedarfsberechnung (Code + Unit-Tests gepusht, CI noch offen)
- [x] openGym-Supersatz-Planung/Rotation/Pausen und Unit-Tests als Code gepusht
- [x] Dietry-Schätzunsicherheit mit Eintragskennzeichnung und Tagesanzeige gepusht
- [x] wger-JSON-Import mit Provenance, atomarem Repository, Parser- und Repo-Tests gepusht
- [x] wger-Konverter für 789 attribuierte Übungseinträge, 83 nicht attribuierte verworfen
- [x] wger-Datenqualitätsprüfung: 120 ungeklärte Muskelgruppen markiert;
  16 unspezifische „Arme“-Übungen nicht mehr dem Bizeps zugeordnet;
  Gymnastikmatte (14 Datensätze) korrekt als Equipment klassifiziert
- [x] Breite Desktop-Navigation (Windows-freundliche UI) gepusht
- [x] Separater, nutzerinitiierter iPhone/Windows-Foto-Transfer: Daten,
  Privacy-Warnung, Vorschaudialog, transaktionaler Import und Regressionstests
- [x] SHA-256-Pflichtprüfsummen im Foto-Backup v2 gegen gleich lange
  beschädigte Bilddateien; reiner Codec mit 5/5 lokalen Node-Tests bestätigt
- [ ] Vollständige Foto-Sammlungen >25 MiB als geteiltes/verschlüsseltes
  Archiv übertragen (derzeit begrenzter optionaler JSON-Transfer)
- [ ] Weitere Funktionen der drei Quellen vollständig integriert
- [x] Native Navigation für Capacitor/Tauri auf reload-sichere Hash-Routen
  umgestellt; Web/PWA-History-Routen bleiben unverändert
- [x] PWA-Service-Worker in nativen Shells deaktiviert, Tauri/Vite
  IPv4-Dev-Host abgeglichen; 7/7 isolierte Node-Tests erfolgreich
- [ ] Capacitor-/iOS-Build auf macOS geprüft
- [x] Branded Windows/Tauri-Icons aus vorhandenem PWA-Icon automatisch
  vor Dev/Build generieren; 6/6 isolierte PNG-/ICO-Tests bestanden
- [ ] Tauri-/Windows-Build auf Windows geprüft
- [ ] Offline-, Backup- und Geräte-Regressionen abgeschlossen

## CI-Infrastrukturhinweis (2026-11-08)

Bei den abgefragten GitHub-Actions-Runs meldete der Job `failure`, aber
`runner_id=0` und `steps=[]`. Er wurde ohne zugeteilten Runner beendet.
Daraus folgt weder ein erfolgreicher noch ein fehlgeschlagener TypeScript-Build.
Die genaue Ursache (GitHub-Actions-/Kontokonfiguration, Runner-Bereitstellung
oder Abrechnung) muss direkt in den GitHub-Actions-Run-Details geklärt werden.
