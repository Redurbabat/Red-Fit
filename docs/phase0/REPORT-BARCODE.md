# REPORT-BARCODE.md — Barcode & Open Food Facts

Untersucht: OpenNutriTracker, Waistline, nutritrace, Food You, SparkyFitness.

## 1. Grundregel (alle Quellen einig, Master-Prompt §63/126.10)

Scanner ist **nie Pflicht**. Reihenfolge im MVP:
1. Barcode manuell eingeben (inputmode="numeric", **String** — führende Nullen)
2. lokales Food per Barcode-Index finden (`findByBarcode`)
3. kein Treffer → "Lebensmittel erstellen" mit vorausgefülltem Barcode

## 2. Kamera-Scan — Entscheidung

- Browser-API `BarcodeDetector` nur, wo vorhanden (Chrome/Android; Safari iOS erst
  ab neueren Versionen bzw. hinter Flags) → Feature-Detection über
  `BarcodeService.isSupported()` (Master-Prompt §64).
- Keine Scanner-Bibliothek im MVP installieren. OpenNutriTracker (mobile_scanner) und
  Waistline (Cordova-Plugin) zeigen: der Scan liefert nur einen String — die gesamte
  restliche Pipeline ist identisch mit der manuellen Eingabe. Genau so bauen.

## 3. Open Food Facts — Entscheidung (Phase 5+, optional)

OpenNutriTrackers OFF-Mapping ist die Referenz (`off_product_nutriments_dto.dart`):
- relevante Felder: `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`,
  `fat_100g`, `sugars_100g`, `fiber_100g`, `salt_100g`, `product_name`, `brands`,
  `serving_quantity`
- Einheiten normalisieren (g/ml), fehlende Werte explizit behandeln —
  **nie blind übernehmen**, vor dem Speichern Vorschau zeigen (§65)
- Nach Erfolg als lokales FoodItem mit `source: "openFoodFacts"` speichern —
  danach vollständig offline nutzbar.

nutritrace bestätigt dasselbe Muster kompakt in Svelte (`src/lib/api.js`).

## Punktetabelle Barcode

| Quelle | Fallback-Kette | OFF-Mapping | Portierbarkeit des Musters |
|---|---:|---:|---:|
| OpenNutriTracker | **5** | **5** | 4 |
| Waistline | 4 | 4 | 2 |
| nutritrace | 4 | 4 | 3 |
| Food You | 4 | 4 | 2 |
| SparkyFitness | 3 | 4 | 3 |
