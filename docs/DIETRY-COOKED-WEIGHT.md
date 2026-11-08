# RED Fit – gekochte Mengen korrekt erfassen (Dietry-Konzept)

## Problem und Umsetzung

Eine Nährwertangabe „pro 100 g“ beschreibt das Lebensmittel in der Form,
für die das Produkt erfasst wurde. Bei trockenen Nudeln und Reis unterscheidet
sich dieses Gewicht erheblich vom Gewicht nach dem Kochen.

RED Fit bietet jetzt beim Erfassen eines passenden Lebensmittels **optional**
„Gekocht (Gewicht auf dem Teller)“. Standard bleibt **„Roh / trocken
(laut Nährwertangabe)”**, sodass bestehende Arbeitsabläufe unverändert sind.

Beispiel: 260 g gekochter Basmati-Reis und ein beispielhafter
Quell-Nährwert von 365 kcal/100 g trocken:

- Umrechnungsfaktor (gekocht / roh): 2,6
- Rohäquivalent: 260 / 2,6 = **100 g**
- Geschätzte Energie: **365 kcal**, nicht 949 kcal
- Die tatsächlich gewogenen **260 g** bleiben im Tagebuch sichtbar.

Bei einer manuellen Änderung bleiben der ursprüngliche Faktor und die
gekochte Basis am einzelnen Eintrag gespeichert. Auch wenn der
Lebensmittel-Datensatz später bearbeitet wird, wird die Berechnung nicht
still nochmals umgerechnet.

## Konservative Zuordnung und Unsicherheit

`src/services/calculations/cookingYield.ts` übernimmt das
**Prinzip** von Dietrys lokalem `lib/services/cooking_yield.dart` und die
für die Gruppe publizierten Richtwerte:

| Gruppe | Faktor (gekocht / roh) | Unsicherheit |
| --- | ---: | --- |
| Nudeln / Pasta | 2,20 | niedrig |
| Reis | 2,60 | niedrig |
| Trockene Hülsenfrüchte | 2,50 | niedrig |
| Quinoa, Bulgur, Couscous, Hafer usw. | 2,60 | niedrig |
| Geflügel | 0,73 | mittel |
| Rotes Fleisch | 0,72 | mittel |
| Fisch | 0,82 | niedrig |
| Blattgemüse | 0,40 | mittel |
| Pilze / Zwiebeln | 0,60 | mittel |
| Kartoffeln | 0,82 | niedrig |

Die Faktoren sind **grobe Zubereitungsnäherungen**, keine individuellen
Messwerte. Besonders beim Braten/Grillen können zusätzlich Fette und
Nährstoffe verloren gehen: Die Umrechnung über das Gewicht kann solche
Retentionseffekte nicht exakt abbilden. Die UI warnt davor.

Eine zusätzliche Unsicherheitsstufe `low` bzw. `medium` wird bei
gekochter Erfassung berücksichtigt. Ist die vom Nutzer gewählte
Unsicherheitsstufe bereits höher, bleibt sie erhalten. Beim Speichern eines
normalen Rohgewichts erfolgt diese zusätzliche Schätzung **nicht**.

Namen, die bereits „gekocht“, „gebraten“, „baked“, „grilled“ usw.
enthalten, werden ausdrücklich ausgeschlossen – ebenso gemischte Gerichte,
Fertigprodukte, Soßen, Salate, Reiscracker und Konserven. Bei unklaren
Lebensmitteln wird **keine** gekochte Option angeboten. Anders als ein
automatischer Umrechnungsversuch ist ein bewusst fehlender Vorschlag kein
Risiko für falsche Kalorienzählungen.

## Datenmodell und Rückwärtskompatibilität

`MealFoodEntry.amountG` bedeutet weiterhin die zur 100-g-Nährwertbasis
gehörige Menge. Nur für ausdrücklich gekocht gewogene Einträge kommen
drei optionale Snapshot-Felder hinzu:

- `weighedAs: "cooked"`
- `weighedAmountG` (tatsächlich auf dem Teller gewogen)
- `cookingYieldFactor` (bei der Erfassung verwendeter Faktor)

Eine Zod-Prüfung erzwingt für gekochte Einträge alle drei Felder gemeinsam,
verhindert negative Mengen und unzulässige Faktoren. Alte Tagebücher und
RED-Fit-JSON-Backups ohne diese Felder werden weiterhin angenommen.
Der Foto-Backup-Vertrag wird nicht geändert.

Tagesansicht und Eintragseditor zeigen die ursprünglich gekochte Menge
sowie das Rohäquivalent; beim Nachbearbeiten des gekochten Gewichts werden
Nährwert-Snapshots erneut berechnet beziehungsweise beim gelöschten
Lebensmittel proportional fortgeführt.

## Umsetzung und Testumfang

- `src/services/calculations/cookingYield.ts`: rein funktionale Regeln,
  Umrechnung, Kombination der Unsicherheit, sichere Anzeige alter Einträge.
- `src/features/nutrition/meals/AddMealPage.tsx`: explizite
  Roh-/Gekocht-Auswahl, Einheitenvorschau und opt-in-Speicherung.
- `src/features/nutrition/NutritionPage.tsx`: Darstellung und Änderung
  gekochter Mengen ohne doppelte Umrechnung.
- `src/models/nutrition.ts`: optionale Snapshot-Metadaten und
  Konsistenzvalidierung.
- `src/services/calculations/cookingYield.test.ts`,
  `src/models/nutrition.cookingYield.test.ts`: Vitest-Regressionsfälle,
  **noch nicht in der vollständigen App-Suite ausgeführt**.
- `tools/cooking-yield.selftest.mjs`: dependency-freie Node-Prüfung der
  reinen Umrechnung, mit
  `node --experimental-strip-types --test tools/cooking-yield.selftest.mjs`.

**Ausgeführt:** 8/8 unabhängige Berechnungsfälle auf der aus dem
GitHub-Quelltext isolierten Rechenlogik bestanden. Ein vollständiger
`npm run typecheck`, Vitest- und iPhone-/Windows-Build bleibt ausstehend,
solange npm-Abhängigkeiten und GitHub-Actions-Runner nicht bereitstehen.
Diese Tests sind ausdrücklich **kein** Nachweis eines vollständigen
native-App-Builds.

## Lizenz und Herkunft

Die ursprüngliche Idee und die Referenztabelle stammen aus
**Dietry** (`dietry-main.zip`, `lib/services/cooking_yield.dart`,
`docs/cooked_weight_plan.md`), einem Projekt unter **MIT-Lizenz**,
Copyright © 2026 tcriess. Der TypeScript-Code wurde für RED FIt
neu implementiert, ohne Flutter-/PostgREST-Abhängigkeiten. Der originale
Lizenzhinweis wird unter `docs/licenses/dietry-MIT.txt` aufbewahrt.

Quellreferenzen aus dem Dietry-Entwurfsdokument: USDA Table of Cooking
Yields for Meat and Poultry, Bognár/FAO-Gewichtsausbeuten und
Verordnung (EU) Nr. 1169/2011. Die Werte sind keine medizinische Empfehlung.
