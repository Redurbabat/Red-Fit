# REPORT-NUTRITION.md — Ernährung über alle Quellen

Untersucht: OpenNutriTracker, SparkyFitness, Waistline, Food You, nutritrace, PANTS,
Calories-In, wger (Ingredient), BABAT-RED (Fitness-Modul).

## 1. Food-Modell — Entscheidung

Konsens aller guten Quellen: **Werte pro 100 g als einzige Source of Truth**
(OpenNutriTracker per 100 g/ml, wger `energy/protein/carbohydrates/…` per 100 g,
Waistline OFF-kompatibel). Portionsgröße nur als Anzeige-Komfort.

Feldliste für RED Fit `FoodItem` (bestätigt gegen wger + OFF-Mapping):
kcal, protein, carbs, fat (Pflicht) · sugar, fiber, salt (optional) ·
barcode **als String** (führende Nullen!), brand, category, servingSizeG, favorite, source.

PANTS' `AbstractBaseNutrients`-Idee (gemeinsame Nährwertfelder für Food UND Recipe)
übernehmen wir als TypeScript-Interface `NutrientValues`, das FoodItem und berechnete
Rezeptwerte teilen.

## 2. Berechnung — Entscheidung

- `factor = amountG / 100`, alle Werte multiplizieren (Master-Prompt §19) — deckungsgleich
  mit BABAT-RED `FitnessMengenService` (getestet) und Calories-In `aggregateStats`.
- **Calories-In `roundMacrosPercents`** löst ein echtes Problem: Makro-Prozente so runden,
  dass die Summe 100 % bleibt (Largest-Remainder-Verfahren). Algorithmus für RED Fit
  eigenständig neu implementieren.
- Rundung: kcal 0 Dezimalen, Makros 1 Dezimale — nur für Anzeige, intern präzise.

## 3. Meal Log — Entscheidung

- **Snapshot-Prinzip** (Master-Prompt §129, von OpenNutriTracker bestätigt):
  `MealFoodEntry` speichert `foodName` + berechnete Werte, damit Historie stabil bleibt,
  wenn das Food später editiert wird.
- Tages-Summen IMMER aus Meal Logs berechnen, nie redundant speichern
  (SparkyFitness macht das serverseitig vor — RED Fit macht es als reine Funktion).

## 4. Ziele — Entscheidung

MVP: ein aktives `NutritionGoal` (Master-Prompt §20). SparkyFitness' Goal-Timeline
(Ziele gelten ab Datum, historische Tage behalten ihr damaliges Ziel) als dokumentierte
spätere Erweiterung — Datenmodell lässt das zu (`createdAt` vorhanden).

## 5. Wasser / Körperwerte

Alle Quellen trivial einig: WaterLog als Einzeleinträge, Tagessumme berechnet;
BodyMeasurement append-only (nie überschreiben). BABAT-RED hat beides bereits als Typen.

## Punktetabelle Nutrition

| Quelle | Food-Modell | Berechnung | Meal-Log | Ziele | Offline |
|---|---:|---:|---:|---:|---:|
| OpenNutriTracker | **5** | 4 | **5** | 4 | 4 |
| BABAT-RED | 4 | **5 (getestet)** | 4 | 4 | 3 |
| Calories-In | 3 | **5 (portierbar)** | 3 | 3 | 3 |
| wger | **5** | 3 | 3 | 3 | 0 |
| SparkyFitness | 4 | 4 | 4 | **5** | 0 |
| Waistline | 4 | 3 | 4 | 3 | 4 |
| Food You | 4 | 4 | 3 | 4 | 4 |
| übrige | ≤3 | ≤3 | ≤3 | ≤2 | ≤2 |
