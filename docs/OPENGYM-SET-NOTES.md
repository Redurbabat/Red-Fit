# openGym → RED Fit: Notizen pro Trainingssatz

Stand: 2026-11-08. Ein inkrementeller Funktionstransfer in den bestehenden
React-/TypeScript-Core, **keine zweite App und kein zusätzlicher Server**.

## Quellenbefund und Abgleich

Im bereitgestellten Archiv `openGym-main(1).zip`:
- `frontend/src/lib/set-notes.js` definiert kurze Satznotizen mit maximal
  140 Zeichen und das Entfernen leerer Notizen.
- `frontend/src/views/Workout.set-note.test.jsx` prüft Satznotiz schreiben,
  unter der Satzzeile darstellen und durch Leeren entfernen.
- `frontend/src/views/Workout.jsx` zeigt die Notiz am Satz an.

Vor der Änderung in RED Fit:
- `src/models/workout.ts`: `SetLog.notes?: string` **war bereits vorhanden**.
- `src/features/training/workout/WorkoutPage.tsx`: Satzkarten hatten Gewicht,
  Wiederholungen und RPE, aber keinen Notizeditor.
- `WorkoutSummaryPage.tsx`: zeigte keine vorhandenen Satznotizen an.
- `updateSet(...)` und die serialisierte Workout-Autosave-/Revisionskontrolle
  waren bereits implementiert und werden weiterverwendet.

## Umsetzung

- `src/services/workout/setNotes.ts`: `normalizeSetNote` entfernt
  Steuerzeichen, trimmt und begrenzt auf 140 Zeichen. Eine leere Notiz wird
  `undefined`; das optionale Zod-Feld und die Datenbank bleiben unverändert.
- `WorkoutPage.tsx`: zugänglicher `<details>`-Editor pro Satz. Änderungen
  verwenden das bestehende `updateSet`-Autosave; beim Verlassen des Feldes
  wird die endgültige Notiz normalisiert und bei Bedarf sofort gespeichert.
- `WorkoutSummaryPage.tsx`: vorhandene Notizen erscheinen unter dem jeweiligen
  Satz, einschließlich historischer Trainings.
- Normale `WorkoutLog`-Datensätze führen die optionalen Notizen wie bisher mit;
  der Standard-Backup-Schema-Pfad über `workoutLogs` bleibt unverändert.
  **Ein echter Backup-Restore wurde für diese Änderung nicht neu getestet.**

Es wurden keine Medien, Fremd-Bibliotheken oder Datensätze aus openGym
übernommen. Die Funktion wurde an RED Fits bestehendes Datenmodell angepasst.

## Nachweis / Grenzen

- `src/services/workout/setNotes.test.ts`: drei neue Vitest-Fälle (noch nicht
  im vollständigen App-Lauf ausgeführt).
- `tools/set-notes.selftest.mjs`: drei reine Node-Tests und ein ergänzender
  statischer Quellvertrag für Workout-/Summary-Verkabelung. Letzterer läuft
  im vollständigen Checkout; bei isolierter Prüfung ohne React-Quelldateien
  **nicht** ausgeführt.
- Tatsächlich ausgeführt auf Node.js 22.16.0: **3/3 reine Node-Tests bestanden**,
  `setNotes.ts` außerdem mit `tsc --noEmit --strict` allein geprüft.
  Verwendete `setNotes.ts` und `set-notes.selftest.mjs` per Git-Blob-SHA
  exakt mit `main` abgeglichen.
- Separat **9/9 statische Quellen-Abgleiche** gegen die GitHub-`main`-Dateien
  erfolgreich (Feld, UI, Autosave-Aufruf, Normalisierung, Eingabelimit,
  Accessibility, Zusammenfassung, Rückgabe bei Leertext, Testvertrag).
- Noch ausstehend: gesamter React-/Vitest-/Vite-Build, persistenter
  IndexedDB-Roundtrip, Geräteschlaf/Reload mit während der Eingabe laufendem
  Debounce sowie Accessibility auf echten Geräten.

## Folgeschritte

1. Vollständige Testpipeline auf Checkout mit installierten npm-Paketen:
   `npm ci && npm run typecheck && npm run lint && npm run test && npm run build`.
2. Auf iPhone und Android manuell prüfen: lange Notiz, Satzwechsel,
   App-Sperre direkt nach dem Tippen, abgeschlossenes Training öffnen,
   Backup exportieren und wiederherstellen.
3. Weitere openGym-Funktionen (Progressionsmodi und Timer) getrennt
   vergleichen und nur fehlende Teile in RED Fit integrieren.
