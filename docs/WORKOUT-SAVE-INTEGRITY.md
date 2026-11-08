# RED Fit – Schutz vor überholten Workout-Speicherständen

## Gefundenes Problem (2026-11-08)

Die aktive Trainingsansicht startete Speichervorgänge bisher unabhängig:
sofort nach Set-/Navigationsänderungen, nach 400 ms beim Tippen, beim
Schließen der Seite und nochmals beim **Abschließen** bzw. **Verwerfen**.
Es gab keine feste Abschlussreihenfolge dieser `saveWorkout()`-Promises.

Da jeder Aufruf einen vollständigen `WorkoutLog` per IndexedDB-`put`
ersetzt, konnte ein **verspäteter alter „active“-Snapshot** nach dem
„completed“- oder „cancelled“-Snapshot eintreffen. Dies hätte den
endgültigen Status und zuletzt erfasste Sätze wieder überschreiben können.

Ein zweites Fenster bzw. eine PWA in einem anderen Browser-Tab besitzt
unabhängigen React-State; eine reine UI-Warteschlange genügt daher nicht,
um einen bereits finalisierten Eintrag vor einem alten Tab zu schützen.

## Änderungen

### Reihenfolge innerhalb der Workout-Ansicht

`src/services/workout/serializedWorkoutWriter.ts` ist eine kleine
typisierte Promise-Warteschlange. Ein neuer Schreibauftrag startet erst,
wenn der vorherige beendet wurde. Ein fehlgeschlagener Auftrag signalisiert
seinem Aufrufer einen Fehler, **blockiert aber spätere Aufträge nicht**.

`WorkoutPage.tsx` nutzt dieselbe Warteschlange für:

- unmittelbare Änderungen, etwa beim Abschließen eines Satzes;
- 400-ms-Debounce bei Gewichts-/Wiederholungsänderungen;
- den Best-Effort-Flush bei `unmount`, `visibilitychange` und `pagehide`;
- `finishWorkout` und `cancelWorkout` als **letzten Schreibvorgang**.

Nach Beginn des terminalen Schreibvorgangs blockiert ein synchroner
`terminalSaveInFlight`-Ref neue lokale Mutationen und einen zweiten
Abschlussklick. Navigation erfolgt erst nach erfolgreicher Speicherung.
Bei einem Fehler kann der Nutzer den Abschluss erneut versuchen.

### Schutz auch bei unabhängigen Browser-Tabs

`src/services/workout/workoutService.ts` führt
`saveWorkout()` nun in einer Dexie-`rw`-Transaktion auf
`db.workoutLogs` aus. Vor dem Schreiben wird der aktuell gespeicherte
Status geprüft:

- `planned` / `active`: übliche Übergänge zu `active`,
  `completed` oder `cancelled` bleiben möglich;
- `completed` / `cancelled`: kein Zurück zu `active` und kein Wechsel
  in einen anderen terminalen Status;
- gleiche terminale Statuswerte: weitere legitime Änderungen etwa am
  Trainingsnamen bleiben möglich.

Die Geschäftsregel ist in
`src/services/workout/workoutStatusGuard.ts` separat testbar.

### Optimistische Versionierung auch für zwei aktive Tabs (2026-11-08)

Zusätzlich zum terminalen Status erhält jeder `WorkoutLog` jetzt einen
optionalen `saveRevision`-Zähler. Bestehende Datensätze und alte Backups
ohne diesen Wert gelten als **Revision 0**, sodass keine destruktive
Datenmigration notwendig ist. Neue Trainings starten mit Revision 0.

`saveWorkout()` liest den aktuellen Workout-Log in derselben
Dexie-`rw`-Transaktion, in der er geschrieben wird. Ein Update wird
**nur dann angenommen, wenn die vom aufrufenden Tab erwartete Revision
mit der gespeicherten Revision übereinstimmt**. Erfolgreiche Writes
erhöhen den Zähler um 1. Ungültige/überlaufende Versionsnummern werden
abgelehnt. Existiert der Workout-Datensatz nach einer parallelen
Löschung nicht mehr, darf ein später Autosave ihn nicht neu erzeugen.

`WorkoutPage.tsx` hält den erwarteten Zähler in einer pro geladenem
Workout neu angelegten serialisierten Schreibwarteschlange. Nach jedem
erfolgreichen Write wird der erwartete Zähler auf das Ergebnis
aktualisiert. So funktionieren aufeinanderfolgende lokale Autosaves,
während ein *anderer* Tab mit veraltetem Stand einen expliziten
`WorkoutRevisionConflictError` erhält.

Bei einem Konflikt erscheint eine **dauerhafte Warnung** in der
Trainingsansicht: Nicht gespeicherte lokale Eingaben werden nicht als
erfolgreich dargestellt; neue Mutationen werden blockiert, bis die
Nutzerin oder der Nutzer den aktuell gespeicherten Stand über
**„Gespeicherten Stand neu laden“** lädt. Ein automatisches Mischen von
konkurrierenden Sätzen erfolgt bewusst nicht, um keine Trainingswerte
zu erfinden.

**Grenzen:** Dies verhindert das **stillschweigende Überschreiben**
konkurrierender aktiver Trainingseinträge, ist aber kein automatisches
Cross-Tab-Merge. Nicht gespeicherte Änderungen eines zurückgewiesenen
Tabs müssen nach dem Neuladen gegebenenfalls erneut erfasst werden.
Direkte Admin-/Backup-`put`-Operationen außerhalb des Workout-Service
sind nicht Teil dieses Revisionsprotokolls. Ein `pagehide`-/PWA-Kill-Event
garantiert nicht, dass ein asynchroner IndexedDB-Flush bis zum
Prozessende abgeschlossen ist. Deshalb wird kein vollständig
verlustfreier OS-Kill-Recovery behauptet.

