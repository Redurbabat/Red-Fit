# REPORT-WORKOUT.md — Training über alle Quellen

Untersucht: Liftosaur, workout-cool, wger, openGym, LiftLog, Flexify, FastNFitness,
Wingfit, ExerciseDiary, Workout Tracker, BABAT-RED.

## 1. Set-Modell — Entscheidung

Zwei Extreme im Bestand:
- **Flexify**: ein Satz = eine Zeile (`GymSets`), kein Workout-Objekt. Maximal simpel,
  aber Workout-Zusammenfassung/Resume schwierig.
- **Liftosaur**: `ISet` mit ~20 Feldern (geplant + ausgeführt + AMRAP + Unilateral + Timer je Satz).

**RED Fit nimmt die Mitte** (Master-Prompt §17): `SetLog { setIndex, weightKg, reps, rpe?,
completed, completedAt? }` — aber übernimmt Liftosaurs entscheidende Idee:
**Plan-Soll und Ist getrennt führen** (`WorkoutPlanExercise.repsMin/repsMax/targetWeightKg`
als Soll, `SetLog` als Ist). Previous Performance = letzter completed SetLog derselben Übung.

## 2. Aktives Workout / Reload-Sicherheit — Entscheidung

Liftosaur ist die Referenz: **das aktive Workout ist keine UI-Sitzung, sondern ein
normaler Datensatz** (`vtype: "progress"` vs. `"history_record"`). Jede Änderung
(Gewicht, Reps, Satz fertig) wird sofort persistiert.

Für RED Fit:
- `WorkoutLog.status: "active"` wird bei Start **sofort** in IndexedDB geschrieben.
- Jede Satz-Änderung → Autosave (Master-Prompt §128).
- App-Start prüft: existiert ein `status === "active"`-Log? → Resume-Banner
  ("Training fortsetzen / beenden / verwerfen").

## 3. Pausentimer — Entscheidung

Alle guten Quellen (Liftosaur `timerSince`+`timer`, Flexify native Deadline) rechnen mit
**absoluten Timestamps, nie mit Countdown-State**. Liftosaur behandelt zusätzlich den
rückdatierten Start nach Screen-Lock (bereits abgelaufener Timer → keine Notification).

RED Fit: `restEndsAt = ISO-Timestamp` am aktiven WorkoutLog; Anzeige = `restEndsAt - now`
bei jedem Render; bei `visibilitychange` neu berechnen. +30 s = `restEndsAt += 30s`.

## 4. Progression / PRs — Entscheidung

- **BABAT-RED `GymProgressionService`** liefert die MVP-Progression: Double Progression
  (alle Sätze am Wdh-Ziel → +2,5 kg, sonst mehr Wdh.) — einfach, getestet, deutsch dokumentiert.
- Liftosaurs Liftoscript (programmierbare Progression) ist bewusst **nicht** MVP.
- PR-Definitionen aus Master-Prompt §54 decken sich mit BABAT-RED `bestwert()` +
  Liftosaur-Historie: höchstes Gewicht, meiste Reps bei gleichem Gewicht, höchstes Volumen.
- Volumen-Detail aus BABAT-RED übernehmen: Körpergewichtsübungen zählen mit Körpergewicht.

## 5. Übungsbibliothek — Entscheidung

- **Inhalt**: BABAT-RED `uebungen.ts` (deutsche Übungen mit Schritten/Fehlern/Tipp) als Seed.
- **Taxonomie**: workout-cool-Schema als Checkliste (primary/secondary muscle, equipment,
  mechanics), wger-Fixtures als Vokabular-Abgleich (Kategorien, Equipment, Muskeln mit
  `is_front` für spätere Körpergrafik/3D).
- RED Fits `Exercise`-Typ (Master-Prompt §15) reicht dafür aus.

## 6. Trainingsplan-Modell — Entscheidung

workout-cools Hierarchie (Program→Week→Session→Exercise→SuggestedSet) ist die
vollständigste; RED Fit braucht fürs MVP nur Plan→Session→Exercise (Master-Prompt §16),
lässt aber `dayIndex` optional — beides bei workout-cool bestätigt.

## Punktetabelle Training

| Quelle | Set-Modell | Active-Resume | Timer | Progression | Library | Mobile-UX |
|---|---:|---:|---:|---:|---:|---:|
| Liftosaur | 5 | **5** | **5** | 5 | 4 | 5 |
| BABAT-RED | 3 | 1 | 2 | **4 (MVP-fit)** | **5 (deutsch)** | 3 |
| Flexify | **5 (simpel)** | 2 | 4 | 3 | 3 | 4 |
| workout-cool | 4 | 2 | 2 | 3 | **5 (Taxonomie)** | 3 |
| LiftLog | 4 | 3 | 3 | 4 | 3 | 4 |
| wger | 3 | 1 | 1 | 4 | 5 | 2 |
| openGym | 3 | 2 | 3 | 2 | 2 | 4 |
| übrige | ≤2 | ≤1 | ≤2 | ≤2 | ≤2 | ≤3 |
