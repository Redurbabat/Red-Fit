# Native iPhone-Migration – 15.11.2026

Der Eigentümer hat den SwiftUI-Plan ausdrücklich zur Umsetzung freigegeben. Diese Entscheidung ersetzt die frühere Beschränkung auf React-Oberflächen, nicht die lokale Fachlogik oder den Datenschutz. Das neue, vom Eigentümer gelieferte Gorilla-Bild ersetzt die Bordeaux-/Elfenbein-Marke. Originalquelle: `frontend/resources/red-fit-gorilla-original.jpg`.

| Bestand | Entscheidung | Schutz |
| --- | --- | --- |
| Trainingsstore, Import-IDs, native Dateispiegel | KEEP | dieselbe Capacitor-Laufzeit, geordnete Aktionen und bestätigte Dateischreibvorgänge |
| Workout-Satzaktionen, Supersatz-/Unilateral-/Timerregeln | KEEP | native Eingabe ruft dieselben gebundenen Aktionen wie die bestehende Workout-Ansicht auf |
| Übungsmedien und Qualitätsregeln | KEEP | keine Löschung, nur lokale Quellen; native Medienansicht |
| iPhone-Navigation und Hauptansichten | REWORK | SwiftUI, Systemglas, bestehende Funktionen weiterhin erreichbar |
| Ernährungsdatenbanken und ehemalige Kontonamensräume | KEEP | additive Erweiterungen, getrennte Sicherung |
| Prozedurale 3D-Bewegungen | REWORK | bestehende Posen als reproduzierbare RealityKit-Ressource |
| Root-PWA und Originalansichten | KEEP | Referenz und Kompatibilitätsansichten bis zur geprüften Parität |
| Bestehende Experimente | ARCHIVE-CANDIDATE | keine Löschungen in diesem Auftrag |

Die alte Installation `ch.opengym.app` wird nicht verändert. Die neue Identität bleibt `ch.redurbabat.redfit`. Datenübernahme ist eine explizite Dateiaktion mit Vorschau und Zusammenführung. Nutzerdaten, Signierungsdaten und unverschlüsselte IPAs bleiben lokal.

## Tatsächlich implementierter Zwischenstand

SwiftUI-Hauptnavigation und Ansichten für Heute, Trainingspläne, Satzbearbeitung, Verlauf, Übungssuche/-medien, Ernährung, Körper und lokale Sicherung verwenden eine einzige eingebettete Capacitor-Laufzeit. Die versionierte Brücke serialisiert Aktionen und bestätigt native Dateischreibvorgänge. Die Trainingsansicht ruft die bestehenden React-Satzaktionen auf. Native RealityKit-Posen werden aus dem vorhandenen prozeduralen Modell erzeugt; nicht zugeordnete Übungen behalten ihre Medien.

Ernährung erweitert die bestehenden lokalen Daten additiv um Wasser, Ziele und manuelle Einkaufspositionen. Lebensmittel, Mahlzeiten, Rezepte, Gekocht-Umrechnung und Wochenplanung sind nativ erreichbar. Ein Import zeigt zuerst eine Vorschau, sichert den vorhandenen Stand und führt zusammen.

Dies ist noch keine nachgewiesene vollständige native Funktionsparität: erweiterte Satzvorgaben, Supersätze, Programme, sämtliche Einstellungen und Medien-ZIP-Sicherungen bleiben über die ursprünglichen Werkzeuge erreichbar. Native Texte sind derzeit deutsch; vollständige Übernahme der Sprachwahl, Accessibility-/Abbruchprüfung aller Wege, echte Geräteleistung und signierter iPhone-Test stehen aus. Es liegen keine Messreihen für Startzeit, Speicher oder Bildrate vor.

Der schwarze Außenrahmen des neuen Logos wurde auf ausdrücklichen Wunsch entfernt. `resources/red-fit-gorilla-original.jpg` bleibt als unveränderte Quelle erhalten; `red-fit-gorilla-borderless.png` ist die bearbeitete quadratische Vorlage, `red-fit-master.png` der opake 1024-Pixel-Master. App-, Watch-, Web- und Alternativsymbole werden daraus erzeugt.
