# Calories-In — Audit

## Identität
- Original: https://github.com/vangelov/calories-in · Lizenz: **MIT**
- Kategorie: Nutrition/Planung · Stack: **React + TypeScript** (163 tsx / 146 ts), CRA, Chakra

## Relevante RED-Fit-Bereiche
Meal Plan ✅✅ · Nutrition ✅ · Backup (Datei-Export/Import) ✅

## Kernerkenntnisse für RED Fit
1. **Technisch am nächsten an RED Fit**: reines React+TS-Frontend ohne Backend,
   Pläne als lokale Dateien.
2. `stats/calculations/`: saubere reine Funktionen — `aggregateStats` (Summen über
   Zutaten→Mahlzeit→Tag), `getMacrosPercents` + `roundMacrosPercents`
   (Prozent-Rundung, die sich auf 100 % summiert!), `getEnergiesEstimates`.
   Direkt portierbar für RED Fits `calculateMealTotals`/`calculateDailyNutrition`.
3. `persistence/`: Datei-Download über Blob-URL, Import mit Fehlerbehandlung
   (`useImportFileError`) — Vorbild für Backup-Export/Import-UX.
4. Undo/Redo im Plan-Editor (`undoRedo/`) — für später notiert.

## Ballast
Chakra-UI-Bindung, PDF-Export, CRA-Konfiguration.

## Bewertung (0–5)
Relevanz 4 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 3 · Offline 3 · Tests 2 ·
geringe Abhängigkeitslast 3 · Portierbarkeit 5

## Entscheidung: **PARTIAL**
Kein Code-Extrakt (RED Fit bleibt eigenständig). Rundungs- und Export-Muster dokumentiert
in REPORT-NUTRITION.md und REPORT-STORAGE.md.
