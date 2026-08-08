# REPORT-STORAGE.md — Local-first, IndexedDB, Backup

Untersucht: Liftosaur (IndexedDB), Flexify (Drift/SQLite), BABAT-RED (localStorage +
Backup-Envelope), Calories-In (Datei), Waistline, OpenNutriTracker (Hive).

## 1. Persistenz-Technologie — Entscheidung

**Dexie über IndexedDB** (vom Nutzer bestätigt). Begründung gegen die Alternativen:
- Liftosaurs handgerollter Key-Value-Wrapper funktioniert, kostet aber viel eigenen Code
  (Transaktions-Handling, Fehlerpfade) — Dexie liefert genau das fertig.
- `idb` allein wäre bei 14 Stores mit Indizes deutlich mehr Boilerplate.
- localStorage-Monolith (BABAT-RED `meinOrganizer_v4`) skaliert nicht: ein Key,
  Vollserialisierung bei jedem Write, 5-MB-Limit.

Lehren aus Liftosaur trotzdem übernehmen:
- Writes, deren Erfolg weitere Logik steuert, müssen die Transaktion abwarten
  (Liftosaurs `setMany` rejected bewusst bei Quota-Abort).
- Safari-Eigenheit: IndexedDB erst nach erstem Touch initialisieren
  (`initializeForSafari`-Muster) — mit Dexie meist unnötig, aber als bekannter Fallstrick notiert.

## 2. Schema & Migrationen — Entscheidung

- Ein Store pro Entität (14 Stores, Master-Prompt §29) mit Indizes auf `date`, `status`,
  `barcode`, `name`, `category`, `mealType`, `planId`.
- Dexie-`version(n).stores({...}).upgrade()` als Migrationspfad; **niemals Stores droppen**.
- BABAT-RED `migrations.ts` zeigt das Prinzip versionierter, additiver Migration —
  Konzept übernehmen, Implementierung ist bei Dexie eingebaut.

## 3. Backup-Format — Entscheidung

**BABAT-RED `backupEnvelope.ts` ist die Vorlage** (eigenes Projekt, direkt nutzbar):
- Envelope: `format` (Literal `"red-fit-backup"`), `schemaVersion`, `appVersion`,
  `exportedAt`, `data` — deckungsgleich mit Master-Prompt §76.
- **Prototype-Pollution-Schutz**: BABAT-REDs `pruefeJsonBaum` weist `__proto__`/
  `constructor`-Schlüssel im Import ab — übernehmen (Zod allein schützt davor nicht
  in jedem Merge-Pfad).
- Import-Pipeline: lesen → Zod-validieren → Vorschau (Zählwerte) → Merge-Strategie →
  importieren → Bericht. Kein ungefragtes Löschen (§78/79).
- Datei-Handling (Blob-Download, Import-Fehler-UX): Muster wie in Calories-In
  `persistence/`, für RED Fit eigenständig neu geschrieben.

## 4. Aktives Workout persistieren

Siehe REPORT-WORKOUT §2: aktives Workout ist ein normaler `workoutLogs`-Datensatz mit
`status: "active"` — kein Sonder-Store nötig. Autosave bei jeder Änderung; Dexie-`put`
ist dafür schnell genug (ein Objekt, kein Vollstate).

## Entscheidungsmatrix

| Anforderung | Quelle des Musters | RED-Fit-Umsetzung |
|---|---|---|
| DB-Zugriff | Dexie | `services/storage/database.ts` + Repositories |
| Reload-sicheres Workout | Liftosaur | `status:"active"`-Datensatz + Autosave |
| Migrationen | Dexie + BABAT-RED-Prinzip | additiv, versioniert, nie löschend |
| Backup-Envelope | BABAT-RED (eigener Code) | `RedFitBackup` + Zod + `__proto__`-Schutz |
| Datei-Export/Import | Calories-In (nur Muster) | Blob-URL, Import-Fehler-UX — neu geschrieben |
