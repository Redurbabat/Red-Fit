# Mealie — Audit

## Identität
- Original: https://github.com/mealie-recipes/mealie · Lizenz: **AGPL-3.0**
- Kategorie: Nutrition/Planung · Stack: FastAPI/Python (595 py) + Nuxt/Vue (203 vue), Postgres/SQLite

## Relevante RED-Fit-Bereiche
Rezepte ✅✅ · Meal Plan ✅✅ · Shopping ✅✅ · Nutrition ◐

## Kernerkenntnisse für RED Fit
1. **Einkaufslisten-Aggregation** (`services/household_services/shopping_lists.py`,
   `merge_items`): gleiche Foods/Einheiten zusammenführen, Mengen summieren,
   Rezept-Referenzen dabei erhalten. Direktes Vorbild für "Reis 200 g + 300 g + 250 g → 750 g".
2. Meal-Plan-Modell: Plan → Tage → Einträge, Eintrag referenziert Rezept ODER freien Titel —
   deckt RED Fits `MealPlanEntry` (foodId | recipeId | label) ab.
3. Rezept-Modell mit Zutaten-Skalierung (`recipe_scale` auf Shopping-Item).
4. Checked-Items-Aufräum-Task (alte erledigte Positionen automatisch löschen) — nette Idee.

## Ballast
Gesamter Server (Auth, Gruppen, OIDC), Nuxt-Frontend, Docker, Alembic-Migrationshistorie.

## Bewertung (0–5)
Relevanz 4 · Codequalität 5 · Wartbarkeit 5 · Mobile UX 3 · Offline 0 · Tests 5 ·
geringe Abhängigkeitslast 1 · Portierbarkeit 3 (Algorithmen klar lesbar)

## Entscheidung: **KEEP**
Kein Code-Extrakt. Aggregations-Algorithmus dokumentiert in REPORT-MEAL-PLANNING.md;
Portierungsbasis ist der eigene FitnessEinkaufService (BABAT-RED).
