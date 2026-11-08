# RED Fit – Mahlzeiten beim Backup-Import ohne ID-Kollisionsverlust zusammenführen

**Stand:** 2026-11-08 · Integrations-Branch
`feat/unified-iphone-windows-integration`

## Problem

Wenn beim Merge eines Standard-Backups zwei `MealLog`-Container denselben
`date` + `mealType` hatten, führte `mergeDuplicateMealLogs()` die
Einträge nur anhand der `MealFoodEntry.id` zusammen. Der Code übersprang
jede spätere, gleichnamige ID – **auch wenn diese zu einem anderen
Lebensmittel, anderen Kalorien oder einem anderen Roh-/Gekochtgewicht
gehörte**.

Da separate RED-Fit-Installationen unabhängige IDs erzeugen, ist eine
Kollision unwahrscheinlich, aber möglich, etwa nach mehrfachen Imports,
kopierten Datensätzen oder fehlerhaften Drittanbieter-Backups.
Das bisherige Überspringen bedeutete stillen Datenverlust.

## Neue Merge-Regeln

`src/services/backup/mealImportMerge.ts` enthält jetzt die pure
Funktion `mergeImportedMealSlot(group, preferredIds)`. Der
`importBackup()`-Pfad verwendet sie innerhalb der bereits vorhandenen
Dexie-`rw`-Transaktion.

1. Gleiche Entry-ID **und identischer Nährwert-Snapshot**: dieselbe
   Position wird nur einmal übernommen.
2. Gleiche Entry-ID, aber **unterschiedliche Daten**: beide Einträge
   bleiben erhalten. Der zweite erhält eine stabile, aus Quellcontainer
   und ursprünglicher Entry-ID abgeleitete Recovery-ID:
   `restored:<Länge-Quell-ID>:<Quell-ID>:<Länge-Entry-ID>:<Entry-ID>`.
3. Ist diese Recovery-ID bereits mit einem identischen Snapshot
   belegt, wird kein zweiter Eintrag angelegt. Bei unterschiedlichem
   Inhalt wird eine numerische Kennung angehängt. **Wiederholte Importe
   derselben Datei bleiben damit idempotent.**
4. Ursprüngliche Autoren-/Nährwert-/Kochgewichts-Felder der Einträge
   werden nicht geändert; ausschließlich die ID einer tatsächlich
   kollidierenden Position wird ersetzt.
5. Der lokale Mahlzeiten-Container behält wie bisher Vorrang. Notizen
   werden als mehrzeilige Textblöcke zusammengeführt und bei einem
   erneuten Import nicht nochmals angehängt.
6. Einträge verschiedener Tage oder Mahlzeiten werden nicht
   miteinander vermischt. Ungültige gemischte Gruppen führen zu
   einem Fehler und damit zum Transaktionsabbruch.

## Nachweis

```bash
# Node.js 22.16+, ohne npm-Installationspakete:
npm run test:backup-meal-collisions

# Mit verfügbarer Dexie-/Vitest-Testumgebung:
npm run test -- src/services/backup/backupMealCollisions.test.ts
npm run test -- src/services/backup/backupService.test.ts
npm run typecheck
```

**Tatsächlich ausgeführt (2026-11-08):** Die elf im GitHub-Branch
committeten Standalone-Testfälle wurden mit dem echten Produktions-
Funktionskörper in V8 ausgeführt; **11/11 bestanden**. Dabei wurden
ausschließlich die TypeScript-Typannotationen für den isolierten Aufruf
abgestreift. GitHub-Quellblob:
`2452d9e667ea07ad00ce0a1a38d3bf448247b2b2`.
GitHub-Testblob:
`034d1f452371fce36c6f477c3c8fa402a9190e85`.

Die Tests prüfen insbesondere ID-Kollisionen mit unterschiedlichen
Makronährwerten, echte Duplikate, wiederholte Importe, mehrere
Kollisionen pro Quellcontainer, Roh-/Gekocht-Metadaten, den Vorrang
lokaler Datensätze und mehrzeilige Notizen.

**Sechs zusätzliche echte Dexie-/Vitest-Testfälle** wurden in
`src/services/backup/backupMealCollisions.test.ts` eingecheckt,
aber in dieser Umgebung **nicht ausgeführt**, da die npm-Registry
weiterhin nicht erreichbar ist (`EAI_AGAIN`) und die benötigten
`dexie`-/`fake-indexeddb`-/`vitest`-Pakete fehlen.

Die elf isolierten Fälle beweisen die reine Zusammenführungslogik, nicht
das reale Transaktions-/Rollbackverhalten von IndexedDB. Dafür bleiben
die echten Dexie-Tests vor einem Release verpflichtend.

Diese Änderung betrifft ausschließlich den **Standard-Backup-Import**;
Foto-/Medien-Backups und das Backup-Dateiformat bleiben unverändert.