### Trainingsnotizen verwenden jetzt dieselbe Revision (2026-11-08)

Im Audit nach Einführung von `saveRevision` wurde noch ein direkter
Schreibweg gefunden: `WorkoutSummaryPage` verwendete
`workoutLogRepository.update(logId, { notes })`. Dieses Feld-Update
ersetzte zwar nicht den gesamten Satzdatensatz, **erhöhte aber die
Revisionsnummer nicht**. Ein anderes Fenster konnte anschließend einen
älteren vollständigen Workout-Stand mit derselben Revision speichern und
damit die zuletzt bearbeitete Notiz wieder überschreiben.

Die neue Methode `saveWorkoutNotes(logId, expectedRevision, notes)` in
`workoutService.ts` führt eine gezielte Notizänderung innerhalb der
Dexie-`rw`-Transaktion aus. Sie lässt ausschließlich bereits
`completed`-/`cancelled`-Workouts zu, prüft `saveRevision`,
erhöht sie und bewahrt **sämtliche Satzdaten** des aktuell gespeicherten
Workout-Logs. Bei Löschung oder veralteter Revision wird abgebrochen.

Die Zusammenfassungsseite verwaltet den erwarteten Revisionsstand in
einer eigenen serialisierten Notiz-Warteschlange. Bei einem Konflikt wird
die weitere Bearbeitung gesperrt und ein dauerhaft sichtbarer
Hinweis mit **„Gespeicherten Stand neu laden“** angezeigt; es gibt kein
stilles Überschreiben. Blur, Debounce und Pagehide verwenden weiterhin
Best-Effort-Flushing, ohne Garantie bei einem OS-Kill.

**Gezielte Prüfung (2026-11-08):** Die beiden tatsächlichen
Produktions-Funktionskörper `saveWorkout()` und
`saveWorkoutNotes()` aus dem GitHub-Blob
`9f9c6651ae9104a4436a105b03ae24c5f925e113` wurden isoliert in
V8 mit einem seriellen In-Memory-Transaktionsstub und der echten
Revisionslogik ausgeführt. **8/8 Prüfungen bestanden**: Notizen
bearbeiten/leeren, Revisionen fortsetzen, parallele Notiz-Tab-Schreibvorgänge
konfliktfrei ablehnen, alte vollständige Workouts abweisen, Satzdaten
erhalten, nicht finalisierte und gelöschte Workouts ablehnen.
Dies prüft die **Produktionslogik mit Stub**, nicht Dexie selbst.

Die echten Dexie-Regressionstests in
`src/services/workout/workoutPersistence.test.ts` sind jetzt um
fünf zusätzliche Notizfälle auf **14 Tests** erweitert. Sie sind
noch **nicht ausgeführt** (fehlende npm-Abhängigkeiten/Registry `EAI_AGAIN`).
Außerdem ist `WorkoutSummaryPage` im vollständigen React-Testlauf
und mit zwei Browser-Tabs zu prüfen.

## Prüfung und Status

Ohne npm-Installation lokal mit Node 22.16+:

```bash
npm run test:workout-save-queue
npm run test:workout-status
npm run test:workout-revision
```

**Tatsächlich lokal ausgeführt am 2026-11-08: 6/6 Warteschlangen- und
7/7 Status-Tests bestanden; beide Module isoliert mit
`tsc --noEmit --strict` typgeprüft.** Die getesteten Dateien wurden
mit den GitHub-Git-Blob-IDs verglichen, um abweichende lokale Kopien
auszuschließen. Der Queue-Test simuliert gezielt einen langsamen alten
Schreibvorgang und ein schnelleres terminales Update. Der Status-Test
prüft verbotene Rückwärtsübergänge und weiterhin mögliche
Same-Status-Edits.

**Zusätzlich tatsächlich lokal ausgeführt:** 8/8 Node-Tests zur
neuen Revisionskontrolle auf Node.js 22.16.0 bestanden, isolierter
`tsc --noEmit --strict`-Check für Revisionsmodul und Queue bestanden.
Dazu gehören Legacy-Revision 0, aufeinanderfolgende Versionen,
zwei aktive Tabs, Konflikterkennung, ungültige Werte und Überlauf.
Die lokal ausgeführten Quellen und Tests stimmen bytegenau mit den
GitHub-Git-Blobs `ecae6c1723680ca87608b3b5fff3500695806120` und
`57c0ecdd9789d10f7c25586245286790b9793dae` überein.
Die bestehenden Dexie-Tests wurden um parallele aktive Tabs,
veraltete Revisionen, Legacy-Daten und gelöschte Workouts erweitert.

Für die tatsächliche Datenbankintegration sind zusätzliche, noch
**nicht ausgeführte** Vitest-Tests hinterlegt:

- `src/services/workout/serializedWorkoutWriter.test.ts`;
- `src/services/workout/workoutPersistence.test.ts`.
- `src/services/workout/workoutRevision.test.ts` (neue Zod-/Revisionsfälle).

Die vollständige Vitest-/Dexie-/IndexedDB-Suite konnte in der aktuellen
Umgebung ohne installierte Pakete und Registry-DNS-Zugriff nicht
ausgeführt werden. Auch iPhone-/Windows-Binaries wurden nicht gebaut.
Ein echter Gerätetest muss abschließende Satzdaten, einen App-Neustart,
die Wiederaufnahme einer aktiven Session sowie einen zweiten Browser-Tab
abdecken.
