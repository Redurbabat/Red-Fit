# Kleine Workout-Projekte — Sammel-Audit

## Workout Tracker (jovandeginste) — **DROP**
- https://github.com/jovandeginste/workout-tracker · MIT · Go + templ + GORM
- Trackt **Ausdauer-Aktivitäten**: GPX-Import, Karten, Höhenprofile, Routen-Segmente, MET-Werte.
- Kein Satz/Reps/Gewicht-Modell. Für RED Fit (Kraft-Logging) ungeeignet.
- Nach dieser Dokumentation aus der aktiven Source-Library entfernt. Kein Extrakt.

## Wingfit — **REFERENCE**
- https://github.com/itskovacs/wingfit · **CC BY-NC 4.0 (nicht-kommerziell!)** · Angular 19 + FastAPI
- CrossFit/WOD-orientiert (PR-Tracking, Blocs, Health-Watch-Import). Saubere kleine
  Angular-Struktur, PWA-Manifest vorhanden.
- Wegen NC-Lizenz und Angular-Stack: nur UX-Referenz, kein Code.

## ExerciseDiary — **REFERENCE**
- https://github.com/aceberg/ExerciseDiary · MIT · Go + SQLite + Vanilla JS
- Eine Idee relevant: **GitHub-Style-Heatmap** für Trainingsfrequenz (`internal/web/heatmap.go`).
  Für RED Fits Fortschritts-Screen als Konzept notiert.

## FastNFitness — **REFERENCE**
- https://github.com/brodeurlv/fastnfitness · BSD-3 · Java/Android, klassische DAO-Architektur
- Interessant nur als Feature-Checkliste: getrennte DAOs für Cardio/Kraft/Körpermaße/
  Progressbilder, BodyPart-Verwaltung, CSV-Export. Kein portierbarer Code (Java + AndroidX).
