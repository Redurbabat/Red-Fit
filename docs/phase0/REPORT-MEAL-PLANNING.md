# REPORT-MEAL-PLANNING.md — Essensplan, Rezepte, Einkaufsliste

Untersucht: Mealie, Tandoor, Calories-In, BABAT-RED (Fitness-Modul), PANTS.

## 1. Essensplan-Modell — Entscheidung

Konsens Mealie + BABAT-RED: Plan → Tage → Einträge; ein Eintrag referenziert
**Food ODER Rezept ODER freien Text** (Master-Prompt §26: `foodId? | recipeId? | label?`).
BABAT-RED hat zusätzlich `MealPlanTemplate` (wiederverwendbare Wochenvorlage) und
`MealCompletionLog` (geplant vs. tatsächlich gegessen) — beides als Post-MVP-Erweiterung
dokumentiert, Datenmodell lässt es zu.

Tagesmakros aus geplanten Mengen berechnen — dieselben reinen Funktionen wie beim
Meal Log (Calories-In `aggregateStats`-Muster).

## 2. Rezepte — Entscheidung

- MVP-Modell (Master-Prompt §27): Name, Zutaten (foodId + amountG), Portionen, Schritte.
- Nährwerte pro Portion = Summe der Zutaten / Portionen (BABAT-RED
  `FitnessMakroService` rechnet genau das, mit Tests).
- Mealies/Tandoors URL-Import-Parser sind bewusst **nicht** MVP (stark, aber groß).

## 3. Einkaufsliste — Entscheidung

**Mealie `merge_items` ist der Referenz-Algorithmus** für die Generierung aus dem Plan:
- Gruppierung nach (foodId, unit)
- Mengen summieren: Reis 200 g + 300 g + 250 g → Reis 750 g
- freie Einträge (nur Label) bleiben ungemerged
- bestehende Liste nie ungefragt überschreiben → Dialog "neue Liste / zu bestehender
  hinzufügen" (Master-Prompt §67)

BABAT-RED `FitnessEinkaufService` implementiert dieselbe Aggregation bereits in
TypeScript mit Tests — **direkte Portierungsbasis** (eigener Code). Mealie dient als
Korrektheits-Referenz.

## 4. Manuelle Liste

Abhaken, Ausblenden Erledigter, Löschen, Zurücksetzen (Master-Prompt §28) — trivial,
alle Quellen einig; Mealies Aufräum-Task (alte erledigte Positionen) als spätere Idee.

## Punktetabelle Planung

| Quelle | Meal Plan | Rezepte | Shopping-Aggregation | Portierbarkeit |
|---|---:|---:|---:|---:|
| Mealie | **5** | **5** | **5** | 3 (AGPL, Python) |
| BABAT-RED | 4 | 4 | **4 (TS + Tests!)** | **5** |
| Calories-In | **5 (Editor-UX)** | 2 | 1 | 5 |
| Tandoor | 4 | 5 | 4 | 1 (Commons Clause) |
| PANTS | 1 | 3 | 1 | 2 |
