# OpenNutriTracker — Audit

## Identität
- Original: https://github.com/simonoppowa/OpenNutriTracker · Lizenz: **GPL-3.0**
- Kategorie: Nutrition · Stack: Flutter/Dart (556 Dateien), Hive (lokale DB), Clean Architecture

## Relevante RED-Fit-Bereiche
Nutrition ✅✅ · Barcode ✅✅ · Rezepte ✅ · Backup (Export/Import) ✅

## Architektur
Feature-first Clean Architecture: `features/<name>/{presentation,domain,data}` mit
Entities, UseCases, DTOs. Lokale Persistenz komplett offline (Hive), OFF/FDC nur als
optionale Online-Quellen.

## Kernerkenntnisse für RED Fit
1. **100-g-Modell konsequent**: `MealNutrimentsEntity` speichert alles per 100 g/ml,
   Portionsberechnung ist reine Ableitung. Genau RED Fits Regel "nie Portionswerte als
   Source of Truth".
2. **Open-Food-Facts-Mapping** (`off_product_nutriments_dto.dart` → Entity): welche
   OFF-Felder brauchbar sind, Einheiten-Normalisierung (`_normalizeOffUnit`), Umgang mit
   fehlenden Werten. Erspart RED Fit in Phase 5/14 viel Trial-and-Error.
3. **Barcode-Flow mit Fallback**: `mobile_scanner` + Suche + manuelles Anlegen; Scanner
   ist nie Pflicht. Entspricht RED Fits Regel 126.10.
4. Export/Import über Settings-Bloc (Backup als Datei) vorhanden.

## Ballast
Flutter-Plattformordner, Fonts (21 ttf), Fastlane, Firebase-Anbindung (optional).

## Bewertung (0–5)
Relevanz 5 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 4 · Offline 4 · Tests 3 ·
geringe Abhängigkeitslast 3 · Portierbarkeit 3 (Konzepte; Dart-Code selbst nicht)

## Entscheidung: **KEEP**
Kein Code-Extrakt. Feldlisten und OFF-Mapping dokumentiert in REPORT-NUTRITION.md und
REPORT-BARCODE.md. **GPL → ausschließlich Konzepte übernehmen, Code neu schreiben.**
