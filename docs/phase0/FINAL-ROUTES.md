# FINAL-ROUTES.md — Verbindliche Routen RED Fit

React Router, Browser-History. Direktes Neuladen jeder Route muss funktionieren
(SPA-Fallback auf `index.html` via PWA/Hosting). Browser-Back sinnvoll.

## Bottom Navigation (5 Tabs)

| Tab | Route | Icon (Lucide) |
|---|---|---|
| Heute | `/today` | House |
| Training | `/training` | Dumbbell |
| Ernährung | `/nutrition` | Utensils |
| Fortschritt | `/progress` | ChartLine |
| Mehr | `/more` | Menu |

## Routenbaum

```text
/                                   → redirect: onboardingCompleted ? /today : /onboarding
/onboarding                         5 Schritte (Ziel, Ort/Tage, Tracking-Modus, Summary)

/today                              Dashboard (Greeting, TodayWorkout, Makros, Wasser, Quick Actions)

/training                           Hauptscreen (aktiver Plan, Pläne, Übungen, letzte Workouts)
/training/plans                     Planliste + Vorlagen
/training/plans/new                 Plan erstellen
/training/plans/:planId             Plan ansehen/bearbeiten/aktivieren
/training/exercises                 Übungsbibliothek (Suche, Muskel-/Equipment-Filter)
/training/exercises/:exerciseId     Detail (Anleitung, Fehler, Tipps, 3D-Platzhalter, PRs, letzte Leistung)
/training/workout/:workoutId        Workout-Modus (Sätze, Gewicht/Reps, Timer) — wichtigster Screen
/training/workout/:workoutId/summary  Abschluss (Dauer, Volumen, PRs, Notiz)

/nutrition                          Tagesansicht (Datum navigierbar, Makros, Mahlzeiten, Wasser)
/nutrition/foods                    Lebensmittelsuche (Favoriten, zuletzt verwendet, alle)
/nutrition/foods/new                Food erstellen (Werte pro 100 g)
/nutrition/foods/:foodId            Food ansehen/bearbeiten
/nutrition/meals/add                Mahlzeit hinzufügen (Typ → Food → Gramm → Live-Berechnung)
/nutrition/scan                     Barcode (manuell immer, Kamera wenn BarcodeDetector)
/nutrition/meal-plan                Wochenplan (Mo–So × Mahlzeiten)

/progress                           Übersicht (Körper, Kraft, Training, Ernährung, Rekorde)
/progress/body                      Körperwerte-Formular + Historie

/shopping                           Einkaufsliste (abhaken, ausblenden, aus Plan generieren)

/more                               Liste aller Bereiche + "KI Coach (später)"
/backup                             Export + Import (Vorschau, Merge)
/settings                           Theme, Woche, Bewegung, 3D, Daten-Hinweis, Reset
/privacy                            Datenschutz + medizinischer Hinweis
/about                              Version, Offline-Erklärung, iPhone-Installationsanleitung
/3d-demo                            3D-Coach-Demo (Platzhalter)
```

## Navigations-Regeln

- Aktives Workout: Resume-Banner auf `/today` und `/training`, solange ein
  `WorkoutLog.status === "active"` existiert; Navigation wirft nie aus dem Workout
  (Datensatz bleibt persistent).
- Bottom Nav darf im Workout-Modus ausgeblendet werden (Zurück / Info / Ende stattdessen).
- Jeder Eintrag unter `/more` führt auf eine existierende, funktionierende Seite —
  keine tote Navigation (§152).
- 404/unbekannte Route → redirect `/today`.
