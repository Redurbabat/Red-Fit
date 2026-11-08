# RED Fit – Workout-Revisionen beim Backup-Import

**Stand: 2026-11-08** · Feature-Branch
`feat/unified-iphone-windows-integration`

## Gefundene Datenintegritätslücke

RED Fit schützt aktive Workouts und nachträglich bearbeitete Notizen mit
`WorkoutLog.saveRevision`. Ein Tab kann einen vollständigen Workout-Snapshot
nur dann speichern, wenn seine erwartete Revision mit dem aktuellen
IndexedDB-Datensatz übereinstimmt. Nach jedem erfolgreichen Speichern wird
die Revision erhöht.

Der bisherige Standard-Backup-Import hatte zwei davon **unabhängige**
Schreibwege: `replaceWithBackup` ersetzte einen lokalen Workout-Log per
`put()` einschließlich einer womöglich **älteren Revisionsnummer**.
Außerdem änderte die automatische Bereinigung mehrerer aktiver Workouts
den Status überschüssiger Logs auf `cancelled`, ohne ihre Revision
anzuheben. Ein weiterhin geöffnetes Trainingsfenster konnte dadurch einen
versehentlich passenden, aber inzwischen veralteten Versionswert
verwenden.

## Implementierung

`src/services/backup/workoutImportRevision.ts` stellt die reine
Funktion `nextImportedWorkoutRevision(local, imported?)` bereit:

```
newRevision = max(localRevision ?? 0, importedRevision ?? 0) + 1
```

- **Neuer Workout-ID-Import:** Der Datensatz wird neu angelegt und behält
  exakt die importierte Revision. Es gibt keinen bestehenden lokalen
  Schreibstand, gegen den eine Revision zu erhöhen wäre.
- **Vorhandene ID, Strategie „Bestehende behalten“:** Lokal gespeicherter
  Datensatz und Revision bleiben unverändert.
- **Vorhandene ID, Strategie „Backup bevorzugen“:** Die Inhalte des Backups
  werden übernommen. Die höhere der beiden Revisionen wird um eins
  erhöht, sodass vorher geöffnete Workout-Ansichten keine neuen
  Änderungen unbemerkt über den Restore schreiben können.
- **Bereinigung mehrfach aktiver Workouts:** Ein automatisch auf
  `cancelled` gesetztes importiertes bzw. altes Workout erhält ebenfalls
  eine höhere Revision. Ein vorhandenes, bevorzugtes aktives Workout
  behält dagegen seine ursprüngliche Revision und Satzdaten.
- **Ältere Workouts/Backups:** Fehlendes `saveRevision` bedeutet
  Revision 0; diese Backups bleiben lesbar. Es gibt keine globale
  Datenmigration oder Formatversionsänderung.
- **Fehlerhafte/erschöpfte Revision:** Negative, nicht ganzzahlige,
  unendliche oder überlaufende Werte werden verworfen. Bei einer
  unmöglichen Erhöhung (`Number.MAX_SAFE_INTEGER`) bricht die
  *gesamte* Dexie-Importtransaktion ab; davor eingefügte Datensätze
  müssen zurückgerollt werden.

Die Anpassung erfolgt ausschließlich in den vorhandenen
`importBackup()`- und `normalizeActiveWorkouts()`-Transaktionspfaden;
`saveWorkout()` und seine Revisionskonfliktbehandlung bleiben erhalten.

**Wichtig:** „Backup bevorzugen“ ersetzt die lokale Workout-Version
bewusst. Das ist keine automatische Zusammenführung konkurrierender
Sätze. Ein Fenster mit einem älteren Stand erhält bei seinem nächsten
Speicherversuch einen Konflikt und muss die wiederhergestellten Daten
neu laden.

## Prüfstatus

```bash
# Keine npm-Installation erforderlich, Node.js 22+
npm run test:backup-workout-revision

# Echte IndexedDB-/Dexie-Prüfung sobald Abhängigkeiten verfügbar sind
npm run test -- src/services/backup/backupWorkoutRevision.test.ts
npm run test -- src/services/backup/backupService.test.ts
```

**Tatsächlich lokal ausgeführt am 2026-11-08:**
9/9 Node-Regressionsprüfungen der Revisionslogik bestanden, einschließlich
alter Backups, lokal höherer/importiert höherer Revision, identischer
Revision, abgesicherter Versionskonflikte, ungültiger Werte und
Integer-Überlauf. `tsc --strict --noEmit` für
`workoutImportRevision.ts` zusammen mit `workoutRevision.ts`
war erfolgreich. Die lokal getesteten Quellen stimmen bytegenau mit
den GitHub-Blobs überein:

- `workoutImportRevision.ts`:
  `a2cb4b4c46269a92531af9d3a800e3bfc9db743a`
- `workoutRevision.ts`:
  `ecae6c1723680ca87608b3b5fff3500695806120`

Zusätzlich eingecheckt wurden **acht noch nicht ausgeführte
Dexie-Tests** unter `src/services/backup/backupWorkoutRevision.test.ts`.
Diese prüfen vor allem die tatsächliche Ersatzstrategie,
Revisionsfortschreibung, Legacy-Kompatibilität, Bereinigung mehrfach
aktiver Trainings, Ablehnung eines veralteten Trainingsfensters und
Transaktions-Rollback bei Überlauf.

Die vorhandene Ausführungsumgebung hat weiterhin keine installierten
`dexie`-/`fake-indexeddb`-/`vitest`-Abhängigkeiten. Die reinen
Node-Prüfungen ersetzen daher **keinen** echten IndexedDB-Restore,
keinen Multi-Tab-Browsertest und keinen iPhone-/Windows-Build.
