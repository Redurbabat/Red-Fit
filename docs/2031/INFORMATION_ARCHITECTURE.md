# RED Fit 2031 — Informationsarchitektur

## Hauptnavigation (seit Phase A umgesetzt)

Exakt fünf primäre Einträge (Bottom Navigation, Touch ≥ 44 px, Text + Icon):

1. **Heute** `/today` — Readiness · Training · Ernährung · Körper · Coach
2. **Training** `/training` — Pläne, Übungen, Workout-Modus, Historie
3. **Ernährung** `/nutrition` — Tagebuch, Foods, Scan, Essensplan
4. **Körper** `/body` — Readiness/Recovery, Gewicht, Maße, Verweis auf Trainings-Fortschritt
5. **Mehr** `/more` — Werkzeuge, Daten, System

„Fortschritt" ist als eigener Tab entfallen und in **Körper** integriert;
die Trainings-Analytics-Seite `/progress` bleibt bestehen und ist über
Körper → „Trainings-Fortschritt" erreichbar (langfristig wandert sie unter
Training → Analytics).

## Routen-Kompatibilität

| Alte Route | Verhalten |
|---|---|
| `/progress` | bleibt (Trainings-Fortschritt) |
| `/progress/body` | Redirect → `/body/measurements` |
| alle übrigen | unverändert |

Unbekannte Routen fallen weiter auf `/today` zurück.

## Globales Quick Log (Phase A)

Floating Action Button „+" auf allen Tab-Seiten (nicht im Workout-Modus,
nicht im Onboarding). Öffnet ein Bottom Sheet mit kontextabhängiger Priorität:

| Kontext | Reihenfolge |
|---|---|
| Ernährung | Mahlzeit · Wasser · Lebensmittel · Training · Gewicht · Recovery |
| Training/Fortschritt | Training · Mahlzeit · Wasser · Gewicht · Recovery · Lebensmittel |
| Körper | Gewicht · Recovery · Wasser · Mahlzeit · Training · Lebensmittel |
| sonst | Training · Mahlzeit · Wasser · Gewicht · Recovery · Lebensmittel |

Wasser (+250 ml) speichert direkt; Gewicht und Recovery öffnen ein Sheet;
alles andere navigiert in den passenden Flow.

## Heute-Seite — Priorisierung (Phase A)

Reihenfolge: Begrüßung/Datum → laufendes Training (falls aktiv) → Readiness →
heutiges Training → Ernährung (Makros, Wasser) → Körper (Gewicht) →
Streak/Wochenstatistik → **Coach** (max. 2 deterministische Insights) →
Schnellaktionen. Keine 20 Karten.

## Mehr-Seite

Bleibt kompakte Werkzeugliste; „Körperwerte" verweist jetzt auf
`/body/measurements`. Zielstruktur (spätere Phase): Gruppen „Deine Werkzeuge" /
„Daten" / „System" + Speicher & Diagnose.
