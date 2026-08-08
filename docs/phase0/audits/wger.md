# wger — Audit

## Identität
- Original: https://github.com/wger-project/wger · Lizenz: **AGPL-3.0** (Übungsdaten teils CC-BY-SA)
- Kategorie: Workout + Nutrition · Stack: Django/Python (699 py), Server-Rendering + API

## Relevante RED-Fit-Bereiche
Übungen ✅ · Pläne ✅ · Nutrition ✅ · Barcode (über OFF-Sync) ✅

## Kernerkenntnisse für RED Fit
1. **Reifste Übungs-Struktur**: `Exercise`, `ExerciseCategory`, `Equipment`, `Muscle`
   (mit `is_front`-Flag für Körpergrafik!), `Alias`, `Translation`, `ExerciseImage`, `ExerciseVideo`.
   Fixtures (categories/equipment/muscles) sind als Vokabular-Checkliste wertvoll.
2. **Ingredient-Modell pro 100 g**: `energy`, `protein`, `carbohydrates`,
   `carbohydrates_sugar`, `fat`, `fat_saturated`, `fiber`, `sodium` — deckt sich mit RED Fits
   FoodItem inkl. der optionalen Felder.
3. Routine-System mit `AbstractChangeConfig` (Progression als Operation+Step pro Woche) —
   konzeptionell interessant, für MVP zu komplex.

## Ballast
Gesamte Django-App, Gym-Verwaltung (Studio-Betreiber-Features), Celery, i18n (37 po).

## Bewertung (0–5)
Relevanz 4 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 2 · Offline 0 · Tests 4 ·
geringe Abhängigkeitslast 1 · Portierbarkeit 2

## Entscheidung: **PARTIAL**
Kein Code-Extrakt. Feldlisten/Vokabular dokumentiert in REPORT-NUTRITION.md und REPORT-WORKOUT.md.
