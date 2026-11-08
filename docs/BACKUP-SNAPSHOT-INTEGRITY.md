# RED Fit – konsistente und wiederherstellbare Standard-Backups

**Stand:** 2026-11-08 · Integrations-Branch
`feat/unified-iphone-windows-integration`

## Gefundene Probleme

Der Standard-Export von `src/services/backup/backupService.ts`
las bisher die Benutzereinstellungen und 13 weitere Dexie-Tabellen
**ohne gemeinsame Lesetransaktion**. Während ein zweiter Browser-Tab
Lebensmittel, Mahlzeiten oder Workout-Daten aktualisierte, konnten
die einzeln gestarteten Leseoperationen unterschiedliche Datenstände
erfassen. Ein solcher „torn snapshot“ kann zwar syntaktisch gültig
sein, aber fachlich unvollständig (etwa eine Mahlzeit ohne zugehöriges
Lebensmittel).

Zudem akzeptierte der Standard-Import höchstens **25 MiB**, während
der Export keinerlei Dateigrößengrenze durchsetzte. Die App konnte
also eine Datei erstellen und als Backup melden, die RED Fit später
selbst nicht mehr importieren konnte. Beim Erzeugen wurde das
`lastBackupAt`-Datum außerdem vor einer möglichen Download-Ablehnung
gesetzt. Schließlich wurde ein lokal beschädigter Datensatz vor
dem Export nicht gegen das aktuelle Backup-Schema geprüft.

## Änderungen

1. **Atomarer Snapshot:** `collectBackupData()` liest nun die
   Einstellungen sowie alle 13 Daten-Tabellen in einer gemeinsamen
   Dexie-`r`-Transaktion. Ein paralleler Schreibvorgang kann dadurch
   keinen gemischten Exportstand erzeugen. Foto-Medien sind wie bisher
   bewusst aus dem Standard-Backup ausgeschlossen und gehören zum
   separat bestätigten Foto-Transfer.
2. **Prüfung auf Wiederherstellbarkeit:** `createBackup()` führt
   `backupSchema.safeParse()` auf dem erfassten Dokument aus. Bei
   ungültigen lokalen Daten wird **kein** scheinbar erfolgreiches
   Backup ausgegeben.
3. **Einheitliche Dateigröße:** `MAX_IMPORT_BYTES` und die neue
   Export-Prüfung verwenden dieselbe Konstante
   `MAX_STANDARD_BACKUP_BYTES = 25 MiB`. Geprüft wird die tatsächliche
   `Blob.size` in UTF-8 einschließlich Umlauten oder Emojis.
   Nicht importierbare Dateien werden vor dem Download abgelehnt,
   und die UI zeigt die genaue Größengrenze.
4. **Korrekte Erfolgssignalisierung:** Das `lastBackupAt`-Metadatum
   wird erst **nach Schema-/Größenprüfung und Auslösen des Downloads**
   aktualisiert. Eine fehlerhafte Metadatenaktualisierung verhindert
   keinen bereits angestoßenen Export.
5. **WebView-Verhalten:** Die temporäre Download-URL wird mit
   60 Sekunden Verzögerung freigegeben. Sofortiges Freigeben kann
   in Browsern/WebViews den Download noch vor dem Start unterbrechen.

Die Datei-Struktur (`BACKUP_SCHEMA_VERSION = 1`) bleibt unverändert.
Der Import wurde **in einem nachfolgenden Schritt** für die
Workout-Revisionskontrolle ergänzt: Bei ersetzten Workout-IDs und beim
automatischen Verwerfen zusätzlicher aktiver Trainings steigt
`saveRevision` monoton. Bestehende Backups bleiben kompatibel.
Details: [Backup-Workout-Revisionen](BACKUP-WORKOUT-REVISIONS.md).

Bei der anschließenden Backup-Merge-Prüfung wurde auch der Verlust
unterschiedlicher Mahlzeiten-Einträge mit identischer `MealFoodEntry.id`
behoben. Der Import behält solche Einträge unter einer stabilen Recovery-ID
und vermeidet wiederholte Notizduplikate.
Siehe [Mahlzeiten-Kollisionsschutz](BACKUP-MEAL-COLLISION-SAFETY.md).

## Tests

```bash
# Reine Node-Tests, keine npm-Installation notwendig (Node 22.16+):
npm run test:backup-size
npm run test:backup-snapshot

# Nach Wiederherstellung von npm/Dexie/Vitest:
npm run test -- src/services/backup/backupSnapshot.test.ts
npm run test -- src/services/backup/backupService.test.ts
npm run typecheck
npm run build
```

**Am 2026-11-08 tatsächlich ausgeführt:**

- **6/6 Node-Tests** der Größenrichtlinie mit Node 22.16 erfolgreich:
  25-MiB-Grenze, erlaubte und verbotene Bytezahlen,
  Unicode-/UTF-8-Bytes sowie Unabhängigkeit vom separaten Foto-Backup.
  `tsc --strict --noEmit` für `backupExportPolicy.ts` erfolgreich.
  Lokale Dateien sind anhand ihrer Git-Blob-SHA-1 mit GitHub identisch:
  `410482c58763a5d5244f14c0c07cccbe52891c83`
  und `0505b25c491f176f54ba24f0e651b42be131c0de`.
- **7/7 gezielte V8-Quelltextprüfungen** an den tatsächlichen
  Funktionskörpern `collectBackupData()` und `createBackup()` aus
  GitHub-Blob `a6364966c8ee79cc54ab8d40883ba33e4ee3bf6f`
  mit einem instrumentierten In-Memory-Lesetransaktionsstub
  erfolgreich; darunter konsistente Versionen bei einer
  simulierten konkurrierenden Änderung, 14 Tabellen im gemeinsamen
  Transaktions-Scope, Schema-Ablehnung und Export/Metadaten-Reihenfolge.

**Noch nicht ausgeführt:** die fünf zusätzlichen echten Dexie-/Vitest-
Fälle in `src/services/backup/backupSnapshot.test.ts` (sowie die
bestehende Backup-Suite). In der verfügbaren Umgebung fehlen
`dexie`, `fake-indexeddb` und `vitest`, und die npm-Registry
lässt sich nicht auflösen (`EAI_AGAIN`). Damit sind reale IndexedDB-
Transaktionsisolation, Downloadverhalten und native iOS-/Windows-Builds
**noch nicht bestätigt**.

## Operative Grenzen

Der erfolgreiche Klick auf einen Export-Link beweist nicht, dass das
Betriebssystem die Datei dauerhaft gespeichert hat. Benutzer sollten
deshalb regelmäßig den Download finden und einen Restore-Test auf
einem anderen Profil/Gerät durchführen. Die 25-MiB-Obergrenze bleibt
bewusst bestehen; größere Standard-Backups werden jetzt transparent
zurückgewiesen. Für größere Datensätze ist künftig ein explizit
versionierter, chunkbarer Export/Import nötig, statt eine unbrauchbare
Datei ohne Warnung anzubieten.
