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

**Grenzen:** Dies ist kein allgemeines Multi-Tab-Synchronisationssystem.
Zwei Tabs, die **beide noch einen aktiven** Workout-Log bearbeiten,
können weiterhin konkurrierende Satzänderungen überschreiben; diese
Fälle benötigen künftig einen echten Versionsvergleich/Merge.
Ein `pagehide`-/PWA-Kill-Event garantiert nicht, dass ein asynchroner
IndexedDB-Flush bis zum Prozessende abgeschlossen ist. Deshalb wird
kein vollständig verlustfreier OS-Kill-Recovery behauptet.

## Prüfung und Status

Ohne npm-Installation lokal mit Node 22.16+:

```bash
npm run test:workout-save-queue
npm run test:workout-status
```

**Tatsächlich lokal ausgeführt am 2026-11-08: 6/6 Warteschlangen- und
7/7 Status-Tests bestanden; beide Module isoliert mit
`tsc --noEmit --strict` typgeprüft.** Die getesteten Dateien wurden
mit den GitHub-Git-Blob-IDs verglichen, um abweichende lokale Kopien
auszuschließen. Der Queue-Test simuliert gezielt einen langsamen alten
Schreibvorgang und ein schnelleres terminales Update. Der Status-Test
prüft verbotene Rückwärtsübergänge und weiterhin mögliche
Same-Status-Edits.

Für die tatsächliche Datenbankintegration sind zusätzliche, noch
**nicht ausgeführte** Vitest-Tests hinterlegt:

- `src/services/workout/serializedWorkoutWriter.test.ts`;
- `src/services/workout/workoutPersistence.test.ts`.

Die vollständige Vitest-/Dexie-/IndexedDB-Suite konnte in der aktuellen
Umgebung ohne installierte Pakete und Registry-DNS-Zugriff nicht
ausgeführt werden. Auch iPhone-/Windows-Binaries wurden nicht gebaut.
Ein echter Gerätetest muss abschließende Satzdaten, einen App-Neustart,
die Wiederaufnahme einer aktiven Session sowie einen zweiten Browser-Tab
abdecken.
