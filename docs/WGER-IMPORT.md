# wger → RED Fit Übungsbibliothek

## Ergebnis der geprüften wger-master.zip

- 872 Übungs-Grunddatensätze
- 789 Einträge mit Übungsname, Autorenangabe und gültigem Lizenzverweis im RED-Fit-Importformat
- 83 Einträge ohne ausreichend angegebene Übungsautoren werden nicht automatisch konvertiert
- Deutsche Übersetzungen bevorzugt, sonst englischer Name
- Keine Bilder, Animationen, Beschreibung mit HTML oder fremde APIs im RED-Fit-Bundle
- **120 Übungen ohne explizite primäre Muskelangabe** erhalten `taxonomyNeedsReview: true`.
  Davon haben 16 nur die unbestimmte Quellkategorie „Arme“. Sie werden
  bewusst nicht mehr automatisch dem Bizeps zugeordnet.
- 14 Übungen verwenden in der Quelle die Gymnastikmatte (Equipment-ID 4).
  Diese wird korrekt als `other` statt als `none` klassifiziert.
- Der Hinweis „Muskelzuordnung prüfen“ erscheint in der Bibliothek und im
  Übungsdetail. Durch manuelles Bearbeiten und Speichern wird die Zuordnung als
  geprüft markiert.
- Pro Übung: Quellenkennung `wger:<id>`, Urheber und Lizenz im lokalen Datensatz

Die Datensätze verwenden verschiedene Creative-Commons-Lizenzen (CC-BY-SA 3,
CC-BY-SA 4, CC0). Ihre jeweiligen Bedingungen gelten unabhängig davon,
ob das RED-Fit-Repository privat bleibt. Die Konvertierung ändert weder
Urheberangaben noch die ursprüngliche Lizenz. Weitergabe abgeleiteter
Datensätze muss auf die jeweiligen Creative-Commons-Bedingungen geprüft werden.

## Konvertierung aus dem Quellarchiv

```bash
python tools/import-source-archives.py \
  ../openGym-main.zip ../wger-master.zip ../dietry-main.zip \
  --out sources/reference

python tools/convert-wger-fixtures.py \
  sources/reference/wger-master \
  --out wger-red-fit-import.json
```

Diese Befehle übernehmen ausdrücklich NICHT die gesondert lizenzierten
Gym-visual-Animationsdateien von openGym.

## In der App

1. RED Fit öffnen → **Training → Übungen**.
2. **wger-JSON importieren** wählen.
3. `wger-red-fit-import.json` auswählen.
4. Vorschau mit Urhebern und Lizenzen kontrollieren.
5. **Übungen importieren** bestätigen.

Der Vorgang ist eine Dexie-Transaktion: vorhandene Übungen bleiben erhalten,
bereits importierte Quellenkennungen werden übersprungen. Die Namens- und
Attributionsdaten bleiben auch nach der lokalen Speicherung verfügbar.

## JSON-Vertrag

```json
[
  {
    "sourceId": 9,
    "name": "2 Handed Kettlebell Swing",
    "categoryId": 10,
    "muscleIds": [],
    "secondaryMuscleIds": [],
    "equipmentIds": [10],
    "sourceLicense": "CC-BY-SA 4 (https://creativecommons.org/licenses/by-sa/4.0/deed.en)",
    "sourceAuthor": "deusinvictus"
  }
]
```

Technische Grenze: JSON kleiner als 5 MB, maximal 3.000 Einträge und
ausdrücklich erforderliche Urheber-/Lizenzangaben. Keine Bilder oder unvalidierten
Zusatzfelder werden importiert. Die Namen dienen als lokaler Text; einzelne
Übungsbeschreibungen oder Medien erfordern gesonderte Prüfung.
