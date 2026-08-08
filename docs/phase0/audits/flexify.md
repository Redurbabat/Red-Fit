# Flexify — Audit

## Identität
- Original: https://github.com/brandonp2412/Flexify · Lizenz: **MIT**
- Kategorie: Workout · Stack: Flutter/Dart (199 Dateien), Drift (SQLite), auch Web-Build

## Relevante RED-Fit-Bereiche
Workout ✅ · Pläne ✅ · Progression ✅ · Local-first ✅

## Kernerkenntnisse für RED Fit
1. **Minimalistisches Gegenmodell zu Liftosaur**: nur 3 Kerntabellen —
   `GymSets` (jeder Satz eine Zeile, mit `restMs` direkt am Satz), `Plans` (Tage als Text),
   `PlanExercises` (maxSets, warmupSets, sequence). Beweis: Set-Logging braucht kein
   kompliziertes Schema.
2. `native_timer_wrapper.dart` + `timer/timer_state.dart`: Timer über Deadline-Timestamp,
   nativer Alarm als Verstärkung — bestätigt das `restEndsAt`-Muster.
3. Import/Export als CSV direkt aus der DB (`export_data.dart`) — pragmatisch.

## Ballast
Flutter-Plattformordner (android/ios/linux/macos), 877 txt (Lokalisierung), Fastlane.

## Bewertung (0–5)
Relevanz 4 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 4 · Offline 4 · Tests 3 ·
geringe Abhängigkeitslast 3 · Portierbarkeit 2 (Dart, aber Schema trivial übertragbar)

## Entscheidung: **PARTIAL**
Kein Code-Extrakt. Schema-Minimalismus dokumentiert in REPORT-WORKOUT.md §1.
