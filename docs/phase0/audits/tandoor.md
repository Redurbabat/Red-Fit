# Tandoor Recipes — Audit

## Identität
- Original: https://github.com/TandoorRecipes/recipes · Lizenz: **AGPL-3.0 + Commons Clause** (restriktivste Lizenz im Bestand)
- Kategorie: Nutrition/Planung · Stack: Django (409 py) + Vue 3 (144 vue)

## Relevante RED-Fit-Bereiche
Rezepte ✅✅ · Meal Plan ✅ · Shopping ✅

## Kernerkenntnisse für RED Fit
1. Rezept-Import-Parser (URL→Rezept über schema.org/JSON-LD) — stärkste Import-Pipeline,
   für RED Fit erst weit nach MVP relevant.
2. `cookbook/helper/shopping_helper.py`: Einkaufslisten-Erzeugung aus Meal-Plan mit
   Skalierungsfaktor — zweites Vergleichsbeispiel neben Mealie.
3. Zutaten-Modell trennt `food`, `unit`, `amount`, `note` — sauberer als Freitext.

## Ballast
Django-Server, Vue-Frontend, 168 bcmap/74 mo (PDF-Fonts, Übersetzungen).

## Bewertung (0–5)
Relevanz 3 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 3 · Offline 0 · Tests 4 ·
geringe Abhängigkeitslast 1 · Portierbarkeit 2

## Entscheidung: **PARTIAL** (nur Konzept-Referenz; Mealie ist die primäre Planungs-Quelle.
Wegen Commons Clause keinerlei Code-Übernahme.)
