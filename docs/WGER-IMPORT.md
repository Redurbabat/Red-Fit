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

## Jetzt direkt in der App verfügbar

Der exakt aus den geprüften wger-Fixtures erzeugte Katalog ist jetzt unter
`public/data/wger-verified-789.json` enthalten (SHA-256
`5e9b9736afce37d62aaf15a1f3de8cf54ce0b725f5a404ba446192fd03966599`).
Er wird in der PWA offline precached und in Capacitor/Tauri als lokale
statische Datei paketiert; kein wger-API-Aufruf ist erforderlich.

1. RED Fit öffnen → **Training → Übungen → wger-Katalog**.
2. **Mitgelieferten Katalog ansehen (789)** wählen; dies öffnet nur die
   Vorschau und verändert keine Datenbank.
3. Urheber- und Lizenzangaben und die Hinweise zu unbestimmten Muskelgruppen
   prüfen.
4. Erst mit **Übungen importieren** die lokale Übernahme bestätigen.

Alternativ kann im selben Dialog weiterhin eine eigene attribuierte
`wger-red-fit-import.json` ausgewählt werden.

Der Vorgang ist eine Dexie-Transaktion: vorhandene Übungen bleiben erhalten,
bereits importierte Quellenkennungen werden übersprungen. Die Namens- und
Attributionsdaten bleiben auch nach der lokalen Speicherung verfügbar.

**Wichtig:** Creative-Commons-Bedingungen gelten pro Übung. Aufbewahrung
und Weitergabe der Datensätze müssen die individuelle Autorenangabe, Lizenz
und Kennzeichnung der Konvertierung erhalten. Siehe
[Attribution und Lizenzen](WGER-CATALOG-ATTRIBUTION.md).

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
