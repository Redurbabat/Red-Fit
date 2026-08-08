# sources/ — Eigene Portierungsbasis (Phase 0)

RED Fit ist **vollständig eigenständig**. In diesem Repo liegt ausschließlich eigener
Code — kein fremdes Projekt wird verlinkt, eingebunden oder kopiert.

## Grundsatz

- Die 20 analysierten Open-Source-Projekte bleiben unverändert in
  `github.com/Redurbabat/gym-essen` (Original-Archive, SHA256 dokumentiert).
- **Alles Gelernte** aus diesen Projekten steckt als destilliertes Wissen in
  `docs/phase0/REPORT-*.md` und `docs/phase0/audits/` — als Muster, Feldlisten,
  Algorithmus-Beschreibungen und Entscheidungen. RED-Fit-Code wird daraus **neu
  geschrieben** und gehört damit vollständig dem Projektinhaber.
- Fremdlizenzierter Code (AGPL/GPL/MIT-Quellen) wird **nicht** in dieses Repo übernommen.

## Inhalt

```text
sources/own/babat-red/    Extrakt aus dem eigenen Projekt Redurbabat/BABAT-RED
├── gym/
│   ├── uebungen.ts               Übungskatalog: deutsche Übungen mit
│   │                             Technik-Schritten, typischen Fehlern, Profi-Tipp
│   ├── trainingsplaene.ts        deutsche Plan-Vorlagen
│   ├── GymProgressionService.ts  Double-Progression (+2,5-kg-Regel)
│   ├── GymService.ts             Volumen, Bestwerte (PRs), Wochenstatistik
│   └── GymStatistikService.ts    Auswertungen
├── fitness/
│   ├── fitness.ts                komplettes Ernährungs-Domänenmodell
│   ├── FitnessMakroService.ts    Makro-Berechnungen
│   ├── FitnessMengenService.ts   Mengen-/100-g-Rechnung
│   ├── FitnessEinkaufService.ts  Einkaufsliste aus Essensplan (Aggregation)
│   └── fitnessSchemas.ts         Zod-Validierung
└── database/
    ├── backupEnvelope.ts         versioniertes Backup-Format + Import-Härtung
    ├── migrations.ts             Migrations-Muster
    └── validate.ts               Struktur-Prüfung
```

Diese Dateien sind Arbeits-Referenz für die Implementierung (Phase 1+). Sie werden beim
Portieren auf RED Fits Zielarchitektur umgebaut (Code Englisch, Dexie/IndexedDB statt
localStorage) und danach hier entfernt oder archiviert.
