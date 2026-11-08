# RED Fit – atomare Mahlzeiten-Speicherung

## Gefundene Ursache (2026-11-08)

Der bisherige Ablauf in `AddMealPage.tsx` und `RecipesPage.tsx`
führte `findByDateAndType()` aus und schrieb danach
`entries: [...existing.entries, entry]` zurück, **ohne eine gemeinsame
Read-Write-Transaktion**.

Wenn zwei Fenster oder Eingabewege nahezu gleichzeitig speicherten, konnten
beide dieselbe alte Liste lesen. Der zuletzt schreibende Vorgang überschreibt
dann den anderen Eintrag. Die Datenbankindizes `[date+mealType]` sind zudem
**nicht eindeutig**, sodass zwei gleichzeitige Neuanlagen doppelte
Mahlzeiten-Container erzeugen können.

Dasselbe Muster bestand beim Bearbeiten und Löschen in `NutritionPage.tsx`:
Eine ältere UI-Kopie der gesamten Entry-Liste konnte neuere Änderungen
ungefragt überschreiben. Besonders kritisch wäre das bei Einträgen mit
bereits gespeicherter Roh-/Gekocht-Umrechnung.

## Behebung

`src/services/storage/mealRepository.ts` stellt jetzt drei
Transaktionsmethoden auf `db.mealLogs` bereit:

1. `appendEntry(date, mealType, entry)`: synchronisiert konkurrierende
   Erfassungen in einer Dexie-Read-Write-Transaktion. Falls alte doppelte
   Container existieren, werden **alle unterschiedlichen Entry-IDs und
   Notizen** im ältesten Container zusammengeführt; redundante Container
   verschwinden innerhalb derselben Transaktion. Wiederholtes Anhängen
   derselben Entry-ID ist idempotent. Zod validiert den Eintrag vor dem
   Schreiben, einschließlich seiner optionalen Kochgewichts-Metadaten.
2. `updateEntryNutrition(logId, entryId, changes)`: liest den aktuellen
   Datensatz innerhalb der Transaktion und aktualisiert nur die
   Nährwert-/Mengenfelder des gewählten Eintrags. Andere Einträge sowie
   `weighedAs`, `cookingYieldFactor` und `estimateLevel` bleiben
   erhalten. Stale-IDs werden als Fehler gemeldet.
3. `deleteEntry(logId, entryId)`: löscht genau einen vorhandenen
   Eintrag, ohne einen früher gelesenen gesamten Array zurückzuschreiben.
   Ist danach keine Position mehr enthalten, wird auch der leere
   Container gelöscht. Stale-IDs werden nicht fälschlich als Erfolg
   ausgegeben.

Die reinen Operationen für Zusammenführen/Ersetzen/Löschen liegen in
`src/services/storage/mealEntryOperations.ts`. Beide UI-Wege,
`AddMealPage.tsx` und `RecipesPage.tsx`, nutzen nun den gemeinsamen
atomaren `appendEntry`-Pfad.

Zusätzliche UI-Sicherung: `AddMealPage` blockiert über ein
synchron gesetztes Ref schnelle Mehrfachklicks, bevor React den
`saving`-Status neu zeichnet. Die optionale Aktualisierung von
„Zuletzt verwendet“ wird nicht mehr als fehlgeschlagenes Speichern
dargestellt, **nachdem** der Mahlzeiteneintrag bereits erfolgreich
persistiert wurde.

Die IndexedDB-Struktur und der JSON-Backup-Vertrag bleiben unverändert;
es ist **keine Datenmigration** oder neue Tabelle erforderlich.

## Verifikation

```bash
# Lokal auch ohne npm ci (Node 22.16+):
npm run test:meal-integrity
# Alternativ direkt:
node --experimental-strip-types --test tools/meal-entry-ops.selftest.mjs

# Sobald npm und fake-indexeddb verfügbar sind:
npm ci
npm run typecheck
npm run test -- src/services/storage/mealRepository.atomic.test.ts
```

**Tatsächlich am 2026-11-08 lokal ausgeführt:**
10/10 Node-Tests des reinen Merge-/Update-/Delete-Codes bestanden.
Ein isolierter TypeScript-Check mit lokalen Typ-Stubs war erfolgreich.
Die beiden getesteten Dateien wurden durch Abgleich ihrer
vollständigen Git-Blob-SHA-1 mit dem GitHub-Branch verifiziert:
`mealEntryOperations.ts` → `021898ac483a2d66ae99cc5ce0b383b400143a79`;
`meal-entry-ops.selftest.mjs` → `b9d06d933a6dd7a837d79e66d81f24fc8f4a9eb1`.

**Noch nicht ausgeführt:** die neuen **10 Dexie-Regressionstests** in
`mealRepository.atomic.test.ts`, darunter parallele UI-Eingaben,
Rezept-Logging, Rollback und Cooked-Weight-Snapshots.
In der aktuellen Ausführungsumgebung sind `dexie`, `fake-indexeddb`
und `vitest` weiterhin nicht installiert. Ein Registry-Test ergab
`EAI_AGAIN`; die bereits diagnostizierten GitHub-Actions-Runs erhalten
keinen Runner. Der pure Node-Test **beweist daher keine erfolgreichen
realen IndexedDB- oder Geräte-Roundtrips**.

Nach Wiederherstellung von CI/Netzwerk müssen ausdrücklich getestet werden:
zwei parallele Browser-Tabs, manuelles Logging parallel zum Rezept-Logging,
Roh-/Gekocht-Editing, Backup-Restore und eine native iPhone-/Windows-WebView.
