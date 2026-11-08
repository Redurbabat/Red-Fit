---
tags: [red-fit, sources, archives]
updated: 2026-11-08
---
# Quellprojekte / geprüfte ZIP-Archive

Die Uploads liegen in der aktuellen Chat-Laufzeit, **nicht** automatisch in GitHub oder künftigen Chats. Für dauerhafte Übersicht existiert `docs/SOURCE-ARCHIVE-STATUS.md`. Wiederholte ZIP-Bereitstellung kann nötig sein, wenn Originaldateien erneut analysiert werden sollen.

| Quelle | Technik und Rolle | ZIP SHA-256 | Umfang |
|---|---|---|---|
| `openGym-main(1).zip` | React/Vite, Node-API, Capacitor, Training und mobile Ideen | `7e05a9d05b7401f5b3f1b5a08d1ca63d6f0d55870eccdc2ae3a4c4c79c94ab09` | 222,808,011 Bytes; 22,387 ZIP-Einträge |
| `wger-master(1).zip` | Django/DRF, Trainings- und Ernährungstaxonomie | `774806d37af477646fc2205c8e687337281c32e279a02ee3b654ebdd1b6717ac` | 9,467,264 Bytes; 1,564 ZIP-Einträge |
| `dietry-main(1).zip` | Flutter/Dart, Ernährung, BMR/TDEE, Aktivität/Körperdaten | `047b1c3ce2de972f5e24ed91be8fd340a54ac63e01cf8d986989da32fcba516b` | 3,973,229 Bytes; 473 ZIP-Einträge |

**Herkunft im Archiv:** `openGym-main/NOTICE.md` nennt Duarte Santos als Urheber und Gym visual als gesonderten Medienrechteinhaber; der Nutzer bezeichnet openGym als seine zweite App. Diese Aussage wird dokumentiert, ersetzt aber keinen Rechtenachweis am Drittmaterial. `dietry-main/LICENSE` nennt tcriess (MIT); `wger-master/package.json` und dessen Lizenzdatei nennen AGPL-3.0. Genaueres: [[06-LIZENZEN-UND-RECHTE]].

## Funktionaler Transfer
- **openGym → RED Fit:** Workout-Abläufe, Ramp-Warmup, Supersets, Progression, Timer, mobile Offline-Konzepte. Nur sauber integrierte neue RED-Fit-Module übernehmen.
- **wger → RED Fit:** Übungsbibliothek, Muskel-/Gerätezuordnung, Attribute und Katalogimporte. Quelle/Autoren am Datensatz behalten. Bereits 789 attributierte Offline-Katalogeinträge vorhanden.
- **Dietry → RED Fit:** BMR/TDEE, Makros und Mahlzeiten; bestehendes 100-g-Modell, Schnappschüsse und sichere Migrationen erhalten.

## Quellenarchiv-Regel
`docs/SOURCE-ARCHIVE-STATUS.md` dokumentiert eine separate, gefilterte lokale Quellen-ZIP; das ist **kein** automatisch im Repository vorhandener Quellbaum. Kein automatischer Komplettimport von Original-ZIPs. Vor jedem größeren Import: Lizenzprüfung, Secret-Scan, Ausschluss von `openGym-main/catalogue/media/`, Größen-/Git-History-Prüfung und explizite Integrationstests.
